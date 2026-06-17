-- ════════════════════════════════════════════════════════════════
-- Ph11 + Ph12 (bundled): Dispatch/scheduling + Team (multi-user) & numbers.
--   * Ph11: assign work to a team member (jobs/appointments.assigned_to).
--   * Ph12: invite teammates into the org with a role (invitations +
--     accept_invitation RPC). Numbers reuse the existing phone_numbers.
--
-- Conventions kept: tenant_id + RLS via app.is_member / app.has_role,
-- composite FKs, explicit grants (the M2 lesson), SECURITY DEFINER RPC for
-- the one privileged write (joining an existing org) — mirrors
-- public.create_organization in 20260611210000_init_tenancy.sql.
-- ════════════════════════════════════════════════════════════════

-- ── Ph11: assignment ───────────────────────────────────────────
-- Who's doing the work. staff_contacts are the named team members the
-- business already texts (M4). on delete set null so removing a teammate
-- doesn't delete their jobs.
alter table public.jobs
  add column assigned_to uuid references public.staff_contacts (id) on delete set null;
alter table public.appointments
  add column assigned_to uuid references public.staff_contacts (id) on delete set null;

create index jobs_tenant_sched_idx on public.jobs (tenant_id, scheduled_for);

-- ── Ph12: invitations ──────────────────────────────────────────
create table public.invitations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  email       text not null,
  role        text not null default 'member' check (role in ('admin', 'member')),
  token       text not null unique,
  status      text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  invited_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default (now() + interval '7 days')
);

create index invitations_tenant_idx on public.invitations (tenant_id, status);
create index invitations_token_idx on public.invitations (token);

alter table public.invitations enable row level security;

-- Members read their tenant's invites; owners/admins manage them. Inserts/
-- updates from the app are owner/admin only (service role bypasses RLS).
create policy "members read their invitations"
  on public.invitations for select to authenticated
  using (app.is_member(tenant_id));
create policy "admins create invitations"
  on public.invitations for insert to authenticated
  with check (app.has_role(tenant_id, array['owner', 'admin']));
create policy "admins update invitations"
  on public.invitations for update to authenticated
  using (app.has_role(tenant_id, array['owner', 'admin']))
  with check (app.has_role(tenant_id, array['owner', 'admin']));

grant select, insert, update, delete on public.invitations to service_role;
grant select, insert, update on public.invitations to authenticated;

-- ── accept_invitation: the only client path into an existing org ─
-- SECURITY DEFINER so it can write organization_members (clients can't).
-- Validates a pending, unexpired token; adds the caller with the invite's
-- role (idempotent); marks the invite accepted. Returns the org id.
create or replace function public.accept_invitation(invite_token text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  inv public.invitations%rowtype;
  uid uuid;
begin
  uid := (select auth.uid());
  if uid is null then
    raise exception 'not authenticated';
  end if;

  select * into inv
    from public.invitations
    where token = invite_token
      and status = 'pending'
      and expires_at > now()
    limit 1;
  if inv.id is null then
    raise exception 'invitation is invalid or expired';
  end if;

  insert into public.organization_members (organization_id, user_id, role)
  values (inv.tenant_id, uid, inv.role)
  on conflict (organization_id, user_id) do nothing;

  update public.invitations set status = 'accepted' where id = inv.id;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id)
  values (inv.tenant_id, uid, 'organization.member_joined', 'invitation', inv.id::text);

  return inv.tenant_id;
end;
$$;

revoke all on function public.accept_invitation(text) from public;
revoke all on function public.accept_invitation(text) from anon;
grant execute on function public.accept_invitation(text) to authenticated;
