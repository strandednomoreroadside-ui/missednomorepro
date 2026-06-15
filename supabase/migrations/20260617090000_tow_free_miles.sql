-- ════════════════════════════════════════════════════════════════
-- Pricing tweak: free miles for towing. A tow's per-mile charge only
-- applies AFTER this many included miles (e.g. first 5 miles free, then
-- $2.50/mi). 0 = no free miles (the prior behavior). Applies to tow
-- services; ignored for flat services.
--
-- Table-level grants on service_pricing already cover new columns, so no
-- extra grant is needed.
-- ════════════════════════════════════════════════════════════════

alter table public.service_pricing
  add column free_miles numeric not null default 0 check (free_miles >= 0);
