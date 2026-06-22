-- ════════════════════════════════════════════════════════════════
-- M10 — hardening, cost controls & the beta gate (BUILD_GUIDE M10,
-- master-plan §14 + §15).
--
-- Adds the *enforcement* layer on top of the metering we already have:
--   * businesses.ai_enabled  — the owner/admin kill switch. When off, a
--     call rings businesses.forward_number instead of the AI (or, when a
--     usage/spend cap trips, the cost-control lib forwards there too).
--   * Per-tenant daily spend cap + overage cap (subscriptions override
--     the plan_limits default; null = use the plan default).
--   * usage_alerts — an idempotency ledger so each 50/80/100/120%
--     threshold notifies the owner exactly once per billing period.
--
-- Conventions: RLS (members read; server writes), explicit grants (the
-- SQL editor doesn't apply default privileges — established gotcha).
-- ════════════════════════════════════════════════════════════════

-- ── Kill switch + forward target (on businesses) ───────────────
alter table public.businesses
  add column if not exists ai_enabled     boolean not null default true,
  add column if not exists forward_number text;

comment on column public.businesses.ai_enabled is
  'Owner/admin kill switch. When false, inbound calls forward to forward_number (or the first notify_on_lead staff phone) instead of the AI.';

-- ── Cost-control caps ──────────────────────────────────────────
-- Plan-level defaults (a circuit breaker against runaway/abuse spend).
alter table public.plan_limits
  add column if not exists daily_spend_cap_cents integer not null default 2000,
  add column if not exists overage_cap_cents     integer not null default 5000;

-- Per-tenant overrides (null = inherit the plan default).
alter table public.subscriptions
  add column if not exists daily_spend_cap_cents integer,
  add column if not exists overage_cap_cents     integer;

-- Sensible per-tier defaults (cents). Daily cap ≈ a hard circuit
-- breaker; overage cap ≈ the max metered overage we'll allow per period
-- before forwarding to the owner. Operators can override per tenant.
update public.plan_limits set daily_spend_cap_cents = 0,     overage_cap_cents = 0     where plan = 'none';
update public.plan_limits set daily_spend_cap_cents = 2000,  overage_cap_cents = 5000  where plan = 'starter';
update public.plan_limits set daily_spend_cap_cents = 4000,  overage_cap_cents = 10000 where plan = 'growth';
update public.plan_limits set daily_spend_cap_cents = 7500,  overage_cap_cents = 20000 where plan = 'professional';
update public.plan_limits set daily_spend_cap_cents = 15000, overage_cap_cents = 40000 where plan = 'elite';
update public.plan_limits set daily_spend_cap_cents = 50000, overage_cap_cents = 100000 where plan = 'enterprise';

-- ── usage_alerts (threshold-notification ledger) ───────────────
create table if not exists public.usage_alerts (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  kind         text not null check (kind in ('voice_minutes', 'sms')),
  period_start timestamptz not null,
  threshold    integer not null check (threshold in (50, 80, 100, 120)),
  channel      text,
  notified_at  timestamptz not null default now(),
  unique (tenant_id, kind, period_start, threshold)
);

create index if not exists usage_alerts_tenant_idx
  on public.usage_alerts (tenant_id, period_start desc);

-- ── RLS ────────────────────────────────────────────────────────
alter table public.usage_alerts enable row level security;

create policy "members read their usage alerts"
  on public.usage_alerts for select to authenticated
  using (app.is_member(tenant_id));

-- ── Grants (explicit — SQL editor skips default privileges) ────
grant select, insert, update, delete on public.usage_alerts to service_role;
grant select on public.usage_alerts to authenticated;
