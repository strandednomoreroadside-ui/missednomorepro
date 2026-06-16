-- ════════════════════════════════════════════════════════════════
-- Appointment reminders (roadmap item #3, part 1).
--
-- A daily Vercel Cron hits /api/cron/reminders, which finds confirmed
-- appointments coming up within each business's reminder lead time and
-- texts the customer once. Routed through sendCustomerSms so STOP always
-- wins and every text is logged (transactional — they booked with us).
--
-- Cost/margin note: ONE reminder per appointment, idempotent via
-- appointments.reminder_sent_at, so we never double-charge ourselves for
-- SMS. Daily cron works on the Vercel free tier; the endpoint is
-- frequency-agnostic, so bumping to hourly later just improves coverage.
-- ════════════════════════════════════════════════════════════════

-- ── sms_settings: reminder toggle, lead time, template ─────────
alter table public.sms_settings
  add column reminder_enabled    boolean not null default true,
  add column reminder_lead_hours integer not null default 24
    check (reminder_lead_hours between 1 and 168),
  add column reminder_template   text not null default
    'Reminder: your appointment with {business} is {time}. Need to change it? Just call us back. Reply STOP to opt out.';

-- ── appointments: idempotency stamp ────────────────────────────
-- Set once a reminder is sent (or terminally skipped) so the cron never
-- texts the same appointment twice.
alter table public.appointments
  add column reminder_sent_at timestamptz;

-- Partial index for the cron's hot query: upcoming, confirmed, not yet
-- reminded.
create index appointments_reminder_due_idx
  on public.appointments (starts_at)
  where status = 'confirmed' and reminder_sent_at is null;
