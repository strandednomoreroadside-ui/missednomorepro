-- Roadside website contact form integration.
--
-- WordPress sends accepted service-request submissions to the app over a
-- server-to-server webhook. The app resolves tenant/business from a private
-- token hash, then records each submission in this ingestion ledger before
-- writing CRM, inbox, and SMS side effects.

create table public.form_integrations (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.organizations (id) on delete cascade,
  business_id uuid not null,
  name        text not null check (char_length(name) between 1 and 120),
  source      text not null default 'wordpress_service_request'
              check (source in ('wordpress_service_request')),
  key_hash    text not null unique check (key_hash ~ '^[a-f0-9]{64}$'),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  rotated_at  timestamptz,
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index form_integrations_tenant_idx
  on public.form_integrations (tenant_id, business_id);
create index form_integrations_active_hash_idx
  on public.form_integrations (key_hash)
  where active;

create table public.form_ingestion_events (
  id                           uuid primary key default gen_random_uuid(),
  tenant_id                    uuid not null references public.organizations (id) on delete cascade,
  business_id                  uuid not null,
  integration_id               uuid,
  submission_id                text not null check (char_length(submission_id) between 8 and 160),
  status                       text not null default 'processing'
                               check (status in ('processing', 'completed', 'failed')),
  contact_id                   uuid,
  lead_id                      uuid,
  note_id                      uuid,
  conversation_id              uuid,
  conversation_message_id      uuid,
  customer_sms_message_id      uuid,
  staff_alert_count            integer not null default 0 check (staff_alert_count >= 0),
  customer_confirmation_status text check (
    customer_confirmation_status in ('sent', 'blocked', 'failed', 'skipped')
  ),
  error_category               text,
  error_message                text,
  created_at                   timestamptz not null default now(),
  updated_at                   timestamptz,
  completed_at                 timestamptz,
  unique (tenant_id, submission_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (integration_id, tenant_id)
    references public.form_integrations (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null,
  foreign key (lead_id)
    references public.leads (id) on delete set null,
  foreign key (note_id)
    references public.customer_notes (id) on delete set null,
  foreign key (conversation_id, tenant_id)
    references public.conversations (id, tenant_id) on delete set null,
  foreign key (conversation_message_id)
    references public.conversation_messages (id) on delete set null,
  foreign key (customer_sms_message_id)
    references public.messages (id) on delete set null
);

create index form_ingestion_events_tenant_time_idx
  on public.form_ingestion_events (tenant_id, created_at desc);
create index form_ingestion_events_status_idx
  on public.form_ingestion_events (status, created_at desc);

create trigger form_ingestion_events_updated_at
  before update on public.form_ingestion_events
  for each row execute function app.set_updated_at();

alter table public.form_integrations enable row level security;
alter table public.form_ingestion_events enable row level security;

-- These tables are an internal credential store and webhook ledger. Keep them
-- service-role only; dashboard management can add a dedicated metadata view
-- later without ever exposing key_hash.
grant select, insert, update, delete
  on public.form_integrations, public.form_ingestion_events
  to service_role;
