-- ════════════════════════════════════════════════════════════════
-- Callback IVR — "call your own business number to place a call from it."
--
-- No app, no login: a staff member calls the business's own Twilio number
-- from their personal cell. If their caller ID matches a staff_contacts row
-- AND the business has this feature turned on, the inbound-voice webhook
-- intercepts the call BEFORE the AI ever answers, prompts for a PIN, then a
-- number to call, and bridges them — presenting the business number as
-- caller ID on the outbound leg. Falls through to the normal AI/greeting
-- path for anyone whose caller ID doesn't match a known staff number, so
-- real customers never see or hear this.
-- ════════════════════════════════════════════════════════════════

alter table public.sms_settings
  add column callback_ivr_enabled boolean not null default false,
  add column callback_ivr_pin     text;
