-- ════════════════════════════════════════════════════════════════
-- Weekly value email (Later backlog — retention).
--
-- Each Monday we email the owner a recap of what their AI did for them
-- (calls answered, leads, bookings, missed-calls recovered, $ collected).
-- Call Intelligence add-on holders also get the AI-written digest. Sent via
-- the existing daily cron (Monday gate), reusing Resend + computeMetrics.
--
-- This adds the per-business opt-out. Default ON; members already read +
-- manage their own sms_settings (RLS), and the email's one-click
-- unsubscribe flips this column to false via the service role.
-- ════════════════════════════════════════════════════════════════

alter table public.sms_settings
  add column weekly_report_enabled boolean not null default true;
