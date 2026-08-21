# Which migrations are actually applied?

Migrations here are applied by pasting them into the **Supabase SQL editor**,
so there's no `schema_migrations` ledger to read — the only way to know what
landed is to look for the objects each one creates.

This page gives you two things: a read-only query that tells you exactly
what's missing, and copy-pastable SQL to fix anything that is.

Everything below is safe to run more than once.

---

## Step 1 — check what's missing (read-only, changes nothing)

Paste this whole block into the Supabase SQL editor and hit Run. You'll get one
row per migration, missing ones first.

```sql
with expected(migration, kind, marker) as (values
  ('20260630090000_lead_alerts_dispatch_eta',       'column',   'sms_settings.dispatch_confirmation_enabled'),
  ('20260630090000_lead_alerts_dispatch_eta',       'column',   'calls.staff_alerted_at'),
  ('20260702090000_weekly_report',                  'column',   'sms_settings.weekly_report_enabled'),
  ('20260703090000_webhooks',                       'table',    'webhook_endpoints'),
  ('20260704090000_email_channel',                  'column',   'sms_settings.email_inbound_token'),
  ('20260705100000_vehicle_intake_outbound_comms',  'column',   'calls.vehicle_make'),
  ('20260706090000_callback_ivr',                   'column',   'sms_settings.callback_ivr_enabled'),
  ('20260721090000_role_hardening',                 'function', 'app.guard_sms_settings_sensitive_fields'),
  ('20260721100000_retire_wizard_pricing_gate',     'gate',     'app.setup_complete'),
  ('20260722002751_roadside_form_integration',      'table',    'form_integrations'),
  ('20260722090000_fold_addons_into_plans',         'planflag', 'call_intelligence'),
  ('20260722100000_founder_offer',                  'column',   'subscriptions.founder_slot'),
  ('20260723090000_founder_slots_10',               'slots10',  'subscriptions_founder_slot_check'),
  ('20260724090000_transfer_target',                'column',   'businesses.transfer_enabled'),
  ('20260813090000_voice_handoffs_and_pronunciations','table',  'voice_handoffs'),
  ('20260821090000_business_ai_notes',              'column',   'businesses.ai_notes')
)
select
  case when present then 'applied' else '>>> MISSING <<<' end as status,
  migration,
  marker as detected_by
from (
  select e.*,
    case e.kind
      when 'column' then exists (
        select 1 from information_schema.columns c
        where c.table_schema = 'public'
          and c.table_name  = split_part(e.marker, '.', 1)
          and c.column_name = split_part(e.marker, '.', 2))
      when 'table' then to_regclass('public.' || e.marker) is not null
      when 'function' then exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = split_part(e.marker, '.', 1)
          and p.proname = split_part(e.marker, '.', 2))
      -- This one REPLACES a function that already existed, so we can't just
      -- check the name — we check that the old pricing gate is gone from its body.
      when 'gate' then not exists (
        select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'app' and p.proname = 'setup_complete'
          and pg_get_functiondef(p.oid) like '%pricing_approved_at%')
      -- Data-only migration: look for the flag it writes.
      when 'planflag' then exists (
        select 1 from public.plan_limits
        where plan = 'starter' and jsonb_exists(feature_flags_json, e.marker))
      -- Constraint widened from 5 slots to 10.
      when 'slots10' then exists (
        select 1 from pg_constraint
        where conname = e.marker and pg_get_constraintdef(oid) like '%10%')
    end as present
  from expected e
) t
order by present nulls first, migration;
```

**Reading the result:** `applied` means the object is there. `>>> MISSING <<<`
means paste that migration's file from `supabase/migrations/` (or use Step 2
below for the two most likely ones).

One caveat on `20260721100000_retire_wizard_pricing_gate`: it rewrites a
function that already existed, so it's detected by whether the old pricing gate
is *absent* from the function body. That's reliable, but it's an inference
rather than a direct sighting.

---

## Step 2 — apply what's missing

Both blocks are idempotent (`if not exists` everywhere), so running one that's
already applied does nothing and errors nothing. If you're unsure, just run it.

### A. `20260821090000_business_ai_notes` — needed by the current branch

Adds the free-text "extra instructions for your AI" field. The demo line uses
it for the demo disclosure; every business gets the field in Settings.

```sql
alter table public.businesses
  add column if not exists ai_notes text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'businesses_ai_notes_check'
  ) then
    alter table public.businesses
      add constraint businesses_ai_notes_check
      check (ai_notes is null or char_length(ai_notes) <= 2000);
  end if;
end $$;

comment on column public.businesses.ai_notes is
  'Free-text owner context appended to the voice prompt, after (and subordinate to) the absolute rules. Null = nothing is added and the prompt is unchanged.';
```

Null is the default, and the prompt builder emits nothing when it's null — so
this changes no existing agent's prompt and triggers no re-sync.

### B. `20260630090000_lead_alerts_dispatch_eta` — check this one

This is the one whose status was uncertain. It powers the deterministic staff
lead-alert backstop and the dispatch/ETA confirmation text. The original file
uses plain `add column`, which errors if it was already applied — this version
won't.

```sql
alter table public.calls
  add column if not exists staff_alerted_at     timestamptz,
  add column if not exists dispatch_eta_sent_at timestamptz;

alter table public.sms_settings
  add column if not exists dispatch_confirmation_enabled boolean not null default true,
  add column if not exists dispatch_confirmation_template text not null default
    'Thanks {name}! {business} is on the way. Estimated arrival: {eta}. We''ll call if anything changes. Reply STOP to opt out.',
  add column if not exists eta_base_minutes    integer not null default 60,
  add column if not exists eta_per_job_minutes integer not null default 30;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'sms_settings_eta_base_minutes_check') then
    alter table public.sms_settings add constraint sms_settings_eta_base_minutes_check
      check (eta_base_minutes between 0 and 1440);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'sms_settings_eta_per_job_minutes_check') then
    alter table public.sms_settings add constraint sms_settings_eta_per_job_minutes_check
      check (eta_per_job_minutes between 0 and 240);
  end if;
end $$;
```

No grant changes are needed for either block: adding a column to an existing
table inherits that table's grants and RLS policies.

---

## Step 3 — re-run the check

Paste the Step 1 query again. Everything should read `applied`.

Then, for the demo line specifically:

```
node scripts/seed-demo-business.mjs            # dry run, shows what would change
node scripts/seed-demo-business.mjs --confirm  # apply
node scripts/demo-verify.mjs                   # health check
```

`scripts/prelaunch-check.mjs` also verifies schema, but it only covers the
tables it was written for — the query above is the wider net.
