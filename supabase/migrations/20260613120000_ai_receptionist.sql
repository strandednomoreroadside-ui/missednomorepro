-- ════════════════════════════════════════════════════════════════
-- M7: AI receptionist — agent provisioning, call AI metadata, the
-- AI's follow-up tasks, and a call-scoped log of every tool the AI ran.
-- Master plan Phase 6 (Tickets 30–35), §8.2 (schema), §9 (security),
-- §10 (tool contracts).
--
-- Design notes:
--   * Builds on M6's phone foundation. Same tenancy pattern throughout:
--     tenant_id + RLS, composite (id, tenant_id) FKs so a leaked UUID
--     can't cross tenants, explicit grants (the M2 lesson).
--   * The AI writes through the SERVER (service role / definer), never
--     as a tenant member: tool_calls + the AI's call rows are server-
--     written. follow_up_tasks is the one new table members also manage
--     (it's their to-do list — they tick items done in the dashboard).
--   * agents gains the provider-side ids + a prompt_hash so the Retell
--     agent is re-synced lazily only when the tenant's wizard data
--     actually changed (no fragile "sync on every edit" wiring).
--   * No price/quote or booking columns here on purpose — calculate_quote
--     is Phase 9, book_appointment is Phase 8. Scope discipline.
-- ════════════════════════════════════════════════════════════════

-- ── agents: provider binding + lazy-sync bookkeeping ───────────
-- One Retell agent per tenant's receptionist. We store the provider
-- ids and a hash of the built prompt; when the hash drifts we update
-- the provider agent before the next call.
alter table public.agents
  add column business_id       uuid,
  add column provider_agent_id text,
  add column provider_llm_id   text,
  add column prompt_hash       text,
  add column max_call_seconds  integer not null default 600
    check (max_call_seconds between 60 and 1800),
  add column last_synced_at    timestamptz;

-- Tie an agent to its business (one business per tenant in the MVP, but
-- model it properly). Composite FK enforces same-tenant.
alter table public.agents
  add constraint agents_business_fk
    foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade;

-- Let other tables reference an agent with a tenant-checked composite FK.
alter table public.agents
  add constraint agents_id_tenant_key unique (id, tenant_id);

create index agents_business_idx on public.agents (business_id);

-- ── calls: correlate Twilio <-> provider, mark AI-handled ──────
-- For an AI call, provider_call_id holds the Retell call id while
-- twilio_call_sid keeps Twilio's CallSid so the two legs reconcile.
alter table public.calls
  add column business_id     uuid,
  add column twilio_call_sid text,
  add column agent_id        uuid,
  add column ai_handled      boolean not null default false,
  add constraint calls_business_fk
    foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null,
  add constraint calls_agent_fk
    foreign key (agent_id, tenant_id)
    references public.agents (id, tenant_id) on delete set null;

create index calls_twilio_sid_idx on public.calls (twilio_call_sid);

-- ── follow_up_tasks ────────────────────────────────────────────
-- The AI's "have a human handle this" list. A price question creates a
-- 'quote_request' here (the AI never quotes); a missing-info or "call
-- me back" creates a 'callback'. Members read AND update (tick done).
create table public.follow_up_tasks (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid,
  contact_id  uuid,
  call_id     uuid,
  type        text not null default 'general'
              check (type in ('callback', 'quote_request', 'escalation', 'general')),
  title       text not null check (char_length(title) between 1 and 200),
  details     text,
  priority    text not null default 'normal'
              check (priority in ('low', 'normal', 'high', 'urgent')),
  status      text not null default 'open'
              check (status in ('open', 'done', 'dismissed')),
  source      text not null default 'ai'
              check (source in ('ai', 'system', 'manual')),
  due_at      timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null,
  foreign key (call_id, tenant_id)
    references public.calls (id, tenant_id) on delete set null
);

create index follow_up_tasks_tenant_status_idx
  on public.follow_up_tasks (tenant_id, status, created_at desc);
create index follow_up_tasks_contact_idx on public.follow_up_tasks (contact_id);
create index follow_up_tasks_call_idx on public.follow_up_tasks (call_id);

create trigger follow_up_tasks_updated_at
  before update on public.follow_up_tasks
  for each row execute function app.set_updated_at();

-- ── tool_calls ─────────────────────────────────────────────────
-- Every §10 tool the AI invokes on a call, server-written, for the
-- "AI actions" panel in the call summary and for debugging/audit. The
-- audit_logs table still gets the durable security record; this is the
-- call-scoped, human-readable trail.
create table public.tool_calls (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.organizations (id) on delete cascade,
  call_id    uuid not null,
  tool_name  text not null,
  args       jsonb not null default '{}'::jsonb,
  status     text not null default 'ok'
             check (status in ('ok', 'error', 'blocked')),
  result     jsonb not null default '{}'::jsonb,
  error      text,
  created_at timestamptz not null default now(),
  foreign key (call_id, tenant_id)
    references public.calls (id, tenant_id) on delete cascade
);

create index tool_calls_call_idx on public.tool_calls (call_id, created_at);
create index tool_calls_tenant_idx on public.tool_calls (tenant_id);

-- ── Row Level Security ─────────────────────────────────────────

alter table public.follow_up_tasks enable row level security;
alter table public.tool_calls enable row level security;

-- follow_up_tasks: members fully manage their tenant's tasks (they work
-- the list in the dashboard). AI/system inserts come via service role.
create policy "members manage their follow up tasks"
  on public.follow_up_tasks for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- tool_calls: members read only — this is a record of what the AI did,
-- never something a client edits. All writes are server-side.
create policy "members read their tool calls"
  on public.tool_calls for select to authenticated
  using (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────

grant select, insert, update, delete
  on public.follow_up_tasks, public.tool_calls
  to service_role;

grant select, insert, update, delete
  on public.follow_up_tasks
  to authenticated;

grant select on public.tool_calls to authenticated;
