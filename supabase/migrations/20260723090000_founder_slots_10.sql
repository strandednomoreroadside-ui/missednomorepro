-- Follow-up to 20260722100000_founder_offer.sql (operator decision, July 23
-- 2026): widen the founder program from 5 slots to 10. The original CHECK
-- constraint capped founder_slot at 5, which would reject the 6th-10th
-- claim outright (app-level FOUNDER_SLOTS in src/lib/billing/founder.ts is
-- bumped in the same commit). Drop + re-add rather than edit the original
-- migration in place, since that one is already applied in prod.

alter table public.subscriptions
  drop constraint if exists subscriptions_founder_slot_check;

alter table public.subscriptions
  add constraint subscriptions_founder_slot_check check (founder_slot between 1 and 10);
