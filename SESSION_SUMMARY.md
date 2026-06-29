# Session Summary — Missed No More Pro (June 29, 2026 · Voice speech-pattern tuning + email-channel plan)

**Shipped + merged to `main`.** A focused voice-quality pass (operator was on
mobile, flagging speech issues before scaling demo/test calls), plus a vetted
plan for the next big build: the **AI email channel**.

**PR #4 → commit `4a20284`** on `main` (squash). build ✅ · typecheck ✅.
Vercel auto-deploys `main`; the live Retell agent re-syncs lazily on its next
call (TUNING_VERSION bump).

---

## ▶ Next session — start here (operator is back on the home machine)

1. **Live-test the voice fixes** (phone, not code) via the **"Hear your AI"**
   button on `/dashboard/numbers`:
   - Ask for hours / a booked time → confirm clean **"nine AM"** with **no
     trailing "k"**.
   - Talk with **background noise** while the AI speaks → confirm it's **not cut
     off**; then a **clear voice over it should still interrupt** (0.3 isn't so
     low it ignores the caller).
   - Spot-check a local **town name** + a **quoted price** read-back.
   - If interruption still feels off, it's a one-number tweak in
     `src/lib/voice/retell.ts` (`INTERRUPTION_SENSITIVITY`, try 0.2–0.4) → I
     re-merge.
2. **Then build: the AI email channel** (operator picked this as the next big
   feature). **Two decisions to confirm before I write code** (my recommendations):
   - **Inbound provider → Resend Inbound** (single vendor, domain already
     verified; add an MX record, Resend POSTs parsed mail to our webhook).
     Fallback: Cloudflare Email Routing (free).
   - **Gating → fold into the existing $29 Omnichannel Chat add-on** (already =
     web chat + two-way SMS AI; email makes it truly omnichannel, no price
     change). Plan detail below.

---

## What shipped this session (in `4a20284`)

Two files: `src/lib/voice/retell.ts`, `src/lib/voice/prompt.ts`.

1. **Interruption sensitivity 0.8 → 0.3** — root cause of the AI being cut off by
   the slightest background noise. In Retell, **higher = easier to interrupt**;
   the old code comment misread the scale. 0.3 holds through wind/traffic/
   bystanders while a caller clearly talking over it still interrupts. Applied in
   both `agent.create` and `agent.update`.
2. **"a.m.k" TTS artifact fixed** — a new **"Speaking style"** section in the
   voice system prompt tells the LLM (it's read aloud) to never write
   period-separated `a.m.`/`p.m.`, read phone numbers digit-by-digit, and speak
   prices plainly. That stray "k" came from 11labs vocalizing `a.m.`.
3. **Curated IPA `pronunciation_dictionary`** (AM/PM backstop + local town names:
   Strongsville, Cuyahoga, Lakewood) and **`voice_speed`** wired as a tunable
   constant.
4. **`TUNING_VERSION` 2 → 3** — folded into the prompt hash so every agent
   re-syncs once and the provider-level audio settings actually take effect.
   (Note: `normalize_for_speech` was planned but isn't an exposed field in
   retell-sdk 5.36 — dropped; the prompt rules + dictionary cover it.)

---

## Next build — AI email channel (plan, pending the 2 decisions above)

**The brain already generalizes:** `runChatTurn` (`src/lib/chat/handle.ts`) is
channel-agnostic, `conversations.channel` already enumerates channels, and
`contacts.email` exists. Email = a **third channel** beside `web`/`sms`, reusing
the §10 tool brain, the unified Inbox, encrypt-at-rest storage, and the Resend
sender. Same §5.1 guardrails (never invents prices).

**Build outline:**
- **Migration** — add `'email'` to `conversations.channel` + `customer_email`/
  `subject` cols + per-channel open-thread unique index; `email_message_id`/
  `in_reply_to` on `conversation_messages` (threading); `email_enabled` +
  unique per-tenant `email_handle` + greeting/signature on `sms_settings`; small
  `email_suppressions` table (CAN-SPAM unsubscribe).
- **Inbound webhook** `/api/email/inbound` — verify provider signature, resolve
  tenant from the destination address (`<handle>@inbound.missednomorepro.com`),
  strip quoted reply history, call `runChatTurn({ channel: "email", … })`.
- **Reply delivery** — extend `sendEmail` (`src/lib/email/resend.ts`) with
  `from`/`replyTo` + `In-Reply-To`/`References` headers so replies thread; add an
  unsubscribe footer.
- **Prompt** — email branch in `src/lib/chat/prompt.ts` (slightly more formal,
  allows a sign-off; SMS stays terse).
- **Inbox + Settings** — email threads in `/dashboard/inbox` (subject + "Email"
  badge, staff composer + take-over); Settings card with the tenant inbound
  address + forwarding instructions + greeting/signature.
- **Env** — `EMAIL_INBOUND_DOMAIN` + an inbound webhook secret. **Leak test** —
  extend for email-conversation/suppression isolation.

**Operator setup (home machine):** confirm Resend Inbound on plan → add MX for
`inbound.missednomorepro.com` → set the 2 env vars in Vercel → per business,
enable email in Settings and forward their `support@` to the shown address
(mirrors the phone-forwarding flow).

---

## Still open from prior sessions (not touched this session)

- **Red-team 25 calls** (`RED_TEAM.md`) — the 0%-pricing-hallucination gate;
  the real "prove it's solid" step before scaling demos. Never run to completion.
- **Supabase Pro hardening checklist** — `docs/supabase-pro-hardening.md`
  (PITR, leaked-password protection, SSL enforce, network restrictions, Advisor,
  spend cap). If the Advisor flags anything, send the item name → I fix in a migration.
- **Operator live-tests** carried from June 25: staff lead-alert backstop text,
  dispatch confirmation+ETA, self-serve number claim, dunning (failed renewal).
- **Deferred features:** native CRM connectors (Jobber/Housecall), multi-location,
  customer membership plans, GBP auto-replies (needs Google verification),
  Sentry source maps (`SENTRY_AUTH_TOKEN`), uptime monitor — all low-priority vs
  the email channel + red-team.

---

## Cross-cutting notes (unchanged)
- Workflow: push to `main` → Vercel auto-deploys; prompt/tool changes re-sync the
  live Retell agent lazily on the next call.
- Stripe stays **LIVE** in prod; `.env.local` stays **test**. (Memory: `stripe-live-mode`.)
- §5.1 held — the AI never speaks an un-computed number.
- DB migrations are applied by pasting the file into the Supabase SQL editor
  (CLI not authenticated).
