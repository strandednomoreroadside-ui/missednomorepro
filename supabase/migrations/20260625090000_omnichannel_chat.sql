-- ════════════════════════════════════════════════════════════════
-- Phase 10: Omnichannel AI Chat — one AI brain across website chat +
-- two-way SMS, with a unified inbox. Reuses the §10 tool brain
-- (src/lib/voice/tools). Gated by the omnichannel_chat add-on
-- (tenant_addons). Master plan §8/§9 (encrypted + redacted bodies),
-- §5.1 (same AI guardrails as voice).
--
-- Design notes (same tenancy pattern as M5–M9):
--   * tenant_id + RLS on every table, composite FKs, explicit grants.
--   * conversations + conversation_messages are SERVER-written (the chat
--     engine + Twilio webhook via the service role). Members READ, may
--     UPDATE a conversation (take over / close / reassign), and may INSERT
--     a 'staff' reply — but cannot forge AI/customer messages.
--   * Anonymous website visitors NEVER touch these tables directly. The
--     public widget endpoint (/api/chat/web) uses the service role and
--     resolves the tenant from a per-business widget_key — exactly like
--     /api/voice/tools resolves tenant server-side, never from the client.
--   * Message bodies are encrypted at rest (body_encrypted) with a redacted
--     display copy (body_redacted), like call transcripts + SMS (§9).
--   * Chat timeline events are written by trigger (like M5/M8) so a
--     contact's history stays complete and tamper-proof.
-- ════════════════════════════════════════════════════════════════

-- ── conversations — one thread per customer per channel ────────
create table public.conversations (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.organizations (id) on delete cascade,
  business_id          uuid,
  contact_id           uuid,
  channel              text not null check (channel in ('web', 'sms')),
  status               text not null default 'open' check (status in ('open', 'closed')),
  -- Per-conversation AI switch so staff can "take over" a thread.
  ai_enabled           boolean not null default true,
  customer_name        text,
  customer_phone       text,
  -- Anonymous browser id for web chat (the widget generates + stores it).
  web_visitor_id       text,
  assigned_to          uuid,
  last_message_at      timestamptz not null default now(),
  last_message_preview text,
  -- Unread inbound messages for the inbox badge (reset when staff opens it).
  unread_count         integer not null default 0,
  created_at           timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

create index conversations_tenant_time_idx
  on public.conversations (tenant_id, last_message_at desc);
create index conversations_contact_idx on public.conversations (contact_id);
-- Dedup OPEN threads so inbound traffic appends to one thread: one open SMS
-- thread per (tenant, phone); one open web thread per (tenant, visitor).
-- Partial so a closed thread never blocks a new one.
create unique index conversations_open_sms_idx
  on public.conversations (tenant_id, customer_phone)
  where channel = 'sms' and status = 'open';
create unique index conversations_open_web_idx
  on public.conversations (tenant_id, web_visitor_id)
  where channel = 'web' and status = 'open';

-- ── conversation_messages — the thread itself ──────────────────
create table public.conversation_messages (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  conversation_id uuid not null,
  role            text not null check (role in ('customer', 'ai', 'staff', 'system')),
  body_redacted   text,
  body_encrypted  text,
  -- Staff user who sent a 'staff' reply (for the inbox audit).
  author_id       uuid,
  created_at      timestamptz not null default now(),
  foreign key (conversation_id, tenant_id)
    references public.conversations (id, tenant_id) on delete cascade
);

create index conversation_messages_convo_idx
  on public.conversation_messages (conversation_id, created_at);
create index conversation_messages_tenant_idx on public.conversation_messages (tenant_id);

-- ── chat settings (on sms_settings, one row per business) ──────
alter table public.sms_settings
  add column web_chat_enabled       boolean not null default false,
  add column web_greeting           text not null default 'Hi! How can we help you today?',
  add column widget_accent          text not null default '#00E5FF',
  add column two_way_sms_ai_enabled boolean not null default false,
  -- The only public credential the embeddable widget carries. Random,
  -- per-business, rotatable. Backfilled for existing businesses below.
  add column widget_key             text unique;

-- Backfill a widget key for every existing business's settings row.
update public.sms_settings
  set widget_key = replace(gen_random_uuid()::text, '-', '')
  where widget_key is null;

-- ── tool_calls: allow chat-originated tool calls (no call row) ──
-- Voice still passes call_id; chat passes conversation_id instead.
alter table public.tool_calls alter column call_id drop not null;
alter table public.tool_calls add column conversation_id uuid;
alter table public.tool_calls
  add constraint tool_calls_conversation_fk
  foreign key (conversation_id, tenant_id)
    references public.conversations (id, tenant_id) on delete cascade;

-- ── Chat timeline events (trigger-written, like M5/M8) ─────────
create or replace function app.timeline_conversation_message()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  v_contact_id uuid;
  v_channel    text;
begin
  -- Only customer/staff turns are worth a timeline note (skip system).
  if new.role not in ('customer', 'ai', 'staff') then
    return null;
  end if;
  select contact_id, channel into v_contact_id, v_channel
    from public.conversations where id = new.conversation_id;
  if v_contact_id is not null then
    insert into public.customer_timeline_events
      (tenant_id, contact_id, event_type, source_id, summary, metadata)
    values (
      new.tenant_id, v_contact_id, 'chat', new.id::text,
      (case
         when new.role = 'customer' then 'Chat received'
         when new.role = 'ai' then 'AI replied'
         else 'Reply sent'
       end)
        || coalesce(': ' || left(new.body_redacted, 120), ''),
      jsonb_build_object('role', new.role, 'channel', v_channel)
    );
  end if;
  return null;
end;
$$;

create trigger conversation_messages_timeline
  after insert on public.conversation_messages
  for each row execute function app.timeline_conversation_message();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.conversations enable row level security;
alter table public.conversation_messages enable row level security;

-- Members read their tenant's conversations + may take over / close /
-- reassign (update). Inserts/deletes come from the server (service role).
create policy "members read their conversations"
  on public.conversations for select to authenticated
  using (app.is_member(tenant_id));
create policy "members update their conversations"
  on public.conversations for update to authenticated
  using (app.is_member(tenant_id))
  with check (app.is_member(tenant_id));

-- Members read their tenant's messages, and may post a 'staff' reply into
-- their own tenant's thread (the inbox composer). AI/customer/system rows
-- are server-written only — a client can't forge them.
create policy "members read their conversation messages"
  on public.conversation_messages for select to authenticated
  using (app.is_member(tenant_id));
create policy "members send staff messages"
  on public.conversation_messages for insert to authenticated
  with check (app.is_member(tenant_id) and role = 'staff');

-- ── Table-level grants (explicit, per the M2 lesson) ───────────
grant select, insert, update, delete
  on public.conversations, public.conversation_messages
  to service_role;

grant select, update on public.conversations to authenticated;
grant select, insert on public.conversation_messages to authenticated;
