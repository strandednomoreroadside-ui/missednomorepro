-- ════════════════════════════════════════════════════════════════
-- Ph13: MMS photo intake + VIP.
--   * media_attachments: photos a customer texts in (inbound MMS) land
--     here, attached to their contact + the inbound message. The file lives
--     in a PRIVATE storage bucket reachable only via the service role; the
--     dashboard serves it through an auth-checked proxy (/api/media/[id]).
--   * VIP is just a contact tag (no schema needed) — auto-applied on a
--     loyalty threshold in jobs/actions.ts and toggleable in the CRM.
--
-- Conventions: tenant_id + RLS (members read; server writes), composite
-- (id, tenant_id) FKs, explicit grants. No new external service — reuses
-- the Twilio account creds (to fetch the media) + Supabase Storage.
-- ════════════════════════════════════════════════════════════════

create table public.media_attachments (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  business_id  uuid,
  contact_id   uuid,
  message_id   uuid,
  source       text not null default 'mms' check (source in ('mms')),
  content_type text,
  storage_path text,
  created_at   timestamptz not null default now(),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete set null,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete cascade
);

create index media_attachments_contact_time_idx
  on public.media_attachments (contact_id, created_at desc);
create index media_attachments_tenant_idx on public.media_attachments (tenant_id);

-- ── RLS ────────────────────────────────────────────────────────
alter table public.media_attachments enable row level security;

-- Members read their own; rows are written only by the server (the Twilio
-- webhook via the service role) — clients can't forge an attachment.
create policy "members read their media attachments"
  on public.media_attachments for select to authenticated
  using (app.is_member(tenant_id));

grant select, insert, update, delete on public.media_attachments to service_role;
grant select on public.media_attachments to authenticated;

-- ── Private Storage bucket for the photos ──────────────────────
-- No storage.objects policies for authenticated → only the service-role
-- client (admin.ts) can read/write. Files namespaced by tenant:
-- {tenant_id}/{attachment_id}.{ext}. Served via /api/media/[id].
insert into storage.buckets (id, name, public)
values ('mms-media', 'mms-media', false)
on conflict (id) do nothing;
