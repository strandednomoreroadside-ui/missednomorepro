-- ════════════════════════════════════════════════════════════════
-- Phase 8 — customer payments (links / deposits / invoices) + LTV.
--
-- Staff (or, later, the AI) request a payment from a customer; we create a
-- Stripe Checkout payment link and text it. Stripe's webhook marks it paid.
-- The AI never takes card numbers — it only ever sends a hosted link.
--
-- Lifetime value (the LTV slice of the vision) is just the sum of a
-- contact's PAID payments — derived, no extra column.
--
-- Tenancy: members manage their payment requests; the paid/refunded status
-- is written by the signature-verified Stripe webhook (service role).
-- ════════════════════════════════════════════════════════════════

create table public.payments (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.organizations (id) on delete cascade,
  business_id           uuid not null,
  contact_id            uuid,
  job_id                uuid,
  kind                  text not null default 'payment'
                        check (kind in ('deposit', 'invoice', 'payment')),
  amount_cents          integer not null check (amount_cents > 0),
  currency              text not null default 'usd',
  description           text,
  status                text not null default 'pending'
                        check (status in ('pending', 'paid', 'canceled', 'refunded')),
  stripe_session_id     text,
  stripe_payment_intent text,
  payment_url           text,
  paid_at               timestamptz,
  created_by            uuid references auth.users (id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz,
  unique (id, tenant_id),
  foreign key (business_id, tenant_id)
    references public.businesses (id, tenant_id) on delete cascade,
  foreign key (contact_id, tenant_id)
    references public.contacts (id, tenant_id) on delete set null
);

create index payments_tenant_idx on public.payments (tenant_id, created_at desc);
create index payments_contact_idx on public.payments (contact_id);
create index payments_session_idx on public.payments (stripe_session_id);

create trigger payments_updated_at
  before update on public.payments
  for each row execute function app.set_updated_at();

-- ── Row Level Security ─────────────────────────────────────────
alter table public.payments enable row level security;

create policy "members manage their payments"
  on public.payments for all to authenticated
  using (app.is_member(tenant_id)) with check (app.is_member(tenant_id));

-- ── Grants (explicit) ──────────────────────────────────────────
grant select, insert, update, delete on public.payments to service_role;
grant select, insert, update, delete on public.payments to authenticated;
