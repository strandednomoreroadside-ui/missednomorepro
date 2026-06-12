-- ════════════════════════════════════════════════════════════════
-- M4: Setup wizard — services, pricing rules, service areas, hours,
-- staff contacts, SMS settings, FAQs, setup state + launch gating.
-- Master plan Phase 3 (Tickets 14–20), §8.5 (schema), §9 (security).
--
-- Design notes:
--   * Every table is tenant-owned: tenant_id + RLS via app.is_member.
--   * Composite FKs (id, tenant_id) make it impossible to attach a
--     child row to another tenant's parent — even with a leaked UUID.
--   * setup_states tracks wizard progress + the three explicit owner
--     approvals (pricing, hours, service area). Approval columns are
--     writable ONLY through SECURITY DEFINER functions (audit-logged);
--     direct UPDATE on setup_states is not granted to authenticated.
--   * Launch gate is enforced in the database: a trigger blocks
--     businesses.status -> 'live' unless app.setup_complete() passes,
--     so no client or API path can skip the wizard.
--   * Editing pricing/hours/service-area data resets its approval —
--     "explicit approval" always refers to the data as it is now.
-- ════════════════════════════════════════════════════════════════

-- Child tables reference businesses (id, tenant_id) so tenant match
-- is enforced by the database itself.
alter table public.businesses
  add constraint businesses_id_tenant_key unique (id, tenant_id);

-- ── Tables ─────────────────────────────────────────────────────

-- §8.5 services
create table public.services (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid not null,
  name        text not null check (char_length(name) between 1 and 120),
  description text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  unique (id, tenant_id)
);

create index services_tenant_idx on public.services (tenant_id);
create index services_business_idx on public.services (business_id);

-- §8.5 pricing_rules — MVP rule types only (flat / base fee). The
-- full pricing engine is post-MVP (Phase 9); do not extend early.
create table public.pricing_rules (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.organizations (id) on delete cascade,
  service_id              uuid not null,
  rule_type               text not null check (rule_type in ('flat', 'base_fee')),
  config_json             jsonb not null default '{}'::jsonb,
  requires_human_approval boolean not null default true,
  active                  boolean not null default true,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz,
  foreign key (service_id, tenant_id)
    references public.services (id, tenant_id) on delete cascade
);

create index pricing_rules_tenant_idx on public.pricing_rules (tenant_id);
create index pricing_rules_service_idx on public.pricing_rules (service_id);

-- §8.5 service_areas — MVP is a ZIP/city allowlist; radius/polygon
-- columns exist for forward compatibility but the wizard doesn't use
-- them yet.
create table public.service_areas (
  id              uuid not null primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.organizations (id) on delete cascade,
  business_id     uuid not null,
  type            text not null check (type in ('zip', 'city')),
  zip_code        text check (zip_code ~ '^[0-9]{5}$'),
  city            text,
  state           text,
  radius_miles    numeric,
  polygon_geojson jsonb,
  active          boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  check (
    (type = 'zip' and zip_code is not null)
    or (type = 'city' and city is not null)
  )
);

create index service_areas_tenant_idx on public.service_areas (tenant_id);
create index service_areas_business_idx on public.service_areas (business_id);

-- Weekly business hours: one row per weekday (0 = Sunday … 6 = Saturday).
create table public.business_hours (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid not null,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  closed      boolean not null default false,
  opens_at    time,
  closes_at   time,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  unique (business_id, day_of_week),
  check (closed or (opens_at is not null and closes_at is not null and opens_at < closes_at))
);

create index business_hours_tenant_idx on public.business_hours (tenant_id);

