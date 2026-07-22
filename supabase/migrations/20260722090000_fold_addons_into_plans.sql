-- Fold 4 of the 6 add-ons into every plan for free (operator decision,
-- July 2026 — "greedy" pricing simplification).
--
-- omnichannel_chat, business_assistant, reputation_manager, and
-- call_intelligence all cost pennies to run (text-only LLM calls, or a
-- couple of SMS per job) — see src/lib/billing/addons.ts. Charging $19-39/mo
-- separately for each no longer made sense, so they're now included on
-- every real plan (not the locked-down 'none' row). outbound_assistant
-- keeps its own price — it's the one add-on with genuine usage-scaling
-- cost (it sends real SMS/voice campaigns) — and stays a paid add-on.
--
-- jsonb `||` merges in the new keys without disturbing anything already in
-- feature_flags_json for each tier.

update public.plan_limits
set feature_flags_json = feature_flags_json || '{
  "omnichannel_chat": true,
  "business_assistant": true,
  "reputation_manager": true,
  "call_intelligence": true
}'::jsonb
where plan in ('starter', 'growth', 'professional', 'elite', 'enterprise');
