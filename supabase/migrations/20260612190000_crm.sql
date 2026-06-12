-- ════════════════════════════════════════════════════════════════
-- M5: CRM — contacts, leads, notes, timeline. Master plan Phase 4
-- (Tickets 21–24), §8.3 (schema), §9 (security).
--
-- Design notes:
--   * Same tenancy pattern as M2/M4: tenant_id + RLS via app.is_member,
--     composite FKs so child rows can't cross tenants, explicit grants.
--   * Phones are stored normalized (+1XXXXXXXXXX) and unique per
--     tenant — the M7 AI's lookup_contact matches callers by phone.
--   * consent_sms defaults FALSE (§5.8: no consent, no texts — M8
--     enforces; the fields live here so every write path records them).
--   * customer_timeline_events is read-only for clients. Rows come
--     from triggers (contact created, note added) and — starting M7 —
--     the server writing calls/messages/jobs. One tamper-proof history.
-- ════════════════════════════════════════════════════════════════

-- ── Tables ─────────────────────────────────────────────────────

create table public.contacts (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.organizations (id) on delete cascade,
  name              text not null check (char_length(name) between 1 and 160),
  phone             text check (phone ~ '^\+1[0-9]{10}$'),
  email             text,
  address           text,
  notes             text,
  tags              text[] not null default '{}',
  consent_sms       boolean not null default false,
  consent_source    text,
  consent_timestamp timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  unique (id, tenant_id)
);

create index contacts_tenant_idx on public.contacts (tenant_id);
create index contacts_tenant_name_idx on public.contacts (tenant_id, name);
create index contacts_tags_idx on public.contacts using gin (tags);
-- One contact per phone number per tenant (caller matching at M7).
create unique index contacts_tenant_phone_key
  on public.contacts (tenant_id, phone) where phone is not null;

create table public.leads (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  contact_id      uuid not null,
  source          text not null default 'manual'
                  check (source in ('manual', 'call', 'sms', 'web')),
  status          text not null default 'new'
                  check (status in ('new', 'contacted', 'qualified', 'won', 'lost')),
  service_needed  text,
  urgency         text check (urgency in ('low', 'normal', 'high', 'emergency')),
  estimated_value numeric,
  assigned_to     uuid references auth.users (id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete cascade
);

create index leads_tenant_status_idx on public.leads (tenant_id, status);
create index leads_contact_idx on public.leads (contact_id);

create table public.customer_notes (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.organizations (id) on delete cascade,
  contact_id     uuid not null,
  author_user_id uuid references auth.users (id) on delete set null,
  note           text not null check (char_length(note) between 1 and 5000),
  created_at     timestamptz not null default now(),
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete cascade
);

create index customer_notes_contact_time_idx
  on public.customer_notes (contact_id, created_at desc);

-- event_type stays unconstrained text on purpose: M7+ adds 'call',
-- 'sms', 'job', 'appointment' without another migration.
create table public.customer_timeline_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.organizations (id) on delete cascade,
  contact_id uuid not null,
  event_type text not null,
  source_id  text,
  summary    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete cascade
);

create index customer_timeline_contact_time_idx
  on public.customer_timeline_events (contact_id, created_at desc);
create index customer_timeline_tenant_idx
  on public.customer_timeline_events (tenant_id);

-- ── updated_at triggers ────────────────────────────────────────

create trigger contacts_updated_at
  before update on public.contacts
  for each row execute function app.set_updated_at();

create trigger leads_updated_at
  before update on public.leads
  for each row execute function app.set_updated_at();

-- ── Timeline auto-events ───────────────────────────────────────
-- Written as SECURITY DEFINER so they work no matter who (member,
-- service role, AI tool) performed the original write.

create or replace function app.timeline_contact_created()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.customer_timeline_events
    (tenant_id, contact_id, event_type, source_id, summary)
  values
    (new.tenant_id, new.id, 'contact_created', new.id::text,
     'Contact added: ' || new.name);
  return null;
end;
$$;

create trigger contacts_timeline_created
  after insert on public.contacts
  for each row execute function app.timeline_contact_created();

create or replace function app.timeline_note_added()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.customer_timeline_events
    (tenant_id, contact_id, event_type, source_id, summary)
  values
    (new.tenant_id, new.contact_id, 'note', new.id::text,
     left(new.note, 200));
  return null;
end;
$$;

create trigger customer_notes_timeline
  after insert on public.customer_notes
  for each row execute function app.timeline_note_added();

create or replace function app.timeline_lead_created()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.customer_timeline_events
    (tenant_id, contact_id, event_type, source_id, summary, metadata)
  values
    (new.tenant_id, new.contact_id, 'lead', new.id::text,
     'Lead created' ||
       coalesce(': ' || new.service_needed, '') ||
       ' (' || new.source || ')',
     jsonb_build_object('status', new.status, 'urgency', new.urgency));
  return null;
end;
$$;

create trigger leads_timeline
  after insert on public.leads
  for each row execute function app.timeline_lead_created();

-- ── Row Level Security ─────────────────────────────────────────

alter table public.contacts enable row level security;
alter table public.leads enable row level security;
alter table public.customer_notes enable row level security;
alter table public.customer_timeline_events enable row level security;

create policy "members manage their contacts"
  on public.contacts for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their leads"
  on public.leads for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their customer notes"
  on public.customer_notes for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- Timeline: members read; rows are written only by the triggers above
-- and the server (service role) — history can't be edited away.
create policy "members read their timeline"
  on public.customer_timeline_events for select to authenticated
  using (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────

grant select, insert, update, delete
  on public.contacts, public.leads, public.customer_notes,
     public.customer_timeline_events
  to service_role;

grant select, insert, update, delete
  on public.contacts, public.leads, public.customer_notes
  to authenticated;

grant select on public.customer_timeline_events to authenticated;
