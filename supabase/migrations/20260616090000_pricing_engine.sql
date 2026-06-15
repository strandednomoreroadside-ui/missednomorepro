-- ════════════════════════════════════════════════════════════════
-- Pricing engine — deterministic quotes (master plan §10 calculate_quote,
-- Phase 9, pulled forward at the operator's request after M9).
--
-- The AI may speak EXACT prices, but every number is computed by the
-- backend calculate_quote tool from THESE owner-approved rules + a real
-- driving-distance lookup. The LLM never does pricing math (preserves the
-- §5.1 "AI never invents prices" rule + the §14 0%-hallucination gate).
--
-- Model (Stranded No More): Total = zone dispatch fee (by driving miles
-- from a fixed home base) + service fee (flat, or tow = hook + per-mile)
-- + auto time-window surcharges. Conditional surcharges are surfaced to
-- the caller but NOT auto-added (operator's choice).
--
-- Design notes:
--   * Same tenancy pattern as M4–M9: tenant_id + RLS via app.is_member,
--     composite (id, tenant_id) FKs, explicit grants.
--   * This is owner-entered configuration (like the M4 wizard's services/
--     pricing) → members MANAGE it. Quoting only turns on once the owner
--     has approved it (pricing_settings.approved_at) AND a base location +
--     at least one zone and service exist — checked in app code, mirrored
--     by the prompt builder so the agent re-syncs when it flips on.
--   * service_pricing is keyed by name (what the caller asks for); the
--     optional service_id is a soft link to the M4 services list.
-- ════════════════════════════════════════════════════════════════

-- ── pricing_settings: per-business engine config + dispatch origin ──
create table public.pricing_settings (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid not null references public.organizations (id) on delete cascade,
  business_id       uuid not null,
  base_address      text,
  base_lat          numeric,
  base_lng          numeric,
  max_service_miles numeric not null default 25,
  currency          text not null default 'usd',
  -- Owner approval gate: quoting stays off until this is stamped.
  approved_at       timestamptz,
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz,
  unique (id, tenant_id),
  unique (business_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index pricing_settings_tenant_idx on public.pricing_settings (tenant_id);

-- ── pricing_zones: distance-banded dispatch fee ────────────────
create table public.pricing_zones (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  business_id  uuid not null,
  zone_number  integer not null,
  min_miles    numeric not null,
  max_miles    numeric not null,
  dispatch_fee numeric not null,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  check (max_miles > min_miles),
  check (dispatch_fee >= 0),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index pricing_zones_business_idx on public.pricing_zones (business_id, min_miles);

-- ── service_pricing: per-service price (flat or tow) ───────────
create table public.service_pricing (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  business_id     uuid not null,
  -- Soft link to the M4 services list (optional; pricing is keyed by name).
  service_id      uuid,
  name            text not null check (char_length(name) between 1 and 160),
  pricing_type    text not null default 'flat'
                  check (pricing_type in ('flat', 'tow')),
  service_fee     numeric not null default 0 check (service_fee >= 0),
  -- Tow only:
  hook_fee        numeric check (hook_fee >= 0),
  per_mile_rate   numeric check (per_mile_rate >= 0),
  -- "+ cost of <part>" services (tire/battery/fuel) — AI quotes the fixed
  -- fee and notes the part cost is confirmed before dispatch.
  variable_part   text,
  -- Optional availability window (e.g. no-spare tire 09:00–16:00).
  available_start time,
  available_end   time,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index service_pricing_business_idx on public.service_pricing (business_id);

-- ── pricing_surcharges: time-window (auto) or conditional ──────
create table public.pricing_surcharges (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  business_id  uuid not null,
  name         text not null,
  amount       numeric not null,
  -- auto_time: applied automatically when the call time is in the window
  -- (e.g. late-night 21:00–05:00). conditional: surfaced to the caller as
  -- "may add $X", never auto-added.
  apply_type   text not null default 'conditional'
               check (apply_type in ('auto_time', 'conditional')),
  window_start time,
  window_end   time,
  active       boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index pricing_surcharges_business_idx on public.pricing_surcharges (business_id);

-- ── updated_at triggers ────────────────────────────────────────
create trigger pricing_settings_updated_at
  before update on public.pricing_settings
  for each row execute function app.set_updated_at();
create trigger pricing_zones_updated_at
  before update on public.pricing_zones
  for each row execute function app.set_updated_at();
create trigger service_pricing_updated_at
  before update on public.service_pricing
  for each row execute function app.set_updated_at();
create trigger pricing_surcharges_updated_at
  before update on public.pricing_surcharges
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.pricing_settings enable row level security;
alter table public.pricing_zones enable row level security;
alter table public.service_pricing enable row level security;
alter table public.pricing_surcharges enable row level security;

-- Owner-managed configuration (like the M4 wizard data). The quote tool
-- reads it via the service role.
create policy "members manage their pricing settings"
  on public.pricing_settings for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy "members manage their pricing zones"
  on public.pricing_zones for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy "members manage their service pricing"
  on public.service_pricing for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy "members manage their pricing surcharges"
  on public.pricing_surcharges for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────
grant select, insert, update, delete
  on public.pricing_settings, public.pricing_zones,
     public.service_pricing, public.pricing_surcharges
  to service_role;
grant select, insert, update, delete
  on public.pricing_settings, public.pricing_zones,
     public.service_pricing, public.pricing_surcharges
  to authenticated;
