-- ════════════════════════════════════════════════════════════════
-- M8: SMS system & compliance — messages, suppression list (STOP),
-- missed-call text-back settings. Master plan Phase 7 (Tickets 36–37),
-- §8.2 (messages schema), §5.8 + §9 (consent/compliance, encryption).
--
-- Design notes:
--   * Same tenancy pattern as M5–M7: tenant_id + RLS, composite FKs,
--     explicit grants. messages + sms_suppressions are SERVER-written
--     (Twilio webhooks, the gated sender) — members read only, so a
--     client can't forge a "sent" record or quietly un-suppress a STOP.
--   * §9: message bodies are encrypted at rest (body_encrypted) with a
--     redacted display copy (body_redacted) — same as call transcripts.
--   * Suppression list is the compliance backstop: a STOP adds a row
--     here and the sender hard-blocks every future send to that number,
--     regardless of any per-contact consent flag.
--   * SMS timeline events are written by trigger (like M5's call/note
--     events) so a contact's history stays complete and tamper-proof.
-- ════════════════════════════════════════════════════════════════

-- ── messages (§8.2) ────────────────────────────────────────────
create table public.messages (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.organizations (id) on delete cascade,
  business_id         uuid,
  contact_id          uuid,
  provider            text not null default 'twilio',
  provider_message_id text,
  direction           text not null check (direction in ('inbound', 'outbound')),
  from_number         text,
  to_number           text,
  body_redacted       text,
  body_encrypted      text,
  status              text not null default 'queued'
                      check (status in ('queued', 'sent', 'delivered', 'undelivered',
                                        'failed', 'received', 'blocked')),
  -- why the message exists, for the log + analytics
  kind                text not null default 'manual'
                      check (kind in ('text_back', 'staff_alert', 'confirmation', 'reply',
                                      'help', 'optout_ack', 'optin_ack', 'manual', 'campaign')),
  consent_checked     boolean not null default false,
  error               text,
  created_at          timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

create index messages_tenant_time_idx on public.messages (tenant_id, created_at desc);
create index messages_contact_idx on public.messages (contact_id);
-- Idempotency: one row per provider message id (inbound webhook retries,
-- delivery-status callbacks). Partial so many outbound rows can be null
-- briefly before their Sid lands.
create unique index messages_provider_id_key
  on public.messages (provider_message_id) where provider_message_id is not null;

-- ── sms_suppressions — the tenant-wide STOP list ───────────────
create table public.sms_suppressions (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.organizations (id) on delete cascade,
  phone      text not null check (phone ~ '^\+1[0-9]{10}$'),
  reason     text not null default 'stop' check (reason in ('stop', 'manual')),
  created_at timestamptz not null default now(),
  unique (tenant_id, phone)
);

create index sms_suppressions_tenant_idx on public.sms_suppressions (tenant_id);

-- ── sms_settings: missed-call text-back ────────────────────────
alter table public.sms_settings
  add column text_back_enabled  boolean not null default true,
  add column text_back_template text not null default
    'Hi! Thanks for calling {business}. Sorry we missed you — text us back here and we''ll help right away. Reply STOP to opt out.';

-- ── SMS timeline events (trigger-written, like M5) ─────────────
create or replace function app.timeline_message()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.contact_id is not null then
    insert into public.customer_timeline_events
      (tenant_id, contact_id, event_type, source_id, summary, metadata)
    values (
      new.tenant_id, new.contact_id, 'sms', new.id::text,
      (case when new.direction = 'inbound' then 'Text received' else 'Text sent' end)
        || coalesce(': ' || left(new.body_redacted, 120), ''),
      jsonb_build_object('direction', new.direction, 'status', new.status, 'kind', new.kind)
    );
  end if;
  return null;
end;
$$;

create trigger messages_timeline
  after insert on public.messages
  for each row execute function app.timeline_message();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.messages enable row level security;
alter table public.sms_suppressions enable row level security;

-- Members read their tenant's messages + suppressions. All writes come
-- from the server (Twilio webhooks + the gated sender via service role).
create policy "members read their messages"
  on public.messages for select to authenticated
  using (app.is_member(tenant_id));

create policy "members read their suppressions"
  on public.sms_suppressions for select to authenticated
  using (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────
grant select, insert, update, delete
  on public.messages, public.sms_suppressions
  to service_role;

grant select on public.messages to authenticated;
grant select on public.sms_suppressions to authenticated;
