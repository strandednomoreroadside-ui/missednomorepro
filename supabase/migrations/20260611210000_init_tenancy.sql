-- ════════════════════════════════════════════════════════════════
-- M2: Tenancy foundation — organizations, members, businesses, audit
-- Master plan §8.1 (schema) + §9 (security requirements)
--
-- Security model:
--   * organization = the tenant; tenant_id on every tenant-owned table
--   * RLS enabled on every table; helpers in the `app` schema decide
--     membership server-side (SECURITY DEFINER, locked search_path)
--   * org creation goes through an atomic RPC so a user can never
--     create an org without becoming its owner (and it's audit-logged)
-- ════════════════════════════════════════════════════════════════

-- ── Helper schema ──────────────────────────────────────────────
create schema if not exists app;
grant usage on schema app to authenticated;

-- ── Tables ─────────────────────────────────────────────────────

create table public.organizations (
  id                  uuid primary key default gen_random_uuid(),
  name                text not null check (char_length(name) between 1 and 120),
  billing_customer_id text,
  plan                text not null default 'none',
  status              text not null default 'active'
                      check (status in ('active', 'suspended', 'canceled')),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz
);

create table public.organization_members (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null default 'member'
                  check (role in ('owner', 'admin', 'member')),
  created_at      timestamptz not null default now(),
  unique (organization_id, user_id)
);

create index organization_members_user_idx on public.organization_members (user_id);
create index organization_members_org_idx on public.organization_members (organization_id);

-- Businesses (locations) under an organization. tenant_id mirrors the
-- owning organization per master plan §8.1 so every tenant-owned table
-- carries the same column name.
create table public.businesses (
  id              uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations (id) on delete cascade,
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  name            text not null check (char_length(name) between 1 and 120),
  industry        text,
  phone           text,
  website_url     text,
  gbp_url         text,
  address         text,
  timezone        text not null default 'America/New_York',
  status          text not null default 'setup'
                  check (status in ('setup', 'live', 'paused')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  check (tenant_id = organization_id)
);

create index businesses_tenant_idx on public.businesses (tenant_id);

create table public.audit_logs (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.organizations (id) on delete cascade,
  actor_user_id uuid references auth.users (id) on delete set null,
  action        text not null,
  entity_type   text,
  entity_id     text,
  metadata      jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index audit_logs_tenant_time_idx on public.audit_logs (tenant_id, created_at desc);

-- ── Membership helpers (used by every RLS policy) ──────────────
-- SECURITY DEFINER so policy checks read organization_members without
-- recursing through its own RLS. search_path locked to ''.

create or replace function app.is_member(org uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
  );
$$;

create or replace function app.has_role(org uuid, roles text[])
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.organization_id = org
      and m.user_id = (select auth.uid())
      and m.role = any (roles)
  );
$$;

revoke all on function app.is_member(uuid) from public;
revoke all on function app.has_role(uuid, text[]) from public;
grant execute on function app.is_member(uuid) to authenticated;
grant execute on function app.has_role(uuid, text[]) to authenticated;

-- ── updated_at trigger ─────────────────────────────────────────

create or replace function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger organizations_updated_at
  before update on public.organizations
  for each row execute function app.set_updated_at();

create trigger businesses_updated_at
  before update on public.businesses
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────

alter table public.organizations enable row level security;
alter table public.organization_members enable row level security;
alter table public.businesses enable row level security;
alter table public.audit_logs enable row level security;

-- organizations: members read; owners/admins update; nobody inserts or
-- deletes directly (creation goes through the RPC below).
create policy "members read their organizations"
  on public.organizations for select
  to authenticated
  using (app.is_member(id));

create policy "owners and admins update their organizations"
  on public.organizations for update
  to authenticated
  using (app.has_role(id, array['owner', 'admin']))
  with check (app.has_role(id, array['owner', 'admin']));

-- organization_members: you can see your own memberships and the
-- member list of orgs you belong to. Mutations are server-side only
-- until the invite flow ships.
create policy "members read memberships of their orgs"
  on public.organization_members for select
  to authenticated
  using (user_id = (select auth.uid()) or app.is_member(organization_id));

-- businesses: members read and manage their own tenant's businesses.
create policy "members read their businesses"
  on public.businesses for select
  to authenticated
  using (app.is_member(tenant_id));

create policy "members create businesses in their tenant"
  on public.businesses for insert
  to authenticated
  with check (app.is_member(tenant_id));

create policy "members update their businesses"
  on public.businesses for update
  to authenticated
  using (app.is_member(tenant_id))
  with check (app.is_member(tenant_id));

-- audit_logs: members read their tenant's log. Writes happen only via
-- definer functions or the server's service role (which bypasses RLS).
create policy "members read their audit logs"
  on public.audit_logs for select
  to authenticated
  using (app.is_member(tenant_id));

-- ── Atomic organization creation ───────────────────────────────

create or replace function public.create_organization(org_name text)
returns uuid
language plpgsql security definer
set search_path = ''
as $$
declare
  new_org uuid;
  uid uuid;
begin
  uid := (select auth.uid());
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if org_name is null or char_length(trim(org_name)) < 1 or char_length(org_name) > 120 then
    raise exception 'organization name must be 1-120 characters';
  end if;

  insert into public.organizations (name)
  values (trim(org_name))
  returning id into new_org;

  insert into public.organization_members (organization_id, user_id, role)
  values (new_org, uid, 'owner');

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id)
  values (new_org, uid, 'organization.created', 'organization', new_org::text);

  return new_org;
end;
$$;

revoke all on function public.create_organization(text) from public;
revoke all on function public.create_organization(text) from anon;
grant execute on function public.create_organization(text) to authenticated;
