-- ════════════════════════════════════════════════════════════════
-- M3 billing migration — RE-RUNNABLE version of
-- supabase/migrations/20260612090000_billing.sql.
-- Use this when the original errors with "already exists": every
-- statement is idempotent, so it completes whatever is missing and
-- changes nothing that's already correct. Safe to run repeatedly.
-- ════════════════════════════════════════════════════════════════

-- ── Tables ─────────────────────────────────────────────────────

create table if not exists public.plan_limits (
  id                        uuid primary key default gen_random_uuid(),
  plan                      text not null unique,
  monthly_minutes           integer not null,
  simultaneous_calls        integer not null,
  monthly_sms               integer not null,
  monthly_web_conversations integer not null default 0,
  max_users                 integer not null,
  max_locations             integer not null,
  max_workflows             integer not null default 0,
  max_knowledge_sources     integer not null default 0,
  transcript_retention_days integer not null,
  feature_flags_json        jsonb not null default '{}'::jsonb,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz
);

create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  tenant_id              uuid not null unique references public.organizations (id) on delete cascade,
  stripe_customer_id     text,
  stripe_subscription_id text unique,
  plan                   text not null default 'none',
  billing_interval       text check (billing_interval in ('month', 'year')),
  status                 text not null default 'inactive',
  current_period_start   timestamptz,
  current_period_end     timestamptz,
  cancel_at_period_end   boolean not null default false,
  overage_enabled        boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz
);

create table if not exists public.usage_events (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.organizations (id) on delete cascade,
  event_type text not null,
  quantity   numeric not null default 1,
  unit       text,
  provider   text,
  source_id  text,
  billable   boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists usage_events_tenant_type_time_idx
  on public.usage_events (tenant_id, event_type, created_at desc);

create table if not exists public.stripe_webhook_events (
  id           text primary key,
  type         text not null,
  processed_at timestamptz not null default now()
);

-- ── updated_at triggers ────────────────────────────────────────

drop trigger if exists plan_limits_updated_at on public.plan_limits;
create trigger plan_limits_updated_at
  before update on public.plan_limits
  for each row execute function app.set_updated_at();

drop trigger if exists subscriptions_updated_at on public.subscriptions;
create trigger subscriptions_updated_at
  before update on public.subscriptions
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────

alter table public.plan_limits enable row level security;
alter table public.subscriptions enable row level security;
alter table public.usage_events enable row level security;
alter table public.stripe_webhook_events enable row level security;

drop policy if exists "authenticated read plan limits" on public.plan_limits;
create policy "authenticated read plan limits"
  on public.plan_limits for select
  to authenticated
  using (true);

drop policy if exists "members read their subscription" on public.subscriptions;
create policy "members read their subscription"
  on public.subscriptions for select
  to authenticated
  using (app.is_member(tenant_id));

drop policy if exists "members read their usage" on public.usage_events;
create policy "members read their usage"
  on public.usage_events for select
  to authenticated
  using (app.is_member(tenant_id));

-- stripe_webhook_events: no policies — service role only.

-- ── Grants (idempotent by nature) ──────────────────────────────

grant select, insert, update, delete
  on public.plan_limits, public.subscriptions,
     public.usage_events, public.stripe_webhook_events
  to service_role;

grant select on public.plan_limits to authenticated;
grant select on public.subscriptions to authenticated;
grant select on public.usage_events to authenticated;

-- ── Seed plan limits (master plan §6.1; idempotent upsert) ─────

insert into public.plan_limits
  (plan, monthly_minutes, simultaneous_calls, monthly_sms,
   monthly_web_conversations, max_users, max_locations, max_workflows,
   max_knowledge_sources, transcript_retention_days, feature_flags_json)
values
  ('none',    0,     0,  0,     0, 1,   1,  0,  0,   7,
   '{"booking":false,"quotes":false,"deposits":false,"jobs":false,"multi_location":false,"api_access":false,"provider_failover":false}'),
  ('answer',  500,   1,  1000,  0, 1,   1,  1,  3,   30,
   '{"booking":false,"quotes":false,"deposits":false,"jobs":false,"multi_location":false,"api_access":false,"provider_failover":false}'),
  ('book',    1500,  2,  3000,  0, 3,   1,  3,  5,   60,
   '{"booking":true,"quotes":false,"deposits":false,"jobs":false,"multi_location":false,"api_access":false,"provider_failover":false}'),
  ('revenue', 3000,  4,  7500,  0, 10,  1,  10, 10,  90,
   '{"booking":true,"quotes":true,"deposits":true,"jobs":true,"multi_location":false,"api_access":false,"provider_failover":false}'),
  ('scale',   6000,  8,  15000, 0, 25,  3,  25, 20,  180,
   '{"booking":true,"quotes":true,"deposits":true,"jobs":true,"multi_location":true,"api_access":true,"provider_failover":true}'),
  ('agency',  10000, 20, 30000, 0, 100, 10, 50, 50,  365,
   '{"booking":true,"quotes":true,"deposits":true,"jobs":true,"multi_location":true,"api_access":true,"provider_failover":true}')
on conflict (plan) do update set
  monthly_minutes           = excluded.monthly_minutes,
  simultaneous_calls        = excluded.simultaneous_calls,
  monthly_sms               = excluded.monthly_sms,
  monthly_web_conversations = excluded.monthly_web_conversations,
  max_users                 = excluded.max_users,
  max_locations             = excluded.max_locations,
  max_workflows             = excluded.max_workflows,
  max_knowledge_sources     = excluded.max_knowledge_sources,
  transcript_retention_days = excluded.transcript_retention_days,
  feature_flags_json        = excluded.feature_flags_json;
