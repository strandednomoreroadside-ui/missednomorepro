-- ════════════════════════════════════════════════════════════════
-- M6: Phone foundation — phone_numbers, agents, calls, transcripts.
-- Master plan Tickets 28–29, §8.2 (schema), §9 (security).
--
-- Design notes:
--   * Same tenancy pattern as M2/M4/M5: tenant_id + RLS, composite
--     FKs, explicit grants.
--   * These tables are written by the SERVER (Twilio webhooks via the
--     service role, platform admin) — members read their own rows but
--     never write them. A tenant can't invent calls or claim numbers.
--   * phone_number is globally unique: one E.164 number resolves to
--     exactly one tenant, which is how the inbound webhook routes.
--   * agents is created now per §8.2; the AI config that fills it
--     arrives at M7 (Retell adapter + prompt builder).
-- ════════════════════════════════════════════════════════════════

-- ── Tables ─────────────────────────────────────────────────────

create table public.phone_numbers (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.organizations (id) on delete cascade,
  business_id       uuid,
  twilio_sid        text unique,
  phone_number      text not null unique check (phone_number ~ '^\+1[0-9]{10}$'),
  type              text not null default 'local' check (type in ('local', 'tollfree')),
  forwarding_status text,
  a2p_status        text not null default 'approved',
  voice_enabled     boolean not null default true,
  sms_enabled       boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null
);

create index phone_numbers_tenant_idx on public.phone_numbers (tenant_id);

create table public.agents (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.organizations (id) on delete cascade,
  name                  text not null default 'Receptionist',
  voice_provider        text check (voice_provider in ('openai', 'retell', 'vapi')),
  voice_id              text,
  personality           text,
  language_settings     jsonb not null default '{"language": "en-US"}'::jsonb,
  system_prompt_version integer not null default 1,
  status                text not null default 'draft'
                        check (status in ('draft', 'active', 'disabled')),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz
);

create index agents_tenant_idx on public.agents (tenant_id);

create table public.calls (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.organizations (id) on delete cascade,
  contact_id        uuid,
  provider          text not null default 'twilio',
  provider_call_id  text not null unique,
  direction         text not null default 'inbound'
                    check (direction in ('inbound', 'outbound')),
  from_number       text,
  to_number         text,
  started_at        timestamptz not null default now(),
  ended_at          timestamptz,
  duration_seconds  integer,
  status            text not null default 'in-progress',
  disposition       text,
  recording_url     text,
  transcript_status text not null default 'none',
  cost_estimate     numeric,
  plan_minutes_used numeric,
  created_at        timestamptz not null default now(),
  unique (id, tenant_id),
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

create index calls_tenant_time_idx on public.calls (tenant_id, started_at desc);

create table public.call_transcripts (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.organizations (id) on delete cascade,
  call_id            uuid not null,
  redacted_text      text,
  raw_text_encrypted text,
  summary            text,
  sentiment          text,
  action_items       jsonb not null default '[]'::jsonb,
  pii_redacted       boolean not null default false,
  created_at         timestamptz not null default now(),
  foreign key (call_id, tenant_id)
    references public.calls (id, tenant_id) on delete cascade
);

create index call_transcripts_call_idx on public.call_transcripts (call_id);
create index call_transcripts_tenant_idx on public.call_transcripts (tenant_id);

-- ── updated_at triggers ────────────────────────────────────────

create trigger phone_numbers_updated_at
  before update on public.phone_numbers
  for each row execute function app.set_updated_at();

create trigger agents_updated_at
  before update on public.agents
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────

alter table public.phone_numbers enable row level security;
alter table public.agents enable row level security;
alter table public.calls enable row level security;
alter table public.call_transcripts enable row level security;

-- Members read their tenant's rows. All writes come from the server
-- (Twilio webhooks + platform admin via service role) — no client
-- write policies on purpose.
create policy "members read their phone numbers"
  on public.phone_numbers for select to authenticated
  using (app.is_member(tenant_id));

create policy "members read their agents"
  on public.agents for select to authenticated
  using (app.is_member(tenant_id));

create policy "members read their calls"
  on public.calls for select to authenticated
  using (app.is_member(tenant_id));

create policy "members read their call transcripts"
  on public.call_transcripts for select to authenticated
  using (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────

grant select, insert, update, delete
  on public.phone_numbers, public.agents, public.calls,
     public.call_transcripts
  to service_role;

grant select
  on public.phone_numbers, public.agents, public.calls,
     public.call_transcripts
  to authenticated;
