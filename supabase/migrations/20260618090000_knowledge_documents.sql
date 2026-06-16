-- ════════════════════════════════════════════════════════════════
-- Knowledge Hub — document upload & extract.
--
-- The owner drops in a price sheet or FAQ document; we store the file in
-- a private Supabase Storage bucket, run an LLM extraction pass, and write
-- the result into an APPROVAL QUEUE (knowledge_suggestions). Nothing the
-- AI can speak is created automatically — the owner approves each item,
-- which then inserts a real, STRUCTURED row into faqs / service_pricing.
--
-- This preserves the §5.1 "AI never invents prices" rule + the §14
-- 0%-hallucination gate: extracted prices become structured rows that the
-- deterministic calculate_quote engine reads — never free text the LLM
-- reads back. (Service suggestions still require the owner to re-approve
-- pricing in /dashboard/pricing before quoting turns on.)
--
-- Tenancy follows the M2/M4 pattern: tenant_id + RLS via app.is_member,
-- composite (id, tenant_id) FKs, explicit grants. Members manage. The
-- original file is reachable only through the service role (server-side);
-- no client ever touches the storage bucket directly.
-- ════════════════════════════════════════════════════════════════

-- ── knowledge_documents: one row per uploaded file ─────────────
create table public.knowledge_documents (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  business_id  uuid not null,
  file_name    text not null check (char_length(file_name) between 1 and 255),
  storage_path text,
  mime_type    text,
  size_bytes   integer,
  -- uploaded → processing → extracted | failed
  status       text not null default 'uploaded'
               check (status in ('uploaded', 'processing', 'extracted', 'failed')),
  error        text,
  uploaded_by  uuid references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade
);

create index knowledge_documents_tenant_idx on public.knowledge_documents (tenant_id);
create index knowledge_documents_business_idx on public.knowledge_documents (business_id, created_at desc);

-- ── knowledge_suggestions: the approval queue ──────────────────
-- payload is structured JSON shaped per kind:
--   faq     → { question, answer }
--   service → { name, pricing_type, service_fee, hook_fee, per_mile_rate,
--               free_miles, variable_part }
create table public.knowledge_suggestions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.organizations (id) on delete cascade,
  business_id  uuid not null,
  document_id  uuid not null,
  kind         text not null check (kind in ('faq', 'service')),
  payload      jsonb not null,
  -- pending → approved | rejected
  status       text not null default 'pending'
               check (status in ('pending', 'approved', 'rejected')),
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz,
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (document_id, tenant_id)
    references public.knowledge_documents (id, tenant_id) on delete cascade
);

create index knowledge_suggestions_tenant_idx on public.knowledge_suggestions (tenant_id);
create index knowledge_suggestions_doc_idx on public.knowledge_suggestions (document_id);
create index knowledge_suggestions_pending_idx
  on public.knowledge_suggestions (business_id) where status = 'pending';

-- ── updated_at triggers ────────────────────────────────────────
create trigger knowledge_documents_updated_at
  before update on public.knowledge_documents
  for each row execute function app.set_updated_at();
create trigger knowledge_suggestions_updated_at
  before update on public.knowledge_suggestions
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_suggestions enable row level security;

create policy "members manage their knowledge documents"
  on public.knowledge_documents for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));
create policy "members manage their knowledge suggestions"
  on public.knowledge_suggestions for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- ── Table-level grants (explicit, per the M2 lesson) ───────────
grant select, insert, update, delete
  on public.knowledge_documents, public.knowledge_suggestions
  to service_role;
grant select, insert, update, delete
  on public.knowledge_documents, public.knowledge_suggestions
  to authenticated;

-- ── Private Storage bucket for the original files ──────────────
-- Locked down: no storage.objects policies for authenticated, so the only
-- access path is the server-side service-role client (admin.ts), which
-- bypasses RLS. Files are namespaced by tenant: {tenant_id}/{document_id}.
insert into storage.buckets (id, name, public)
values ('knowledge-docs', 'knowledge-docs', false)
on conflict (id) do nothing;
