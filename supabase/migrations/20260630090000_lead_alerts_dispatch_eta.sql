-- ════════════════════════════════════════════════════════════════
-- Reliable lead alerts + dispatch confirmation/ETA (post-launch flaws).
--
-- (1) Lead-alert texts regressed: the staff "new lead" text was only sent
--     when the AI chose to call notify_staff, and as the prompt grew the AI
--     began skipping it on booked/quoted calls. We now ALSO fire a
--     deterministic staff alert at call-end (finalize.ts) for any lead the
--     AI didn't already alert on. staff_alerted_at is the first-writer-wins
--     idempotency stamp so webhook retries never double-text.
--
-- (2) Immediate "come now" dispatches now text the CUSTOMER a confirmation
--     with a rough arrival ETA (60 min base + 30 min per open job ahead of
--     them today — both tunable per business). dispatch_eta_sent_at dedupes
--     to one job + one text per call.
-- ════════════════════════════════════════════════════════════════

-- ── calls: dedupe stamps (server-written; first-writer-wins) ───
alter table public.calls
  add column staff_alerted_at     timestamptz,
  add column dispatch_eta_sent_at timestamptz;

-- ── sms_settings: dispatch confirmation + ETA tuning ───────────
alter table public.sms_settings
  add column dispatch_confirmation_enabled boolean not null default true,
  add column dispatch_confirmation_template text not null default
    'Thanks {name}! {business} is on the way. Estimated arrival: {eta}. We''ll call if anything changes. Reply STOP to opt out.',
  add column eta_base_minutes    integer not null default 60
    check (eta_base_minutes between 0 and 1440),
  add column eta_per_job_minutes integer not null default 30
    check (eta_per_job_minutes between 0 and 240);
