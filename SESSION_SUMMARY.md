# Session Summary — Missed No More Pro (June 29, 2026 · Email channel shipped + voice tuned)

**Shipped, committed, pushed, deployed, and verified.** The AI email channel is
live as a third channel of the Omnichannel add-on. Voice interruption sensitivity
tuned down one notch to 0.2 after a successful call test.

**Commits on `main`:**
- `ae1d9d1` — Email channel: AI receptionist over email (Omnichannel add-on)
- `540769d` — Voice: interruption_sensitivity 0.3 → 0.2 (TUNING_VERSION 4)

build ✅ · typecheck ✅ · deploy READY ✅ · migration applied ✅ · endpoint
verified (403 = live + secret auth working) ✅

---

## ▶ Next session — start here

**All code is live.** What's open is operator per-business setup + a real
end-to-end email test.

### Email channel — per-business activation (4 clicks)
1. **Billing:** Omnichannel AI Chat add-on (+$29) must be on for the business.
2. **Settings → AI Email:** flip "Answer emails with AI" on.
3. **Copy the forward address** shown on that card
   (`{token}@inbound.missednomorepro.com`).
4. **In your email account** (Gmail/Outlook/Zoho): set up auto-forwarding from
   the business inbox to that address. Test by emailing the token address directly.

### End-to-end email test
Send a customer-style email to the forwarded address (or the token address
directly) → confirm:
- Thread appears in **Inbox** with a Mail icon + subject.
- AI replies from the business name.
- Reply-To on the AI email is the token address so your reply routes back.
- Staff can "Take over" any thread from the Inbox.

### Voice: confirm 0.2 sensitivity
Place a call via "Hear your AI" (`/dashboard/numbers`) with some background
noise → the AI should not barge-interrupt mid-sentence but a clear spoken word
still interrupts it. The Retell agent re-syncs lazily on the first call after
the deploy (TUNING_VERSION 4 bump forces it).

### Migration reminder
`20260704090000_email_channel.sql` was applied this session. ✅

---

## What shipped this session

### 1. AI email channel (`ae1d9d1`)
The AI receptionist as a **third channel** of the Omnichannel add-on (web + SMS +
email), reusing the §10 tool brain + Phase-10 conversations/Inbox.

**Architecture (operator choice: "forward your inbox"):**
- Business forwards `info@theirdomain.com` to `{token}@inbound.missednomorepro.com`.
- **Cloudflare Email Worker** (`cloudflare/email-worker.js`, 15-line dumb
  forwarder) receives the mail and POSTs raw RFC-822 to `/api/email/inbound` with
  `x-email-secret` + `x-mnm-to` (envelope recipient = the token).
- Our app parses with **postal-mime**, resolves the tenant from the token (never
  the email body), runs `runChatTurn({channel:"email"})`, and replies via Resend
  from the **business name** (`replies@missednomorepro.com`).
- Reply-To is the token address so the customer's reply routes back to us.
  Threading headers (`In-Reply-To`/`References`) make the customer's mail client
  file our reply under their original email.

**Auto-reply guards** in `src/lib/email/inbound.ts` (the load-bearing email
safety layer): skips RFC-3834 auto-replies, `Precedence: bulk/list`, `List-*`
newsletters, no-reply/daemon senders, our own domain loops, auto-reply subjects,
and strips quoted reply history so the model reads only the new message.

**Voice path: byte-for-byte unchanged.** Channel widened across the chat brain
(conversation.ts, handle.ts, prompt.ts, engine.ts, handlers.ts).

**§5.1 intact:** same computed-price/booking guardrails as voice — the AI never
invents a price or books outside rules via email.

**Key files:**
- `supabase/migrations/20260704090000_email_channel.sql` — `conversations.channel`
  += `'email'`, `customer_email`/`subject`, open-thread unique index, `conversation_messages.external_id` (Message-ID idempotency), `sms_settings.{email_inbound_enabled, email_inbound_token (backfilled), email_signature}`
- `src/lib/email/inbound.ts` — MIME parse + auto-reply/loop guards + quote stripping
- `src/lib/email/conversation-email.ts` — Resend reply with identity + threading
- `src/app/api/email/inbound/route.ts` — secret-authed, idempotent, tenant from token
- `cloudflare/email-worker.js` + `cloudflare/wrangler.toml`
- `docs/email-channel-setup.md` — operator platform setup + per-customer guide
- Inbox: email threads (Mail icon, subject, `sendStaffEmail`)
- Settings: "AI Email" card (`updateEmailSettings`)
- `postal-mime` dep added

