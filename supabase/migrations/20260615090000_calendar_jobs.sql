-- ════════════════════════════════════════════════════════════════
-- M9: Calendar booking & jobs — Google Calendar connection, the AI's
-- appointments, the resulting jobs, and a job status trail.
-- Master plan Phase 8 (Tickets 38–40), §5.3 (booking rules), §8.6
-- (jobs schema), §9 (security).
--
-- Design notes:
--   * Same tenancy pattern as M5–M8: tenant_id + RLS via app.is_member,
--     composite (id, tenant_id) FKs so a leaked UUID can't cross tenants,
--     explicit grants (the M2 lesson).
--   * NO-DOUBLE-BOOKING is enforced by the DATABASE, not just app code:
--     an EXCLUDE/gist constraint forbids two overlapping 'confirmed'
--     appointments for the same business. Even a race between two
--     simultaneous calls cannot create a conflict. (Needs btree_gist for
--     the uuid equality operator class inside the gist index.)
--   * Google OAuth tokens are SECRETS. They are encrypted at rest
--     (app crypto, AES-256-GCM) AND the token columns are never granted
--     to the authenticated role — only the service role can read them.
--     calendar_connections rows are server-written (connect/disconnect
--     server actions via service role); members read non-secret columns.
--   * appointments are server-written (the AI books them; cancel/reschedule
--     from the dashboard arrives later) — members read only. jobs ARE a
--     member work surface (they tick status in the dashboard), so members
--     fully manage jobs; job_status_events is a trigger/server trail.
--   * Booking writes a 'appointment' timeline event and a 'job' timeline
--     event (M5 left customer_timeline_events.event_type unconstrained
--     for exactly this).
-- ════════════════════════════════════════════════════════════════

-- gist needs btree_gist to mix uuid equality (=) with range overlap (&&)
-- in one exclusion constraint. Supabase allows this extension.
create extension if not exists btree_gist;

