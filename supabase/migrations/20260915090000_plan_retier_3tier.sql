-- ════════════════════════════════════════════════════════════════
-- 3-tier simplification (operator decision, September 2026) — trade
-- margin-per-account for signup volume while the product is still
-- building its first case studies/testimonials.
--
-- Elite is retired from self-serve (still a valid plan for any existing
-- subscriber — never deleted from this table, or effectivePlan()'s
-- stale-id guard would lock them out; see src/lib/billing/plans.ts
-- PLAN_META.elite.retired). Starter/Growth/Professional become the only
-- self-serve tiers, minutes trimmed to a level that stays gross-margin-
-- positive even if a tenant uses 100% of its allotment every month
-- (this product has no metered overage — a hard cap forwards calls to the
-- owner instead), just thinner than the old 70%-safe target.
--
-- outbound_assistant — the last paid add-on — is folded in free everywhere
-- too, same jsonb `||` merge pattern as 20260722090000_fold_addons_into_
-- plans.sql (which did the other four in July).
-- ════════════════════════════════════════════════════════════════

update public.plan_limits set monthly_minutes = 200 where plan = 'starter';
update public.plan_limits set monthly_minutes = 400 where plan = 'growth';
update public.plan_limits set monthly_minutes = 800 where plan = 'professional';

update public.plan_limits
set feature_flags_json = feature_flags_json || '{"outbound_assistant": true}'::jsonb
where plan in ('starter', 'growth', 'professional', 'elite', 'enterprise');
