-- ════════════════════════════════════════════════════════════════
-- Phase 12 — Customer membership plans (Elite tier).
--
-- Lets a business sell its OWN customers a recurring maintenance /
-- membership plan (e.g. an HVAC "comfort club", a towing "road club").
-- This is the business's recurring revenue, not ours.
--
-- V1 model (operator decision, June 2026 — keep margin, no Stripe Connect):
--   * A business defines plans (membership_plans): name, price, interval.
--   * It enrolls a contact (customer_memberships) → a next-due date.
--   * Renewal reuses the Phase-8 payment-link flow: each cycle we create a
--     Stripe Checkout link for the plan price and text it; on send we roll
--     current_period_end forward by one interval. No auto-charge in V1
--     (that needs Stripe Connect onboarding for each business) — this is
--     "assisted recurring", surfaced honestly in the UI.
--
-- Gated by the Elite plan's existing `membership` feature flag
-- (plan_limits.feature_flags_json) — no new entitlement plumbing.
--
-- Tenancy: members manage their own plans + enrollments (RLS is_member);
-- service role writes renewals from the payments webhook path.
-- ════════════════════════════════════════════════════════════════

-- ── membership_plans: the catalog a business offers its customers ──
create table public.membership_plans (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.organizations (id) on delete cascade,
  business_id   uuid not null,
  name          text not null,
  description   text,
  price_cents   integer not null check (price_cents > 0),
  currency      text not null default 'usd',
  interval      text not null default 'monthly'
                check (interval in ('monthly', 'quarterly', 'yearly')),
  benefits      jsonb not null default '[]'::jsonb,
  active        boolean not null default true,
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz,
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index membership_plans_tenant_idx
  on public.membership_plans (tenant_id, active);

-- ── customer_memberships: a contact enrolled in one of those plans ──
create table public.customer_memberships (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.organizations (id) on delete cascade,
  business_id         uuid not null,
  contact_id          uuid not null,
  plan_id             uuid not null,
  status              text not null default 'active'
                      check (status in ('active', 'paused', 'canceled')),
  started_at          timestamptz not null default now(),
  -- The next renewal due date (rolled forward each cycle).
  current_period_end  date not null,
  last_payment_id     uuid,
  created_by          uuid references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete cascade,
  foreign key (plan_id, tenant_id)
    references public.membership_plans (id, tenant_id) on delete cascade
);

create index customer_memberships_tenant_idx
  on public.customer_memberships (tenant_id, status);
create index customer_memberships_contact_idx
  on public.customer_memberships (contact_id);
-- Drives the renewal sweep (find active memberships coming due).
create index customer_memberships_due_idx
  on public.customer_memberships (current_period_end)
  where status = 'active';

create trigger membership_plans_updated_at
  before update on public.membership_plans
  for each row execute function app.set_updated_at();
create trigger customer_memberships_updated_at
  before update on public.customer_memberships
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.membership_plans enable row level security;
alter table public.customer_memberships enable row level security;

create policy "members manage their membership plans"
  on public.membership_plans for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their customer memberships"
  on public.customer_memberships for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- ── Grants (explicit) ──────────────────────────────────────────
grant select, insert, update, delete on public.membership_plans to service_role;
grant select, insert, update, delete on public.membership_plans to authenticated;
grant select, insert, update, delete on public.customer_memberships to service_role;
grant select, insert, update, delete on public.customer_memberships to authenticated;
