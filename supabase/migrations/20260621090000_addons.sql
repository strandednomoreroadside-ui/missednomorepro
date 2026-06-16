-- ════════════════════════════════════════════════════════════════
-- Phase 3 — add-on entitlement layer (vision pricing, June 2026).
--
-- Optional paid modules (Outbound Assistant, Omnichannel Chat, Business
-- Assistant, the Growth Suite bundle, Reputation Manager, Call
-- Intelligence) are sold as separate Stripe subscription ITEMS on the
-- tenant's existing subscription. Stripe is the source of truth; the
-- signature-verified webhook mirrors each item into tenant_addons.
--
-- Members READ their entitlements; only the service role writes them
-- (mirrors the subscriptions table — no client can grant itself an add-on).
-- ════════════════════════════════════════════════════════════════

create table public.tenant_addons (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references public.organizations (id) on delete cascade,
  addon_key                   text not null,
  -- mirrors the Stripe subscription status (active/trialing/canceled/…)
  status                      text not null default 'active',
  stripe_subscription_item_id text,
  stripe_price_id             text,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz,
  unique (tenant_id, addon_key)
);

create index tenant_addons_tenant_idx on public.tenant_addons (tenant_id);
create index tenant_addons_active_idx
  on public.tenant_addons (tenant_id) where status = 'active';

create trigger tenant_addons_updated_at
  before update on public.tenant_addons
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.tenant_addons enable row level security;

-- Members read their own add-ons; writes are service-role only (Stripe
-- webhook + billing server actions via the admin client).
create policy "members read their addons"
  on public.tenant_addons for select to authenticated
  using (app.is_member(tenant_id));

-- ── Grants (RLS still guards rows) ─────────────────────────────
grant select, insert, update, delete on public.tenant_addons to service_role;
grant select on public.tenant_addons to authenticated;
