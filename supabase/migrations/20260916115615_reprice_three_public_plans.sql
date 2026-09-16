-- Align enforced monthly voice allowances with the September 2026
-- three-tier public pricing. Elite remains in the catalog only for legacy
-- subscriptions; it is no longer offered on the public pricing surface.
update public.plan_limits
set monthly_minutes = case plan
  when 'starter' then 200
  when 'growth' then 400
  when 'professional' then 800
  else monthly_minutes
end
where plan in ('starter', 'growth', 'professional');
