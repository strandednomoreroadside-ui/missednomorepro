-- ════════════════════════════════════════════════════════════════
-- Failed-payment handling / dunning (NEEDS.md upgrade #2).
--
-- When a renewal charge fails, Stripe flips the subscription to past_due
-- and retries on its own schedule. Without surfacing it, a declined card
-- silently churns a customer. We stamp payment_failed_at on the FIRST
-- failure of a dunning cycle (so the grace-period clock + the in-app banner
-- date are stable across Stripe's retries) and clear it when a charge
-- finally succeeds. Server-written from the signature-verified webhook;
-- members read it (it's their own billing status) for the banner.
-- ════════════════════════════════════════════════════════════════

alter table public.subscriptions
  add column payment_failed_at timestamptz;
