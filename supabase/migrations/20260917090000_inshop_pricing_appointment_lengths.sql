-- In-shop pricing + time-based appointment scheduling.
--
-- In-shop pricing needs no schema: businesses customers visit (salons, shops,
-- studios) are detected from businesses.industry, and the quote engine skips
-- the distance-based dispatch fee for them.
--
-- Appointment lengths:
--   * service_pricing.duration_minutes  - how long this service takes. The AI
--     only offers start times where the whole service fits, and books the
--     appointment for that length. Null = use the business default.
--   * businesses.appointment_minutes    - default length when a caller's
--     service has no duration set (the old hard-coded 60).
--   * businesses.booking_interval_minutes - spacing of offered start times
--     (the old hard-coded 30).
--   * businesses.booking_buffer_minutes - gap kept clear between appointments
--     for cleanup or travel.
-- Defaults reproduce the previous behavior exactly, so existing businesses
-- book the same way until the owner changes something.
--
-- Grants: service_pricing and businesses already have table-level
-- select/insert/update grants for members, which cover new columns.

alter table public.service_pricing
  add column if not exists duration_minutes integer
    check (duration_minutes between 5 and 720);

comment on column public.service_pricing.duration_minutes is
  'Appointment length for this service in minutes. Null = business default (businesses.appointment_minutes).';

alter table public.businesses
  add column if not exists appointment_minutes integer not null default 60
    check (appointment_minutes between 15 and 720),
  add column if not exists booking_interval_minutes integer not null default 30
    check (booking_interval_minutes in (10, 15, 20, 30, 60)),
  add column if not exists booking_buffer_minutes integer not null default 0
    check (booking_buffer_minutes between 0 and 120);

comment on column public.businesses.appointment_minutes is
  'Default appointment length (minutes) when the booked service has no duration.';
comment on column public.businesses.booking_interval_minutes is
  'Spacing between offered appointment start times (minutes).';
comment on column public.businesses.booking_buffer_minutes is
  'Minutes kept free between appointments.';