-- Staff who get notified about new leads/calls (SMS arrives at M8 —
-- until then alerts may be email/voice, but the numbers live here).
create table public.staff_contacts (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.organizations (id) on delete cascade,
  business_id    uuid not null,
  name           text not null check (char_length(name) between 1 and 120),
  phone          text not null check (phone ~ '^\+1[0-9]{10}$'),
  notify_on_lead boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index staff_contacts_tenant_idx on public.staff_contacts (tenant_id);

-- Tenant-level SMS consent posture. The hard consent enforcement
-- (per-contact opt-in/opt-out, STOP/HELP) ships at M8 — these are the
-- business's defaults that the AI and M8 tooling will obey.
create table public.sms_settings (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.organizations (id) on delete cascade,
  business_id           uuid not null unique,
  ask_consent_on_call   boolean not null default true,
  consent_script        text not null default 'Is it okay if we text you updates about your service request? Reply STOP anytime to opt out.',
  transactional_only    boolean not null default true,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index sms_settings_tenant_idx on public.sms_settings (tenant_id);

-- Wizard FAQs — question/answer pairs the AI may use on calls.
-- (The full knowledge base with imports/embeddings is Phase 5, parked.)
create table public.faqs (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid not null,
  question    text not null check (char_length(question) between 1 and 300),
  answer      text not null check (char_length(answer) between 1 and 2000),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index faqs_tenant_idx on public.faqs (tenant_id);
create index faqs_business_idx on public.faqs (business_id);

-- Wizard progress + the three explicit approvals. One row per
-- business, created automatically by trigger when the business is.
create table public.setup_states (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.organizations (id) on delete cascade,
  business_id         uuid not null unique,
  current_step        text not null default 'profile',
  pricing_approved_at timestamptz,
  pricing_approved_by uuid references auth.users (id) on delete set null,
  hours_approved_at   timestamptz,
  hours_approved_by   uuid references auth.users (id) on delete set null,
  area_approved_at    timestamptz,
  area_approved_by    uuid references auth.users (id) on delete set null,
  launched_at         timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index setup_states_tenant_idx on public.setup_states (tenant_id);

-- ── updated_at triggers ────────────────────────────────────────

create trigger services_updated_at
  before update on public.services
  for each row execute function app.set_updated_at();

create trigger pricing_rules_updated_at
  before update on public.pricing_rules
  for each row execute function app.set_updated_at();

create trigger service_areas_updated_at
  before update on public.service_areas
  for each row execute function app.set_updated_at();

create trigger business_hours_updated_at
  before update on public.business_hours
  for each row execute function app.set_updated_at();

create trigger staff_contacts_updated_at
  before update on public.staff_contacts
  for each row execute function app.set_updated_at();

create trigger sms_settings_updated_at
  before update on public.sms_settings
  for each row execute function app.set_updated_at();

create trigger faqs_updated_at
  before update on public.faqs
  for each row execute function app.set_updated_at();

create trigger setup_states_updated_at
  before update on public.setup_states
  for each row execute function app.set_updated_at();

-- ── Auto-create setup_states with each business ────────────────

create or replace function app.create_setup_state()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  insert into public.setup_states (tenant_id, business_id)
  values (new.tenant_id, new.id)
  on conflict (business_id) do nothing;
  return new;
end;
$$;

create trigger businesses_create_setup_state
  after insert on public.businesses
  for each row execute function app.create_setup_state();

-- Backfill any businesses that already exist.
insert into public.setup_states (tenant_id, business_id)
select b.tenant_id, b.id from public.businesses b
on conflict (business_id) do nothing;

-- ── Approval resets: edit the data, lose the stamp ─────────────
-- Pricing/hours/service-area approval refers to the data as approved.
-- Any change to those tables clears the matching approval, forcing a
-- fresh look before (re)launch.

create or replace function app.reset_pricing_approval()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  svc uuid;
  biz uuid;
begin
  -- OLD/NEW are unassigned (not null) outside their trigger events.
  if tg_op = 'DELETE' then
    svc := old.service_id;
  else
    svc := new.service_id;
  end if;
  select s.business_id into biz from public.services s where s.id = svc;
  update public.setup_states
    set pricing_approved_at = null, pricing_approved_by = null
    where business_id = biz and pricing_approved_at is not null;
  return null;
end;
$$;

create trigger pricing_rules_reset_approval
  after insert or update or delete on public.pricing_rules
  for each row execute function app.reset_pricing_approval();

-- The services list is the basis of pricing: adding/removing/renaming
-- a service also voids the pricing approval.
create or replace function app.reset_pricing_approval_for_business()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  biz uuid;
begin
  if tg_op = 'DELETE' then
    biz := old.business_id;
  else
    biz := new.business_id;
  end if;
  update public.setup_states
    set pricing_approved_at = null, pricing_approved_by = null
    where business_id = biz and pricing_approved_at is not null;
  return null;
end;
$$;

create trigger services_reset_pricing_approval
  after insert or update or delete on public.services
  for each row execute function app.reset_pricing_approval_for_business();

create or replace function app.reset_hours_approval()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  biz uuid;
begin
  if tg_op = 'DELETE' then
    biz := old.business_id;
  else
    biz := new.business_id;
  end if;
  update public.setup_states
    set hours_approved_at = null, hours_approved_by = null
    where business_id = biz and hours_approved_at is not null;
  return null;
end;
$$;

create trigger business_hours_reset_approval
  after insert or update or delete on public.business_hours
  for each row execute function app.reset_hours_approval();

create or replace function app.reset_area_approval()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
declare
  biz uuid;
begin
  if tg_op = 'DELETE' then
    biz := old.business_id;
  else
    biz := new.business_id;
  end if;
  update public.setup_states
    set area_approved_at = null, area_approved_by = null
    where business_id = biz and area_approved_at is not null;
  return null;
end;
$$;

create trigger service_areas_reset_approval
  after insert or update or delete on public.service_areas
  for each row execute function app.reset_area_approval();

-- ── Launch gate ────────────────────────────────────────────────
-- The single source of truth for "is this business ready to go live".

create or replace function app.setup_complete(biz uuid)
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select
    -- profile + industry filled in
    exists (
      select 1 from public.businesses b
      where b.id = biz
        and b.name is not null
        and b.industry is not null
        and b.phone is not null
        and b.timezone is not null
    )
    -- at least one active service
    and exists (
      select 1 from public.services s
      where s.business_id = biz and s.active
    )
    -- every active service has an active pricing rule
    and not exists (
      select 1 from public.services s
      where s.business_id = biz and s.active
        and not exists (
          select 1 from public.pricing_rules p
          where p.service_id = s.id and p.active
        )
    )
    -- at least one active service-area entry
    and exists (
      select 1 from public.service_areas a
      where a.business_id = biz and a.active
    )
    -- hours saved for all 7 days, at least one day open
    and (
      select count(*) = 7 and bool_or(not h.closed)
      from public.business_hours h
      where h.business_id = biz
    )
    -- someone to notify
    and exists (
      select 1 from public.staff_contacts c
      where c.business_id = biz and c.notify_on_lead
    )
    -- SMS consent settings reviewed (row exists)
    and exists (
      select 1 from public.sms_settings m
      where m.business_id = biz
    )
    -- the three explicit owner approvals
    and exists (
      select 1 from public.setup_states st
      where st.business_id = biz
        and st.pricing_approved_at is not null
        and st.hours_approved_at is not null
        and st.area_approved_at is not null
    );
$$;

-- Only definer-context callers (the gate trigger, launch RPC) need it.
revoke all on function app.setup_complete(uuid) from public;

-- Database-level backstop: no path (app, API, SQL editor with the
-- authenticated role) can flip a business live without a complete,
-- approved setup.
create or replace function app.enforce_launch_gate()
returns trigger
language plpgsql security definer
set search_path = ''
as $$
begin
  if new.status = 'live' and old.status is distinct from 'live'
     and not app.setup_complete(new.id) then
    raise exception 'setup incomplete: finish the setup wizard and approve pricing, hours, and service area before launching';
  end if;
  return new;
end;
$$;

create trigger businesses_launch_gate
  before update of status on public.businesses
  for each row execute function app.enforce_launch_gate();

-- ── Wizard RPCs (definer; validated + audit-logged) ────────────

-- Progress save: any member may move the bookmark.
create or replace function public.save_setup_progress(biz uuid, step text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  org uuid;
begin
  select b.tenant_id into org from public.businesses b where b.id = biz;
  if org is null or not app.is_member(org) then
    raise exception 'not a member of this business''s organization';
  end if;
  if step not in ('profile', 'industry', 'services', 'pricing', 'service-area',
                  'hours', 'notifications', 'sms', 'faqs', 'launch') then
    raise exception 'unknown wizard step: %', step;
  end if;
  update public.setup_states set current_step = step where business_id = biz;
end;
$$;

-- Explicit approvals: owners/admins only.
create or replace function public.approve_setup_section(biz uuid, section text)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  org uuid;
  uid uuid;
begin
  uid := (select auth.uid());
  select b.tenant_id into org from public.businesses b where b.id = biz;
  if org is null or not app.has_role(org, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can approve setup sections';
  end if;

  if section = 'pricing' then
    update public.setup_states
      set pricing_approved_at = now(), pricing_approved_by = uid
      where business_id = biz;
  elsif section = 'hours' then
    update public.setup_states
      set hours_approved_at = now(), hours_approved_by = uid
      where business_id = biz;
  elsif section = 'area' then
    update public.setup_states
      set area_approved_at = now(), area_approved_by = uid
      where business_id = biz;
  else
    raise exception 'unknown approval section: %', section;
  end if;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id, metadata)
  values (org, uid, 'setup.section_approved', 'business', biz::text,
          jsonb_build_object('section', section));
end;
$$;

-- Launch: owners/admins only; the gate trigger re-validates anyway.
create or replace function public.launch_business(biz uuid)
returns void
language plpgsql security definer
set search_path = ''
as $$
declare
  org uuid;
  uid uuid;
begin
  uid := (select auth.uid());
  select b.tenant_id into org from public.businesses b where b.id = biz;
  if org is null or not app.has_role(org, array['owner', 'admin']) then
    raise exception 'only the owner or an admin can launch';
  end if;
  if not app.setup_complete(biz) then
    raise exception 'setup incomplete: finish the setup wizard and approve pricing, hours, and service area before launching';
  end if;

  update public.businesses set status = 'live' where id = biz;
  update public.setup_states set launched_at = now() where business_id = biz;

  insert into public.audit_logs (tenant_id, actor_user_id, action, entity_type, entity_id)
  values (org, uid, 'business.launched', 'business', biz::text);
end;
$$;

revoke all on function public.save_setup_progress(uuid, text) from public;
revoke all on function public.approve_setup_section(uuid, text) from public;
revoke all on function public.launch_business(uuid) from public;
grant execute on function public.save_setup_progress(uuid, text) to authenticated;
grant execute on function public.approve_setup_section(uuid, text) to authenticated;
grant execute on function public.launch_business(uuid) to authenticated;

-- ── Row Level Security ─────────────────────────────────────────

alter table public.services enable row level security;
alter table public.pricing_rules enable row level security;
alter table public.service_areas enable row level security;
alter table public.business_hours enable row level security;
alter table public.staff_contacts enable row level security;
alter table public.sms_settings enable row level security;
alter table public.faqs enable row level security;
alter table public.setup_states enable row level security;

-- Members fully manage their tenant's wizard data (these are the
-- editable lists in the wizard, so delete is intentionally allowed).
create policy "members manage their services"
  on public.services for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their pricing rules"
  on public.pricing_rules for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their service areas"
  on public.service_areas for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their business hours"
  on public.business_hours for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their staff contacts"
  on public.staff_contacts for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their sms settings"
  on public.sms_settings for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

create policy "members manage their faqs"
  on public.faqs for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- setup_states: members READ ONLY. All writes go through the RPCs
-- above (or triggers), so approval stamps can't be forged.
create policy "members read their setup state"
  on public.setup_states for select to authenticated
  using (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────

grant select, insert, update, delete
  on public.services, public.pricing_rules, public.service_areas,
     public.business_hours, public.staff_contacts, public.sms_settings,
     public.faqs, public.setup_states
  to service_role;

grant select, insert, update, delete
  on public.services, public.pricing_rules, public.service_areas,
     public.business_hours, public.staff_contacts, public.sms_settings,
     public.faqs
  to authenticated;

grant select on public.setup_states to authenticated;
