# Session Summary — Missed No More Pro (June 21–22, 2026)

This session: reviewed, verified, and shipped the two uncommitted batches (voice
tuning + the M10 hardening "beta gate"), verified the beta gate against the live
database, fixed the Stripe webhook (the prior session's billing-sync bug),
clarified + completed Sentry setup, ran a grounded pre-launch readiness review,
and fixed dashboard timestamps to show each business's local timezone.
**Stopping point — prep next steps (red-team → Stripe live flip) later.**

---

## 1. Voice tuning ✅ (commit `85795da`, deployed)

`src/lib/voice/{types,prompt,retell}.ts` + `src/lib/calendar/timezone.ts`:
- **STT keyword boosting** — `buildBoostedKeywords()` biases Retell toward the
  business name, service names, and served towns; `TUNING_VERSION` folded into
  `promptHash` → re-syncs the live agent once on the next call.
- **Spoken-time fix** — `cleanSpoken()` normalizes exotic spaces (NBSP/U+202F/…)
  in spoken time labels (fixes the "k in the time" TTS artifact).
- No migration.

---

## 2. M10 hardening — the beta gate ✅ (commit `6b9174e`, deployed)

**Adopted** the existing batch (reviewed + verified, not rebuilt). typecheck +
build green.
- Migration `20260629090000_m10_hardening.sql`: kill switch
  (`businesses.{ai_enabled,forward_number}`), per-tier + per-tenant spend/overage
  caps, `usage_alerts` idempotency ledger.
- Kill switch + cap → **forward-to-owner** in the voice route (before AI path);
  owner toggle in Settings + platform-admin toggle in `/admin`.
- `voiceAllowed()` cost gate (minutes + daily spend + overage); **errs OPEN**.
- Usage alerts 50/80/100/120% over **SMS + email**; call-end + daily sweep.
- Resend email + billing receipts; Sentry PII scrub; legal pages finalized;
  leak-test checks 38–41.

---

## 3. Production verification ✅

- **Migration applied** (direct DB check) + **leak test 41/41**.
- `ai_enabled` defaults `true` → live business stays AI-on.

---

## 4. Stripe webhook fixes ✅ (commit `26bf713` + stale-endpoint cleanup)

- **Root cause of the billing-sync bug:** `runStripeSetup` only ever *created*
  the webhook; if one existed it skipped it, so `invoice.paid` never landed.
  **Fixed** — now reconciles `enabled_events` in place (keeps the signing
  secret). Re-running the button is enough going forward.
- **`invoice.paid` added** directly to the prod endpoint (secret unchanged).
- **Deleted a stale duplicate endpoint** (`…supabase.co/functions/v1/stripeWebhook`)
  — two endpoints was the likely reason the wrong signing secret got into Vercel.
  Only the real prod endpoint remains.
- Added `scripts/stripe-webhook-check.mjs` (read-only diagnostic).
- **⚠️ Still operator's to verify:** Stripe → Webhooks → the `missednomorepro.com`
  endpoint → reveal **Signing secret**, confirm it matches Vercel's
  `STRIPE_WEBHOOK_SECRET` (local starts `whsec_Jh…`). *(Becomes moot once you
  redo this for live mode — see §6.1.)*

---

## 5. Sentry ✅ (error tracking + source maps now both live)

- The **DSN is hardcoded** in all 3 configs and the `SENTRY_DSN` env var is
  vestigial (nothing reads it) — so error tracking already worked; no Vercel DSN
  needed.
- **Operator added `SENTRY_AUTH_TOKEN` to Vercel** → builds now upload source
  maps → crash reports show real code, not minified. **Done.**

---

## 6. Pre-launch readiness review (June 22)

Ran a grounded check (`scripts/prelaunch-check.mjs`, committed) — **all 22
migrations confirmed applied in prod** (every later-phase column/table exists),
re-tiered plan rows seeded, integration env present locally (except the
Vercel-only ones below). Foundation is solid: migrations ✅, leak test 41/41 ✅,
cost controls/kill switch ✅, Sentry ✅, webhooks idempotent ✅, PII scrub ✅.

### 6.1 🔴 Must handle before taking real money
- **Stripe live flip is a SEQUENCED op — do not paste live keys yet.**
  `getStripe()` ([src/lib/billing/stripe.ts:17](src/lib/billing/stripe.ts)) hard-refuses any non-`sk_test_` key by
  design, so adding `sk_live_…` to Vercel now **breaks all billing in prod**.
  Correct order when ready: (1) Claude removes the test-key guard + pushes →
  (2) operator adds `sk_live_`/`pk_live_` to Vercel → (3) operator re-runs
  `/admin/billing-setup` in live mode (creates LIVE products/prices/webhook) →
  (4) operator copies the **new live webhook signing secret** into Vercel
  `STRIPE_WEBHOOK_SECRET`. Hold until after the red-team passes.
- ✅ **`CRON_SECRET` confirmed deployed in Vercel** (operator, June 22). One
  secret authenticates BOTH crons by design — Vercel sends
  `Authorization: Bearer <CRON_SECRET>` to every path in `vercel.json`, and both
  `reminders` + `outbound` routes read the same `env.CRON_SECRET`. So reminders,
  follow-up texts, review requests, usage alerts, and weekly insights are all
  live. (Not in local `.env.local`, which is fine — it's a Vercel-only secret.)

### 6.2 🟡 Strongly recommended for beta
- **Supabase Pro now** (not "at first paying customer") — real CRM data /
  transcripts / payments land the moment the first beta business goes live;
  free-tier backups are thin (~$25/mo for daily backups + PITR).
- **Set the live business's `forward_number`** to the operator's cell (Settings)
  so kill-switch/cap fallback rings a human, not voicemail.
- **Free uptime monitor** (UptimeRobot) on `missednomorepro.com` — the phone line
  is the product; Sentry catches code errors, not outages.
- **Google OAuth "unverified app"** — if calendar booking is a selling point,
  start Google verification now (takes days–weeks); tolerable for ≤100 beta users.

### 6.3 🟢 Known / accepted — fine to leave
- HELP keyword via Twilio's built-in responder (v2 item).
- Per-tenant Twilio number provisioning is manual (fine while onboarding by hand).
- Pronunciation dictionary (needs operator examples) + faster-LLM latency
  (fold into red-team).
- Web-chat rate-limit is in-memory (add-on-gated, low traffic — revisit if abused).

---

## 7. Beta-gate checklist (operator §14)

- ✅ Migration applied · ✅ leak test 41/41 · ✅ Resend (in Vercel) · ✅ support
  email (Zoho) · ✅ Stripe `invoice.paid` + self-heal + stale endpoint deleted ·
  ✅ Sentry error tracking + `SENTRY_AUTH_TOKEN`.
- ⚠️ Verify Stripe signing secret matches Vercel (or just set it fresh at live flip).
- ✅ `CRON_SECRET` in Vercel (one secret authenticates both crons by design).
- ⬜ Supabase Pro · ⬜ set forward_number · ⬜ uptime monitor · ⬜ Google OAuth verify.
- ⬜ **Stripe live-mode flip** (§6.1 sequence — after red-team).
- ⬜ **25 red-team calls** + confirm 0% pricing hallucination.

---

## 8. Timezone display fix ✅ (June 22)

Operator noticed dashboard times were off. Cause: display pages called
`toLocaleString()`/`toLocaleTimeString()` with **no `timeZone`**, so on Vercel
(UTC servers) call/message/timeline times rendered in UTC, not the business's
local time. (Booking, availability, reminders, and dispatch already used the
business tz — only the read-only display side drifted.) Fixed: added
`formatDateTimeInZone`/`formatDateInZone`/`formatTimeInZone` to
`lib/calendar/timezone.ts` + a `getBusinessTimezone()` helper
(`lib/business/timezone.ts`, reads `businesses.timezone`, falls back to
`America/New_York`), applied to calls list + detail, messages, contact detail
(timeline/media/consent/lead), contacts list, billing renewal, reputation.
**Per-business** — each company's dashboard shows its own local time. The live
business is set to `America/New_York` (Eastern, confirmed). Only remaining
bare-format spot is `setup/_components/launch.tsx` (date-only, one-time, client
component — left as-is). build + typecheck green.

---

## 9. Still open (not blockers)

- Pronunciation dictionary — needs the operator's exact mis-said words.
- Faster-LLM latency swap (`gpt-4.1` → faster) — fold into the red-team.
- Live-call check of the voice tuning (boosted keywords + clean time read).

---

## Next session — pick up here

1. **Write the 25-call red-team checklist** (make the AI try to invent a price,
   book outside hours, claim it's human, text an opted-out number, etc. — each
   with pass/fail), then run / walk the operator through it.
2. When red-team passes → **do the Stripe live flip** (§6.1): Claude removes the
   `getStripe()` test-key guard, then operator adds live keys + re-runs
   billing-setup + sets the new live webhook secret.
3. Confirm operator did the remaining items: forward_number set, uptime monitor,
   (Supabase Pro at beta start). [`CRON_SECRET` ✅ done.]
4. Collect mispronounced words → Retell pronunciation dictionary; evaluate the
   faster-LLM swap.
5. Live-call verification of the voice tuning.

---

## Cross-cutting notes

- **Workflow:** migrations applied by operator via Supabase SQL editor; Vercel
  auto-deploys on push to `main`. Apply each migration before/with the deploy
  that selects its new columns.
- **Commit hygiene:** working tree clean. Key commits this session, in order:
  `85795da` voice tuning · `6b9174e` M10 hardening · `7750b1e` M10 docs ·
  `26bf713` Stripe webhook self-heal · `b511583` prelaunch-check script ·
  `6ddfb66` timezone display fix (+ several docs commits in between).
- **New diagnostics (read-only):** `scripts/stripe-webhook-check.mjs`,
  `scripts/prelaunch-check.mjs` (re-run before the live flip).
- **Margin discipline:** M10 adds no per-unit cost beyond gated/idempotent alert
  SMS+email; Sentry trace sampling 0.1 in prod.
