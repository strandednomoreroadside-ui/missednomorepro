-- Separate the WARM-TRANSFER target from the LEAD-ALERT contact.
--
-- Until now both came from the same lookup: the business's first
-- notify_on_lead staff contact. That conflated two different jobs —
--   * "text me when a lead comes in"  (async, low stakes)
--   * "ring my phone live, right now"  (synchronous, interrupts you)
-- — so the only way to stop a caller from ringing your personal phone was to
-- also turn off lead alerts. That's the wrong trade, and it's especially
-- wrong on a PUBLIC DEMO line, where strangers call to kick the tires and a
-- "can I talk to a person?" would ring the owner's cell.
--
-- Adds an explicit switch + an optional dedicated number. Defaults preserve
-- today's behavior exactly for every existing business:
--   transfer_enabled = true  and  transfer_number = null
--     -> falls back to the first notify_on_lead staff phone (unchanged)
--   transfer_number set
--     -> ring that number instead (e.g. a dispatch line, not a cell)
--   transfer_enabled = false
--     -> no live transfer at all. The AI takes a message and fires the
--        normal staff alert via escalate_to_human, so leads are never lost.
--
-- No new grants: adding columns to public.businesses inherits the table's
-- existing grants and RLS policies (same as the M10 ai_enabled/forward_number
-- columns).

alter table public.businesses
  add column if not exists transfer_enabled boolean not null default true,
  add column if not exists transfer_number  text;

comment on column public.businesses.transfer_enabled is
  'When false, the AI never warm-transfers a caller to a human; it takes a message and alerts staff instead. Lead alert texts are unaffected.';

comment on column public.businesses.transfer_number is
  'Explicit warm-transfer destination (E.164). When null and transfer_enabled is true, falls back to the first notify_on_lead staff contact.';
