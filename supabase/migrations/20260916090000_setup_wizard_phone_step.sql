-- Add a "phone" step to the setup wizard (self-serve onboarding, Sept 2026):
-- getting a working business number becomes part of the wizard itself
-- instead of a separate page a self-serve customer might never find.
-- (onboarding/page.tsx already promised this — "you'll add ... your phone
-- setup in the wizard later" — this migration is what makes that true.)
--
-- Claiming a number requires a card on file (guards the platform's Twilio
-- bill — see provisionEligibility in dashboard/numbers/actions.ts), so the
-- step is placed last among the content steps, right before launch, and
-- degrades gracefully in the UI ("start your trial first") rather than
-- blocking the rest of the wizard when no card is on file yet.
--
-- Two changes, both create-or-replace (safe, no data migration, no change
-- to either function's existing grants — create-or-replace never touches
-- privilege state):
--
--   1. save_setup_progress's step whitelist needs "phone" added, or saving
--      the wizard bookmark for that step raises "unknown wizard step".
--   2. app.setup_complete() gains a "has at least one phone number"
--      requirement, same shape as every other launch-gate check. Only
--      fires on the transition INTO 'live' (app.enforce_launch_gate), so
--      already-live businesses (Stranded No More, the Summit Home Services
--      demo) are completely unaffected — they already have a number.

create or replace function public.save_setup_progress(biz uuid, step text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  org uuid;
begin
  select b.tenant_id into org from public.businesses b where b.id = biz;
  if org is null or not app.is_member(org) then
    raise exception 'not a member of this business''s organization';
  end if;
  if step not in ('profile', 'industry', 'services', 'pricing', 'service-area',
                  'hours', 'notifications', 'sms', 'faqs', 'phone', 'launch') then
    raise exception 'unknown wizard step: %', step;
  end if;
  update public.setup_states set current_step = step where business_id = biz;
end;
$$;

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
    -- a real phone number attached — otherwise "live" answers nothing.
    -- phone_numbers is keyed by tenant_id (business_id on that table can be
    -- null on a self-provisioned row), so join through businesses.
    and exists (
      select 1 from public.phone_numbers p
      join public.businesses b2 on b2.tenant_id = p.tenant_id
      where b2.id = biz
    )
    -- the two remaining explicit owner approvals (pricing approval lives on
    -- /dashboard/pricing and is independent of launch — see
    -- 20260721100000_retire_wizard_pricing_gate.sql)
    and exists (
      select 1 from public.setup_states st
      where st.business_id = biz
        and st.hours_approved_at is not null
        and st.area_approved_at is not null
    );
$$;

revoke all on function app.setup_complete(uuid) from public;
