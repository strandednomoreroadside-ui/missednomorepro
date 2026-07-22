-- Retire the wizard's legacy per-service flat/base-fee "pricing_rules" gate.
--
-- The wizard's old Pricing step wrote to public.pricing_rules and required
-- setup_states.pricing_approved_at before launch — but the real quoting
-- engine (calculate_quote) has never read from either; it reads
-- service_pricing / pricing_zones / pricing_settings.approved_at, managed
-- entirely on /dashboard/pricing. That left two disconnected "did you set
-- your prices?" concepts: a fake one gating launch, and the real one gating
-- whether the AI can actually quote. Owners were re-entering prices in the
-- wizard that had zero effect on what the AI ever said.
--
-- This migration only loosens app.setup_complete() (drops the pricing_rules
-- + pricing_approved_at requirement) — it can only make launching EASIER,
-- never harder, and the launch-gate trigger only fires on the transition
-- INTO 'live' (see app.enforce_launch_gate), so already-live businesses are
-- completely unaffected. public.pricing_rules and approve_setup_section's
-- 'pricing' branch are left in place (unreachable from the app now, but
-- harmless) rather than dropped, to keep this change minimal and safe.

create or replace function app.setup_complete(biz uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    -- profile + industry filled in
    exists (
      select 1 from public.businesses b
      where b.id = biz
        and b.name is not null
        and b.industry is not null
        and b.phone is not null
        and b.timezone is not null
    )
    -- at least one active service
    and exists (
      select 1 from public.services s
      where s.business_id = biz and s.active
    )
    -- at least one active service-area entry
    and exists (
      select 1 from public.service_areas a
      where a.business_id = biz and a.active
    )
    -- hours saved for all 7 days, at least one day open
    and (
      select count(*) = 7 and bool_or(not h.closed)
      from public.business_hours h
      where h.business_id = biz
    )
    -- someone to notify
    and exists (
      select 1 from public.staff_contacts c
      where c.business_id = biz and c.notify_on_lead
    )
    -- SMS consent settings reviewed (row exists)
    and exists (
      select 1 from public.sms_settings m
      where m.business_id = biz
    )
    -- the two remaining explicit owner approvals (pricing approval now
    -- lives on /dashboard/pricing and is independent of launch)
    and exists (
      select 1 from public.setup_states st
      where st.business_id = biz
        and st.hours_approved_at is not null
        and st.area_approved_at is not null
    );
$$;

revoke all on function app.setup_complete(uuid) from public;