**Cloudflare setup (done this session, fully live):**
- `inbound.missednomorepro.com` MX → Cloudflare (3 route MX records) — **apex
  Zoho MX untouched** (verified twice via nslookup).
- Worker `mnm-email-inbound` deployed via `wrangler deploy` (auth via browser OAuth).
- Shared secret `MNM_INBOUND_SECRET` set via `wrangler secret put`.
- Zone catch-all rule → Worker set via Cloudflare API (dashboard SPA was unresponsive).
- **End-to-end proven:** test email `jdmgaming324@gmail.com → test@inbound.missednomorepro.com` appeared in Worker logs (`Ok`, 404 from app pre-deploy → 403 post-deploy with envs).

**Vercel envs (set this session):**
- `EMAIL_INBOUND_SECRET` = `794290925ae7145d0a4bc3d0d514b85c066929fe67ccd1f0`
- `EMAIL_INBOUND_DOMAIN` = `inbound.missednomorepro.com`
- `EMAIL_REPLY_FROM` = `replies@missednomorepro.com`
- Verified via `env pull` that secret exactly matches the Worker secret. ✅

**Margin: $0** — Cloudflare free + existing Resend; idempotent on Message-ID;
LLM text only. Folded into omnichannel_chat (+$29) add-on — no new Stripe price.

### 2. Voice sensitivity 0.3 → 0.2 (`540769d`)
Live call test confirmed speech is better but background barge-in still caught
at 0.3. One more notch: `INTERRUPTION_SENSITIVITY = 0.2` in `retell.ts`.
`TUNING_VERSION` 3 → 4 in `prompt.ts` forces agent re-sync on next call.

---

## Still open

### Operator live-tests to run (not code — just call/navigate)
- **Email end-to-end:** per-business setup above → test email → confirm AI reply
  + thread in Inbox.
- **Voice 0.2 sensitivity:** call with background noise → confirm no barge-in but
  clear voice still interrupts.
- **Lead text backstop:** a lead call where AI does NOT escalate → confirm staff
  "New lead" text fires (deterministic backstop added June 25).
- **Dispatch ETA:** urgent "come now" call → confirm customer gets confirmation +
  ETA text + job on dispatch board.
- **Self-serve number:** on a carded test tenant → `/dashboard/numbers` → search
  area code → Claim → AI answers a test call on it.
- **Dunning** (optional): force a failed renewal → confirm email + in-app banner.

### Supabase Pro hardening
Work through `docs/supabase-pro-hardening.md` (PITR, leaked-password protection,
SSL enforce, network restrictions, Advisor, spend cap). If Advisor flags anything,
send the item name → I fix in a migration.

### Red-team 25 calls
`RED_TEAM.md` — the 0%-pricing-hallucination gate. Should be run before scaling
demos. Updated for 5-zone/40-mi rules + `find_tow_destination`.

### Deferred features (later backlog)
- GBP auto-replies (blocked on Google verification)
- Native CRM connectors (Jobber/Housecall) + Zapier already shipped
- Multi-location (risky "first business" refactor, deferred)
- Customer membership plans (own recurring-billing feature)
- Sentry source maps (`SENTRY_AUTH_TOKEN` in Vercel → readable crash traces)
- Uptime monitor (free UptimeRobot on `/api/health`)

---

## Cross-cutting notes (unchanged)
- Push to `main` → Vercel auto-deploys; prompt/tool changes re-sync the live
  Retell agent lazily on the next call.
- Stripe stays **LIVE** in prod; `.env.local` stays **test**. (Memory: `stripe-live-mode`.)
- §5.1 held throughout — the AI never speaks an un-computed number.
- DB migrations applied by pasting into Supabase SQL editor (CLI not authenticated).
- Cloudflare Worker config lives in `cloudflare/` in the repo. To re-deploy:
  `cd cloudflare && npx wrangler deploy`. Wrangler auth is stored locally
  (valid for ~90 days).
- The email inbound secret (`794290925…`) is stored in both: Cloudflare Worker
  secret `MNM_INBOUND_SECRET` AND Vercel `EMAIL_INBOUND_SECRET`. They must match.
  If ever rotating, update both.
