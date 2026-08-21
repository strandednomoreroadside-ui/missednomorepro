-- ════════════════════════════════════════════════════════════════
-- businesses.ai_notes — free-text owner context appended to the voice
-- prompt.
--
-- Why: everything the AI knows is currently structured (services, hours,
-- FAQs, pricing rules). That covers the common cases, but there was no way
-- to tell the receptionist something that isn't a Q&A pair — "we don't work
-- on oil furnaces", "always mention the maintenance plan", or, for the
-- public demo line, "be upfront that this is a demonstration if someone
-- genuinely tries to hire us."
--
-- Guardrails: the notes are appended AFTER the numbered absolute rules and
-- explicitly framed as never overriding them, so an owner can't use this
-- field to talk the AI into inventing prices (master plan §5.1). It is
-- owner-supplied context, not instructions that can widen what the AI may
-- do. Length is capped so a runaway paste can't blow up every prompt.
--
-- Null is the default and the existing state for every business, and the
-- prompt builder emits nothing at all when it's null — so this migration
-- does not change any live agent's prompt or its hash, and triggers no
-- re-sync churn.
-- ════════════════════════════════════════════════════════════════

alter table public.businesses
  add column ai_notes text
    check (ai_notes is null or char_length(ai_notes) <= 2000);

-- No RLS/grant changes needed: businesses is already member-managed, and
-- this column rides the existing policies.
