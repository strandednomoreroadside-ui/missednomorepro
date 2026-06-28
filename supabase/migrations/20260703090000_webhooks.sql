-- ════════════════════════════════════════════════════════════════
-- Outbound webhooks — the Zapier / integration escape hatch (Later backlog).
--
-- A business registers endpoint URLs and subscribes to events (new lead,
-- appointment booked, job completed, payment received). When an event fires
-- we POST a signed JSON payload to each subscribed URL. Zapier's "Catch
-- Hook" (and any other tool) consumes it — so customers connect their own
-- CRM / spreadsheet / marketing tool without us building a per-CRM adapter.
--
-- Conventions kept: tenant_id + RLS (app.is_member / app.has_role), explicit
-- grants (the M2 lesson). Endpoints can exfiltrate tenant data + carry a
-- signing secret, so writes are owner/admin only. Deliveries are written by
-- the service role (the delivery worker) and only read by members.
-- ════════════════════════════════════════════════════════════════

create table public.webhook_endpoints (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  business_id     uuid references public.businesses (id) on delete cascade,
  label           text,
  url             text not null,
  secret          text not null,
  -- Subscribed event types; empty array = all events.
  events          text[] not null default '{}',
  active          boolean not null default true,
  failure_count   integer not null default 0,
  last_success_at timestamptz,
  last_error      text,
  created_at      timestamptz not null default now()
);

create index webhook_endpoints_tenant_idx on public.webhook_endpoints (tenant_id);

alter table public.webhook_endpoints enable row level security;

create policy "members read endpoints"
  on public.webhook_endpoints for select to authenticated
  using (app.is_member(tenant_id));
create policy "admins create endpoints"
  on public.webhook_endpoints for insert to authenticated
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins update endpoints"
  on public.webhook_endpoints for update to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']))
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins delete endpoints"
  on public.webhook_endpoints for delete to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']));

grant select, insert, update, delete on public.webhook_endpoints to service_role;
grant select, insert, update, delete on public.webhook_endpoints to authenticated;

-- ── Delivery log + retry queue (service-role written) ──────────
create table public.webhook_deliveries (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  endpoint_id     uuid not null references public.webhook_endpoints (id) on delete cascade,
  event           text not null,
  payload         jsonb not null,
  status          text not null default 'pending'
                  check (status in ('pending', 'success', 'failed')),
  attempts        integer not null default 0,
  response_status integer,
  error           text,
  next_attempt_at timestamptz not null default now(),
  delivered_at    timestamptz,
  created_at      timestamptz not null default now()
);

create index webhook_deliveries_tenant_time_idx
  on public.webhook_deliveries (tenant_id, created_at desc);
create index webhook_deliveries_endpoint_idx
  on public.webhook_deliveries (endpoint_id, created_at desc);
-- The cron worker scans for due retries (status stays 'pending' until a
-- success or terminal give-up, so this partial index covers the retry query).
create index webhook_deliveries_due_idx
  on public.webhook_deliveries (next_attempt_at)
  where status = 'pending';

alter table public.webhook_deliveries enable row level security;

create policy "members read deliveries"
  on public.webhook_deliveries for select to authenticated
  using (app.is_member(tenant_id));

grant select, insert, update, delete on public.webhook_deliveries to service_role;
grant select on public.webhook_deliveries to authenticated;
