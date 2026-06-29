-- ════════════════════════════════════════════════════════════════
-- Email channel — the AI receptionist as a third channel of the
-- Omnichannel add-on (web + SMS + EMAIL), reusing the §10 tool brain
-- (src/lib/voice/tools) and the existing conversations / inbox.
--
-- Model (operator decisions, June 2026):
--   * "Forward your inbox": a business forwards its info@theirdomain.com
--     to a unique token address {token}@inbound.missednomorepro.com.
--     A Cloudflare Email Worker forwards the raw message to
--     /api/email/inbound; we resolve the tenant from the token (server
--     side, never from the email body) and the customer from the
--     original sender.
--   * Auto-reply: the AI replies on its own (same §5.1 guardrails as
--     SMS / web), delivered via Resend. Staff can take over any thread
--     from the Inbox.
--   * Gated by the omnichannel_chat add-on (tenant_addons), like web/SMS.
--
-- Tenancy unchanged from Phase 10: conversations + conversation_messages
-- are SERVER-written (service role). Members READ + may take over /
-- close / reassign + post a 'staff' reply. Bodies stay encrypted at rest
-- with a redacted display copy (§9).
-- ════════════════════════════════════════════════════════════════

-- ── conversations: allow the 'email' channel + email identity ──────
alter table public.conversations
  drop constraint if exists conversations_channel_check;
alter table public.conversations
  add constraint conversations_channel_check
  check (channel in ('web', 'sms', 'email'));

alter table public.conversations
  add column if not exists customer_email text,
  -- The email subject, kept on the thread so replies keep "Re: …".
  add column if not exists subject text;

-- One OPEN email thread per (tenant, customer email) — mirrors the
-- per-channel dedup indexes for sms/web. Partial so a closed thread
-- never blocks a fresh one.
create unique index if not exists conversations_open_email_idx
  on public.conversations (tenant_id, lower(customer_email))
  where channel = 'email' and status = 'open';

-- ── conversation_messages: provider id for idempotency + threading ─
-- The inbound email's Message-ID. We dedupe on it (Cloudflare/Worker can
-- retry) and use it as In-Reply-To when the AI replies, so the customer's
-- mail client threads our reply under their email.
alter table public.conversation_messages
  add column if not exists external_id text;

create index if not exists conversation_messages_external_idx
  on public.conversation_messages (tenant_id, external_id)
  where external_id is not null;

-- ── email settings (on sms_settings, one row per business) ─────────
alter table public.sms_settings
  add column if not exists email_inbound_enabled boolean not null default false,
  -- The forward-to token. Customers' mail is forwarded to
  -- {email_inbound_token}@inbound.missednomorepro.com; we also set it as
  -- the Reply-To so their replies route back to us. Random, per-business,
  -- rotatable — the email analogue of widget_key. Backfilled below.
  add column if not exists email_inbound_token text,
  -- Optional sign-off appended to AI/staff email replies.
  add column if not exists email_signature text;

-- Backfill a token for every existing settings row (and enforce uniqueness).
update public.sms_settings
  set email_inbound_token = replace(gen_random_uuid()::text, '-', '')
  where email_inbound_token is null;

create unique index if not exists sms_settings_email_token_idx
  on public.sms_settings (email_inbound_token)
  where email_inbound_token is not null;

-- No new tables → no new RLS/grants. The added columns live on tables that
-- already have policies + explicit grants (conversations,
-- conversation_messages, sms_settings) from M5/M8/Phase 10.