-- ── calendar_connections: one Google Calendar per business ─────
-- Stores the OAuth grant for a business's calendar. refresh_token is the
-- long-lived secret; access_token is short-lived and refreshed on demand.
-- BOTH are stored encrypted (v1: payloads from src/lib/crypto.ts).
create table public.calendar_connections (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null references public.organizations (id) on delete cascade,
  business_id              uuid not null,
  provider                 text not null default 'google'
                           check (provider in ('google')),
  google_account_email     text,
  google_calendar_id       text not null default 'primary',
  scopes                   text,
  -- secrets — never granted to authenticated (see grants below)
  refresh_token_encrypted  text,
  access_token_encrypted   text,
  access_token_expires_at  timestamptz,
  status                   text not null default 'connected'
                           check (status in ('connected', 'revoked', 'error')),
  last_error               text,
  connected_at             timestamptz not null default now(),
  last_synced_at           timestamptz,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz,
  unique (id, tenant_id),
  -- one connection per business in the MVP
  unique (business_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index calendar_connections_tenant_idx
  on public.calendar_connections (tenant_id);

create trigger calendar_connections_updated_at
  before update on public.calendar_connections
  for each row execute function app.set_updated_at();

-- ── appointments: the AI's bookings (the no-double-booking table) ─
create table public.appointments (
  id                 uuid primary key default gen_random_uuid(),
  tenant_id          uuid not null references public.organizations (id) on delete cascade,
  business_id        uuid not null,
  contact_id         uuid,
  call_id            uuid,
  service_id         uuid,
  title              text not null check (char_length(title) between 1 and 200),
  starts_at          timestamptz not null,
  ends_at            timestamptz not null,
  status             text not null default 'confirmed'
                     check (status in ('confirmed', 'completed', 'canceled', 'no_show')),
  location           text,
  notes              text,
  source             text not null default 'ai'
                     check (source in ('ai', 'manual', 'system')),
  -- Google Calendar sync bookkeeping
  google_event_id    text,
  google_calendar_id text,
  sync_status        text not null default 'none'
                     check (sync_status in ('none', 'pending', 'synced', 'failed')),
  created_at         timestamptz not null default now(),
  updated_at         timestamptz,
  unique (id, tenant_id),
  check (ends_at > starts_at),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null,
  foreign key (call_id, tenant_id)
    references public.calls (id, tenant_id) on delete set null,
  -- THE hard guarantee: no two active appointments for the same business
  -- may overlap in time. '[)' = start-inclusive, end-exclusive so a slot
  -- ending at 10:00 and one starting at 10:00 are NOT a conflict.
  constraint appointments_no_overlap exclude using gist (
    business_id with =,
    tstzrange(starts_at, ends_at, '[)') with &&
  ) where (status = 'confirmed')
);

create index appointments_tenant_time_idx
  on public.appointments (tenant_id, starts_at desc);
create index appointments_business_time_idx
  on public.appointments (business_id, starts_at);
create index appointments_contact_idx on public.appointments (contact_id);

create trigger appointments_updated_at
  before update on public.appointments
  for each row execute function app.set_updated_at();

-- ── jobs: what the team works (§8.6) ───────────────────────────
create table public.jobs (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.organizations (id) on delete cascade,
  business_id    uuid,
  contact_id     uuid,
  appointment_id uuid,
  service_id     uuid,
  title          text not null check (char_length(title) between 1 and 200),
  status         text not null default 'scheduled'
                 check (status in ('new', 'scheduled', 'in_progress', 'completed', 'canceled')),
  scheduled_for  timestamptz,
  address        text,
  notes          text,
  source         text not null default 'ai'
                 check (source in ('ai', 'manual', 'system')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null,
  foreign key (appointment_id, tenant_id)
    references public.appointments (id, tenant_id) on delete set null
);

create index jobs_tenant_status_idx on public.jobs (tenant_id, status, scheduled_for);
create index jobs_contact_idx on public.jobs (contact_id);
create index jobs_appointment_idx on public.jobs (appointment_id);

create trigger jobs_updated_at
  before update on public.jobs
  for each row execute function app.set_updated_at();

-- ── job_status_events: the job's status trail ──────────────────
create table public.job_status_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.organizations (id) on delete cascade,
  job_id     uuid not null,
  status     text not null,
  note       text,
  changed_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (job_id, tenant_id)
    references public.jobs (id, tenant_id) on delete cascade
);

create index job_status_events_job_idx
  on public.job_status_events (job_id, created_at);

-- ── sms_settings: booking confirmation template ────────────────
alter table public.sms_settings
  add column booking_confirmation_template text not null default
    'You''re booked with {business} for {time}. Reply STOP to opt out.';

-- ── Triggers: timeline events + job status trail ───────────────
-- All SECURITY DEFINER with empty search_path, like M5/M8, so they run
-- correctly no matter who performed the write (member, service role, AI).

-- Appointment booked -> contact timeline.
create or replace function app.timeline_appointment()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.contact_id is not null then
    insert into public.customer_timeline_events
      (tenant_id, contact_id, event_type, source_id, summary, metadata)
    values (
      new.tenant_id, new.contact_id, 'appointment', new.id::text,
      'Appointment booked: ' || new.title,
      jsonb_build_object(
        'starts_at', new.starts_at,
        'ends_at', new.ends_at,
        'status', new.status,
        'source', new.source
      )
    );
  end if;
  return null;
end;
$$;

create trigger appointments_timeline
  after insert on public.appointments
  for each row execute function app.timeline_appointment();

-- Job created -> contact timeline (when tied to a contact).
create or replace function app.timeline_job()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.contact_id is not null then
    insert into public.customer_timeline_events
      (tenant_id, contact_id, event_type, source_id, summary, metadata)
    values (
      new.tenant_id, new.contact_id, 'job', new.id::text,
      'Job created: ' || new.title,
      jsonb_build_object('status', new.status, 'scheduled_for', new.scheduled_for)
    );
  end if;
  return null;
end;
$$;

create trigger jobs_timeline
  after insert on public.jobs
  for each row execute function app.timeline_job();

-- Job created or status changed -> job_status_events trail.
create or replace function app.job_status_trail()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.job_status_events (tenant_id, job_id, status, note)
    values (new.tenant_id, new.id, new.status, 'Job created');
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.job_status_events (tenant_id, job_id, status, note)
    values (new.tenant_id, new.id, new.status, 'Status changed');
  end if;
  return null;
end;
$$;

create trigger jobs_status_trail
  after insert or update on public.jobs
  for each row execute function app.job_status_trail();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.calendar_connections enable row level security;
alter table public.appointments enable row level security;
alter table public.jobs enable row level security;
alter table public.job_status_events enable row level security;

-- calendar_connections: members READ (non-secret columns only — see the
-- column-scoped grant below). Connect/disconnect run server-side.
create policy "members read their calendar connection"
  on public.calendar_connections for select to authenticated
  using (app.is_member(tenant_id));

-- appointments: members read; the AI/server writes them.
create policy "members read their appointments"
  on public.appointments for select to authenticated
  using (app.is_member(tenant_id));

-- jobs: members fully manage their work board.
create policy "members manage their jobs"
  on public.jobs for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- job_status_events: members read; rows are trigger/server-written.
create policy "members read their job status events"
  on public.job_status_events for select to authenticated
  using (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────
grant select, insert, update, delete
  on public.calendar_connections, public.appointments,
     public.jobs, public.job_status_events
  to service_role;

-- IMPORTANT: authenticated gets SELECT on calendar_connections only for
-- NON-SECRET columns. The token columns are deliberately omitted, so a
-- member (or a leaked anon/auth key) can never read the OAuth tokens even
-- though they can see that a connection exists.
grant select (
  id, tenant_id, business_id, provider, google_account_email,
  google_calendar_id, scopes, status, last_error,
  connected_at, last_synced_at, created_at, updated_at
) on public.calendar_connections to authenticated;

grant select on public.appointments to authenticated;
grant select, insert, update, delete on public.jobs to authenticated;
grant select on public.job_status_events to authenticated;
