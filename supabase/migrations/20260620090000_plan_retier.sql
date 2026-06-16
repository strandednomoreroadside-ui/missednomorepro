-- ════════════════════════════════════════════════════════════════
-- Phase 2 — pricing re-architecture (vision plan, June 2026).
--
-- Renames the tiers to Starter / Growth / Professional / Elite (+ a
-- custom Enterprise row) and resets included minutes to the 70%-safe
-- level. Voice minutes are the only material COGS (~$0.10–0.13/min), so
-- usage past the allotment bills as metered overage (built in Phase 4);
-- the per-unit overage rates live here now so the schema is ready.
--
-- The expanded feature_flags_json maps every vision module to a tier.
-- Booking etc. still self-enable in code today; these flags drive the
-- dashboard "Plan features" card now and gate future-phase modules.
--
-- Stripe is in test mode, so renaming + recreating prices is free — the
-- operator re-runs /admin/billing-setup after this migration.
-- ════════════════════════════════════════════════════════════════

-- Per-unit overage rates (cents). 0 on the locked 'none' row.
alter table public.plan_limits
  add column if not exists overage_per_minute_cents integer not null default 20,
  add column if not exists overage_per_sms_cents    integer not null default 2;

-- Drop the old tier rows (answer/book/revenue/scale/agency). Existing
-- test subscriptions that still reference them resolve to 'none' via
-- effectivePlan() until the tenant re-subscribes to a new tier.
delete from public.plan_limits
  where plan in ('answer', 'book', 'revenue', 'scale', 'agency');

-- ── Seed the new tiers (idempotent upsert) ─────────────────────
insert into public.plan_limits
  (plan, monthly_minutes, simultaneous_calls, monthly_sms,
   monthly_web_conversations, max_users, max_locations, max_workflows,
   max_knowledge_sources, transcript_retention_days,
   overage_per_minute_cents, overage_per_sms_cents, feature_flags_json)
values
  ('none', 0, 0, 0, 0, 1, 1, 0, 0, 7, 0, 0,
   '{}'),
  ('starter', 250, 1, 1000, 0, 1, 1, 1, 5, 30, 20, 2,
   '{"crm_basic":true,"booking":true,"cancel_reschedule":true,"transfer":true,"gcal":true,"call_summaries":true,"review_requests":true,"missed_call_recovery":true,"jobs":true}'),
  ('growth', 500, 2, 3000, 0, 3, 1, 5, 15, 60, 20, 2,
   '{"crm_basic":true,"booking":true,"cancel_reschedule":true,"transfer":true,"gcal":true,"call_summaries":true,"review_requests":true,"missed_call_recovery":true,"jobs":true,"lead_pipeline":true,"followup_campaigns":true,"reminders":true,"payment_requests":true,"analytics":true,"timeline":true,"quote_intake":true,"quotes":true}'),
  ('professional', 900, 4, 7500, 500, 10, 1, 20, 30, 90, 20, 2,
   '{"crm_basic":true,"booking":true,"cancel_reschedule":true,"transfer":true,"gcal":true,"call_summaries":true,"review_requests":true,"missed_call_recovery":true,"jobs":true,"lead_pipeline":true,"followup_campaigns":true,"reminders":true,"payment_requests":true,"analytics":true,"timeline":true,"quote_intake":true,"quotes":true,"deposits":true,"multi_user":true,"dispatch_board":true,"ai_insights":true,"team_calendar":true,"workflows":true,"zapier":true,"web_chat":true}'),
  ('elite', 1500, 8, 15000, 1000, 25, 3, 50, 50, 180, 20, 2,
   '{"crm_basic":true,"booking":true,"cancel_reschedule":true,"transfer":true,"gcal":true,"call_summaries":true,"review_requests":true,"missed_call_recovery":true,"jobs":true,"lead_pipeline":true,"followup_campaigns":true,"reminders":true,"payment_requests":true,"analytics":true,"timeline":true,"quote_intake":true,"quotes":true,"deposits":true,"multi_user":true,"dispatch_board":true,"ai_insights":true,"team_calendar":true,"workflows":true,"zapier":true,"web_chat":true,"multi_location":true,"multi_number":true,"membership":true,"api_access":true,"advanced_automations":true}'),
  ('enterprise', 5000, 20, 50000, 5000, 100, 25, 100, 100, 365, 18, 2,
   '{"crm_basic":true,"booking":true,"cancel_reschedule":true,"transfer":true,"gcal":true,"call_summaries":true,"review_requests":true,"missed_call_recovery":true,"jobs":true,"lead_pipeline":true,"followup_campaigns":true,"reminders":true,"payment_requests":true,"analytics":true,"timeline":true,"quote_intake":true,"quotes":true,"deposits":true,"multi_user":true,"dispatch_board":true,"ai_insights":true,"team_calendar":true,"workflows":true,"zapier":true,"web_chat":true,"multi_location":true,"multi_number":true,"membership":true,"api_access":true,"advanced_automations":true}')
on conflict (plan) do update set
  monthly_minutes           = excluded.monthly_minutes,
  simultaneous_calls        = excluded.simultaneous_calls,
  monthly_sms               = excluded.monthly_sms,
  monthly_web_conversations = excluded.monthly_web_conversations,
  max_users                 = excluded.max_users,
  max_locations             = excluded.max_locations,
  max_workflows             = excluded.max_workflows,
  max_knowledge_sources     = excluded.max_knowledge_sources,
  transcript_retention_days = excluded.transcript_retention_days,
  overage_per_minute_cents  = excluded.overage_per_minute_cents,
  overage_per_sms_cents     = excluded.overage_per_sms_cents,
  feature_flags_json        = excluded.feature_flags_json;
