-- Narrow same-tenant role hardening.
--
-- Preserve the intentionally collaborative member permissions used by the
-- setup wizard, staff roster, and day-to-day SMS controls. Only protect the
-- settings and catalog mutations that the application already presents as
-- owner/admin-only.

-- Membership pages and server actions are manager-only. Keep catalog reads
-- available to members, but make direct PostgREST writes match that contract.
drop policy if exists "members manage their membership plans"
  on public.membership_plans;
drop policy if exists "members manage their customer memberships"
  on public.customer_memberships;

create policy "members read their membership plans"
  on public.membership_plans for select to authenticated
  using (app.is_member(tenant_id));
create policy "admins create membership plans"
  on public.membership_plans for insert to authenticated
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins update membership plans"
  on public.membership_plans for update to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']))
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins delete membership plans"
  on public.membership_plans for delete to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']));

create policy "members read their customer memberships"
  on public.customer_memberships for select to authenticated
  using (app.is_member(tenant_id));
create policy "admins create customer memberships"
  on public.customer_memberships for insert to authenticated
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins update customer memberships"
  on public.customer_memberships for update to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']))
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins delete customer memberships"
  on public.customer_memberships for delete to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']));

-- sms_settings intentionally contains member-editable operational controls,
-- so replacing its broad RLS policy would break existing workflows. A trigger
-- instead guards only manager/server-owned fields. Service-role work has no
-- auth.uid() and remains unaffected.
create or replace function app.guard_sms_settings_sensitive_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  sensitive_change boolean := false;
begin
  if tg_op = 'INSERT' then
    sensitive_change :=
      new.callback_ivr_enabled
      or new.callback_ivr_pin is not null
      or new.email_inbound_token is not null
      or new.widget_key is not null;
  else
    sensitive_change :=
      new.callback_ivr_enabled is distinct from old.callback_ivr_enabled
      or new.callback_ivr_pin is distinct from old.callback_ivr_pin
      or new.email_inbound_token is distinct from old.email_inbound_token
      or new.widget_key is distinct from old.widget_key;
  end if;

  if sensitive_change
     and (select auth.uid()) is not null
     and not app.has_role(new.tenant_id, array['owner', 'admin']) then
    raise exception 'only an owner or admin can change protected communication settings'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

revoke all on function app.guard_sms_settings_sensitive_fields() from public;
grant execute on function app.guard_sms_settings_sensitive_fields()
  to authenticated, service_role;

drop trigger if exists sms_settings_guard_sensitive_fields
  on public.sms_settings;
create trigger sms_settings_guard_sensitive_fields
  before insert or update on public.sms_settings
  for each row execute function app.guard_sms_settings_sensitive_fields();

