-- Follow-up to 20260722100000_founder_offer.sql: the exclusion UPDATE there
-- matched zero rows — the email used (whether the original
-- strandednomoreroadside@gmail.com or the operator's edited
-- hello@missednomorepro.com) doesn't match any actual Supabase Auth user.
-- The only auth user in the project is strandednomorecle@gmail.com (the
-- login already tied to the live business's Google Calendar connection),
-- so that's the real owner account to exclude. Idempotent — safe to run
-- even if founder_excluded is already true.

update public.organizations o
set founder_excluded = true
from public.organization_members m
join auth.users u on u.id = m.user_id
where m.organization_id = o.id
  and m.role = 'owner'
  and u.email = 'strandednomorecle@gmail.com';
