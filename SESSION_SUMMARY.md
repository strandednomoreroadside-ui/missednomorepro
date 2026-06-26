# Session Summary — Missed No More Pro (June 25, 2026 · Post-launch batch #1)

**Shipped, committed, pushed, deployed, and verified.** A 9-item post-launch
batch: two flaw fixes the operator reported, the entire NEEDS.md "Do soon"
section, two "Next" conversion items, and a Supabase Pro security-hardening pass.

**Commit `dc1e75d`** on `main` (28 files, +1676/−45). build ✅ · typecheck ✅.
Both migrations applied to prod and **column-verified**; the Stripe dunning
webhook event is now live.

---

## ▶ Next session — start here

The code batch is **done and live**. What's open is operator testing + the next
build pick. Nothing is blocking.

1. **Operator live-tests still to run** (phone/console, not code):
   - **Lead text:** a lead call where the AI does NOT escalate → confirm you get
     the staff "New lead" text (the deterministic backstop).
   - **Dispatch ETA:** an urgent "come now" call → confirm the caller gets a
     confirmation + arrival-time text and a job appears on the Dispatch board.
   - **Self-serve number:** on a carded test tenant, `/dashboard/numbers` → search
     an area code → Claim → AI answers a test call on it.
   - **Dunning** (optional): force a failed renewal (Stripe test clock or card
     `4000000000000341`) → confirm the email + the in-app banner.
2. **Supabase Pro hardening checklist** — work through
   `docs/supabase-pro-hardening.md` in the Supabase dashboard (PITR, leaked-
   password protection, SSL enforce, network restrictions, run the Advisor,
   spend cap). If the Advisor flags anything, send the item name → I fix it in a
   migration. (Memory: `supabase-pro-security-hardening`.)
3. **Pick the next build** (see "What's left" below).

---

## What shipped this session (all in `dc1e75d`)

**Flaws (operator-reported):**
1. **Reliable staff lead-alert text** — root cause: the text only fired when the
   AI chose to call `notify_staff`, which it began skipping on booked/quoted
   calls as the prompt grew. Fix = a deterministic backstop at call-end
   (`finalize.ts`), idempotent via `calls.staff_alerted_at`, fires only when the
   AI didn't already alert (no dupes).
2. **Dispatch confirmation + arrival ETA** — on an urgent "come now" dispatch
   (`notify_staff` urgency high/emergency) we open a Dispatch job and text the
   caller a confirmation + ETA = **60 min + 30 min × open jobs on today's board**
   (tunable in Settings). AI never says the number out loud (§5.1 intact). Dedup
   via `calls.dispatch_eta_sent_at`.

**NEEDS.md "Do soon" (complete):**
3. **Self-serve number provisioning** — `/dashboard/numbers` picker; gated
   owner/admin + card-on-file + plan number cap; new numbers auto-attach to the
   approved A2P messaging service.
4. **Failed-payment dunning** — `invoice.payment_failed` → `subscriptions.
   payment_failed_at` + customer email + app-wide banner; cleared on recovery.
5. **In-app phone-setup guide** — `/dashboard/numbers/guide`.
6. **Deep-link plan at signup** — `/signup?plan=…` → cookie → highlighted plan on
   billing.

**NEEDS.md "Next" (2 of 4):**
7. **Annual/monthly toggle on billing** (matches the landing).
8. **Dashboard "Getting started" onboarding checklist** (auto-hides when core
   steps done).

**Security:** Supabase Pro hardening — baseline security headers in
`next.config.ts`, audit confirming all 23 DB functions already pin
`search_path`, + operator checklist `docs/supabase-pro-hardening.md`.

---

## ✅ Verified this session
- Both migrations applied — all 7 new columns confirmed present in prod
  (`calls.staff_alerted_at/dispatch_eta_sent_at`, the 4 `sms_settings`
  dispatch/ETA cols, `subscriptions.payment_failed_at`).
- Live Stripe webhook now lists **6** events incl. `invoice.payment_failed`
  (operator added it — billing-setup had first run before the deploy landed; no
  signing-secret change).

---

## What's left on NEEDS.md

**"Next" — 2 remaining (need operator input):**
- **"Test my AI" demo-call button** — places an *outbound* demo call so owners
  trust it before going live. Bigger Twilio/Retell outbound work; build when the
  operator says go.
- **Real testimonial + demo-call video on the landing** — needs the operator's
  actual content (won't fabricate a quote).

**"Later" (roadmap depth, not started):** weekly emailed insight reports
(Resend is live), GBP auto-reply (needs Google verification), CRM connectors
(Jobber/Housecall) + Zapier, email channel, multi-location, membership plans,
Sentry source maps (`SENTRY_AUTH_TOKEN`), uptime monitoring.

**Compliance housekeeping:** attorney pass on Privacy/Terms/SMS (operator's
call); cookie banner only if analytics/marketing cookies are added later.

---

## Parked
- **Headroom** (`headroomlabs-ai/headroom`) — operator asked to "install this
  skill"; it's actually an agent context-compression **proxy + Claude Code hook
  plugin**, not a skill. It would read everything Claude sends (incl. customer
  PII). Operator chose to **leave it for now**; a copy-paste install guide was
  given in chat (pip/npm + `headroom wrap claude`, or `/plugin marketplace add`).
  Not installed.

## Cross-cutting notes
- Workflow unchanged: push to `main` → Vercel auto-deploys; prompt/tool changes
  re-sync the live Retell agent lazily on the next call. The two flaw fixes bump
  the prompt hash → the agent re-syncs on the first call after deploy.
- Stripe stays **LIVE** in prod; `.env.local` stays **test**. (Memory:
  `stripe-live-mode`.)
- §5.1 held throughout — the AI never speaks an un-computed number (the dispatch
  ETA is texted, not spoken).
