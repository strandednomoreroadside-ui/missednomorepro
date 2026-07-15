-- ════════════════════════════════════════════════════════════════
-- Vehicle intake (Year/Make/Model) for roadside calls.
--
-- calls.vehicle_* = the vehicle for THIS specific call/visit (source of
-- truth for dispatch — asked fresh every call, since a returning caller
-- may call about a different vehicle). contacts.vehicle_* mirrors the most
-- recently captured vehicle as a convenience default for lookup_contact.
--
-- Outbound calling/texting from the tenant's own number (the "compose SMS" /
-- "click-to-call" feature) reuses existing tables — calls.disposition
-- already has no CHECK constraint, so 'staff_call' just works; messages.kind
-- already allows 'manual'. No new tables needed for that part.
-- ════════════════════════════════════════════════════════════════

alter table public.calls
  add column vehicle_year  text,
  add column vehicle_make  text,
  add column vehicle_model text;

alter table public.contacts
  add column vehicle_year  text,
  add column vehicle_make  text,
  add column vehicle_model text;
