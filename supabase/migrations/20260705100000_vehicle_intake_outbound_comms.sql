-- Vehicle intake (Year/Make/Model) for roadside calls.
--
-- calls.vehicle_* is the vehicle for this specific call/visit (the source of
-- truth for dispatch). contacts.vehicle_* mirrors the most recently captured
-- vehicle as a convenience default for contact lookup.
--
-- Outbound calling/texting from the tenant's own number reuses existing
-- tables. calls.disposition has no CHECK constraint, so 'staff_call' works;
-- messages.kind already allows 'manual'. No new tables are required.

alter table public.calls
  add column vehicle_year  text,
  add column vehicle_make  text,
  add column vehicle_model text;

alter table public.contacts
  add column vehicle_year  text,
  add column vehicle_make  text,
  add column vehicle_model text;
