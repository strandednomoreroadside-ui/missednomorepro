-- Founder offer v2 (operator decision, July 2026) — replaces the old manual
-- "$50/month flat" concierge offer. The first 5 businesses to make a real
-- payment (trial converted, not just started) pay normal plan pricing but
-- get every currently-paid add-on free for as long as their subscription
-- stays continuously active. One full cancellation ends the benefit for
-- good, even if they resubscribe later (a new, non-continuous subscription).
--
-- Slot assignment + lapse tracking live directly on `subscriptions` (one row
-- per tenant already). Members already have SELECT-only on this table
-- (20260612090000_billing.sql) — no grant changes needed. All writes are
-- server-only (Stripe webhook / sync), same as every other column here.

alter table public.subscriptions
  add column founder_slot smallint unique check (founder_slot between 1 and 5),
  add column founder_granted_at timestamptz,
  add column founder_lapsed boolean not null default false,
  -- Idempotency marker: set once, on the tenant's first-ever successful
  -- invoice.paid, so renewals never get re-evaluated for a slot.
  add column first_payment_at timestamptz;

-- Tenants excluded from the founder program (currently just the operator's
-- own live business — it's not an outside customer and shouldn't consume
-- one of only 5 slots). General-purpose flag in case another internal/test
-- tenant needs the same exclusion later.
alter table public.organizations
  add column founder_excluded boolean not null default false;

update public.organizations o
set founder_excluded = true
from public.organization_members m
join auth.users u on u.id = m.user_id
where m.organization_id = o.id
  and m.role = 'owner'
  and u.email = 'hello@missednomorepro.com';
