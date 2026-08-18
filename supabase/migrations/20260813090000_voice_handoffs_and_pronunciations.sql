-- Reliable human handoffs are server-owned Twilio state, rather than a
-- best-effort LLM/provider transfer.  The destination is deliberately not
-- copied here: it remains in businesses.transfer_number / staff_contacts.

create table public.voice_handoffs (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.organizations (id) on delete cascade,
  business_id        uuid not null,
  source_call_id     uuid not null,
  mode               text not null check (mode in ('normal', 'emergency')),
  summary            text not null check (char_length(summary) between 1 and 600),
  conference_name    text not null unique,
  recipient_call_sid text,
  outcome            text not null default 'starting'
                     check (outcome in (
                       'starting', 'holding', 'ringing', 'awaiting_acceptance',
                       'bridged', 'declined', 'busy', 'no_answer', 'failed',
                       'cancelled', 'caller_left'
                     )),
  error_code         text,
  holding_at         timestamptz,
  ringing_at         timestamptz,
  accepted_at        timestamptz,
  bridged_at         timestamptz,
  ended_at           timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (source_call_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (source_call_id, tenant_id)
    references public.calls (id, tenant_id) on delete cascade
);

create index voice_handoffs_tenant_time_idx
  on public.voice_handoffs (tenant_id, created_at desc);
create index voice_handoffs_source_call_idx
  on public.voice_handoffs (source_call_id);

create trigger voice_handoffs_updated_at
  before update on public.voice_handoffs
  for each row execute function app.set_updated_at();

alter table public.voice_handoffs enable row level security;

create policy "managers read their voice handoffs"
  on public.voice_handoffs for select to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']));

grant select, insert, update, delete on public.voice_handoffs to service_role;
grant select on public.voice_handoffs to authenticated;

-- Per-business pronunciation corrections. `alias` is a natural respelling
-- injected into the speaking prompt; `ipa` is sent to the provider's
-- pronunciation dictionary. Keeping them separate prevents unverified IPA
-- from silently making a word worse.
create table public.voice_pronunciation_overrides (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  business_id  uuid not null,
  written_form text not null check (char_length(trim(written_form)) between 1 and 80),
  replacement  text not null check (char_length(trim(replacement)) between 1 and 160),
  kind         text not null default 'alias' check (kind in ('alias', 'ipa')),
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (business_id, written_form, kind),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index voice_pronunciation_overrides_business_idx
  on public.voice_pronunciation_overrides (business_id, active, created_at);

create trigger voice_pronunciation_overrides_updated_at
  before update on public.voice_pronunciation_overrides
  for each row execute function app.set_updated_at();

alter table public.voice_pronunciation_overrides enable row level security;

create policy "members read pronunciation overrides"
  on public.voice_pronunciation_overrides for select to authenticated
  using (app.is_member(tenant_id));

create policy "managers manage pronunciation overrides"
  on public.voice_pronunciation_overrides for all to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']))
  with check (app.has_role(tenant_id, array['owner', 'admin']));

grant select, insert, update, delete on public.voice_pronunciation_overrides to service_role;
grant select, insert, update, delete on public.voice_pronunciation_overrides to authenticated;
