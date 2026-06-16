-- ════════════════════════════════════════════════════════════════
-- Phase 7 — AI Follow-Up / Outbound engine (the Outbound Assistant add-on).
--
-- Proactive, templated SMS that bring work back in: quote follow-ups,
-- post-job review requests, maintenance reminders, and win-back. Built on
-- the same daily-cron pattern as appointment reminders.
--
-- MARGIN + COMPLIANCE (the whole reason this is careful):
--   * Every automation defaults OFF — the owner opts in per kind. No
--     surprise marketing texts, no surprise SMS bill.
--   * Sends route through sendCustomerSms → consent required (these are
--     proactive/marketing, not transactional) and STOP always wins.
--   * outbound_queue is deduped (unique dedupe_key) so a contact is never
--     texted twice for the same event, and the cron caps sends per run.
--   * Gated behind the Outbound Assistant add-on OR the Growth
--     followup_campaigns plan flag (checked in app code).
-- ════════════════════════════════════════════════════════════════

-- ── automations: per-business config, one row per kind ─────────
create table public.automations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid not null,
  kind        text not null
              check (kind in ('quote_followup', 'review_request', 'maintenance', 'winback')),
  enabled     boolean not null default false,
  -- Used by quote_followup / review_request (hours after the trigger).
  delay_hours integer check (delay_hours is null or delay_hours between 1 and 720),
  -- Used by maintenance / winback (days after the trigger / since last job).
  delay_days  integer check (delay_days is null or delay_days between 1 and 730),
  template    text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (business_id, kind),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index automations_tenant_idx on public.automations (tenant_id);

-- ── outbound_queue: scheduled proactive sends ──────────────────
create table public.outbound_queue (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid not null,
  contact_id  uuid,
  kind        text not null,
  body        text not null,
  send_after  timestamptz not null default now(),
  status      text not null default 'pending'
              check (status in ('pending', 'sent', 'skipped', 'failed', 'canceled')),
  -- Dedupe: e.g. 'review:<jobId>', 'quote_followup:<leadId>',
  -- 'winback:<contactId>:<yyyymm>'. Unique per tenant so we never double-send.
  dedupe_key  text not null,
  sent_at     timestamptz,
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  unique (tenant_id, dedupe_key),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

create index outbound_queue_due_idx
  on public.outbound_queue (send_after)
  where status = 'pending';
create index outbound_queue_tenant_idx on public.outbound_queue (tenant_id, created_at desc);

-- ── updated_at triggers ────────────────────────────────────────
create trigger automations_updated_at
  before update on public.automations
  for each row execute function app.set_updated_at();
create trigger outbound_queue_updated_at
  before update on public.outbound_queue
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.automations enable row level security;
alter table public.outbound_queue enable row level security;

-- Owners configure automations (like other settings).
create policy "members manage their automations"
  on public.automations for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- Members READ the queue (history/visibility); rows are written by the
-- server (enqueue hooks + cron) via the service role.
create policy "members read their outbound queue"
  on public.outbound_queue for select to authenticated
  using (app.is_member(tenant_id));

-- ── Grants (explicit) ──────────────────────────────────────────
grant select, insert, update, delete on public.automations to service_role;
grant select, insert, update, delete on public.automations to authenticated;
grant select, insert, update, delete on public.outbound_queue to service_role;
grant select on public.outbound_queue to authenticated;
