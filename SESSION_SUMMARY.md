# Session Summary — Missed No More Pro (June 21–22, 2026)

This session: reviewed, verified, and shipped the two uncommitted batches that
had been sitting in the working tree (voice tuning + the M10 hardening "beta
gate"), verified the beta gate against the live database, then fixed the Stripe
webhook (the prior session's billing-sync bug) and clarified Sentry setup.

---

## 1. Voice tuning ✅ (commit `85795da`, pushed + deployed)

Four files — `src/lib/voice/{types,prompt,retell}.ts` + `src/lib/calendar/timezone.ts`:

- **STT keyword boosting** — `buildBoostedKeywords()` biases Retell toward the
  business name, its service names, and the towns it serves; passed as
  `boosted_keywords` on agent create/update. `TUNING_VERSION` is folded into
  `promptHash`, so the live agent **re-syncs once on the next call** after deploy.
- **Spoken-time fix** — `cleanSpoken()` normalizes exotic spaces
  (NBSP / U+202F / U+2009 / U+200A) to a plain space in the spoken time labels,
  fixing the "k in the time" TTS artifact (Vercel's ICU emits a narrow no-break
  space before AM/PM).
- No migration; safe to deploy on its own.

---

## 2. M10 hardening — the beta gate ✅ (commit `6b9174e`, pushed + deployed)

**Decision: adopted the existing batch** (reviewed + verified + finished) rather
than rebuilding — it was coherent, complete, and built clean. Reviewed
end-to-end: migration, `cost-controls.ts`, `usage-alerts.ts`, `email/`
(Resend + receipts), `observability/scrub.ts`, the voice-route kill switch,
the Stripe webhook, the admin + settings AI toggles, and the finalized legal
pages. **`npm run typecheck` + `npm run build` both green.**

- **Migration `20260629090000_m10_hardening.sql`:** `businesses.{ai_enabled,
  forward_number}` (kill switch + forward target), per-tier + per-tenant
  spend/overage caps on `plan_limits`/`subscriptions`, and the `usage_alerts`
  idempotency ledger (RLS + explicit grants; unique on
  `(tenant_id,kind,period_start,threshold)`).
- **Kill switch + cap → forward-to-owner** in `/api/twilio/voice`, checked
  BEFORE the AI path; logged disposition `forwarded`/`capped`. Owner toggle in
  Settings (`updateAiSwitch`) + platform-admin toggle in `/admin`
  (`setTenantAiEnabled`, audit-logged).
- **`voiceAllowed()` cost gate** — monthly minutes + daily spend cap + overage
  cap; **errs OPEN** so a hiccup never drops calls.
- **Usage alerts** 50/80/100/120% over **SMS + email**, idempotent via the
  ledger; fired at call-end (`finalize.ts`) + a daily sweep in the outbound cron.
- **Resend email** (thin raw-fetch, no-ops without a key) + **billing receipts**
  in the Stripe webhook (`invoice.paid` for subs, `checkout.session.completed`
  mode=payment for one-offs); `invoice.paid` added to billing-setup events.
- **Sentry PII scrub** across all 3 configs (`sendDefaultPii:false` + shared
  `beforeSend`); replay masks all text, sessions off, traces 0.1 in prod.
- **Legal pages finalized** (`support@missednomorepro.com`, Ohio governing law).
- **Leak test → checks 38–41** (follow-up tasks / tool calls / messages /
  suppressions / usage alerts isolation + forge-blocks).

---

## 3. Production verification ✅

- **Migration confirmed applied in prod** — direct read-only check confirmed
  `businesses.{ai_enabled,forward_number}`, the `plan_limits`/`subscriptions`
  cap columns, and `usage_alerts` all exist. (This is why "push both" was safe.)
- **Leak test re-run → 41/41 PASS**, including the new M10 isolation checks.
  Tenant isolation holds in production.
- `ai_enabled` defaults to `true`, so the live business stays AI-on — the kill
  switch won't accidentally forward calls.

---

## 4. Stripe webhook fixes ✅ (commits `26bf713` + stale-endpoint cleanup)

The prior session's symptom — "billing stopped syncing after June 12" — plus the
operator's report that re-running `/admin/billing-setup` *didn't* add
`invoice.paid`. Root-caused and fixed:

- **Bug:** `runStripeSetup` only ever *created* the webhook endpoint; if one
  already existed it skipped it entirely, so events added to the list later
  (`invoice.paid`) never landed on the existing endpoint. **Fixed** — it now
  reconciles `enabled_events` **in place** when any are missing; an in-place
  update keeps the same signing secret (no Vercel change). Re-running the button
  is now enough.
- **`invoice.paid` added directly** to the production endpoint
  (`we_…l0HD` → `missednomorepro.com/api/stripe/webhook`) via a one-off script;
  signing secret unchanged. It now listens for all 5 events.
- **Found + deleted a stale duplicate endpoint** pointing at an old Supabase Edge
  Function (`…supabase.co/functions/v1/stripeWebhook`). Two endpoints both
  receiving subscription events is the most likely reason billing stopped
  syncing — easy to have copied the *wrong* endpoint's signing secret into
  Vercel. Only the real production endpoint remains now.
- Added `scripts/stripe-webhook-check.mjs` (read-only diagnostic: endpoint
  URL / status / events).
- **⚠️ Remaining (operator):** in Stripe → Developers → Webhooks → the
  `missednomorepro.com/...` endpoint → reveal the **Signing secret** and confirm
  it matches `STRIPE_WEBHOOK_SECRET` in Vercel. The local value starts with
  `whsec_Jh…`. If the dashboard's value differs, paste it into Vercel + redeploy
  — that's the actual fix for the sync gap.

---

## 5. Sentry — already live; the real Vercel item is the auth token

Investigated the "confirm `SENTRY_DSN` in Vercel" checklist line:

- **The DSN is hardcoded** in all 3 configs (`sentry.server.config.ts`,
  `src/instrumentation-client.ts`, `sentry.edge.config.ts`), and **nothing reads
  the `SENTRY_DSN` env var** (`env.SENTRY_DSN` has zero usages). So **error
  tracking already works in production** — no Vercel env is required for it, and
  adding `SENTRY_DSN` to Vercel would be a no-op. (DSNs aren't secret; hardcoding
  is what Sentry's own wizard does.) The schema var is vestigial.
- The genuinely useful Vercel var is **`SENTRY_AUTH_TOKEN`** — `next.config.ts`
  runs `withSentryConfig` (org `stranded-no-more-roadside-assi`, project
  `javascript-nextjs`), which uploads source maps **only if a token is present**.
  Without it the build silently skips upload and crash reports show minified
  code. Optional but recommended before beta (see walkthrough handed to operator).

---

## 6. Beta-gate checklist (operator §14 — external setup)

- ✅ **Migration applied** + **leak test 41/41**.
- ✅ **Resend** — account created + `RESEND_API_KEY`/`RESEND_FROM` in Vercel.
- ✅ **Support email** — `support@missednomorepro.com` via Zoho Mail.
- ✅ **Stripe webhook** — `invoice.paid` registered; setup button self-heals;
  stale duplicate endpoint deleted.
- ⚠️ **Verify the Stripe signing secret** matches Vercel (§4 above) — likely the
  billing-sync fix.
- ⬜ **`SENTRY_AUTH_TOKEN`** in Vercel (optional — readable stack traces). DSN
  itself needs nothing.
- ⬜ **Stripe live-mode keys** in Vercel (flips out of test mode).
- ⬜ **25 red-team calls** + confirm 0% pricing hallucination.
- ⬜ Supabase Pro (backups) + Vercel Pro at the first paying customer.

---

## 7. Still open (not blockers)

- **Pronunciation dictionary** for specific mis-said words — needs the operator's
  exact examples (the word + how it currently sounds).
- **Faster-LLM latency swap** (`gpt-4.1` → a faster model) — fold into the
  red-team so the §5.1 hard rules are re-verified after the swap.
- **Live-call check of the voice tuning** — confirm boosted keywords improve
  recognition and the time reads cleanly.

---

## Next session — pick up here

1. **Write the 25-call red-team checklist** (try to make the AI invent a price,
   book outside hours, claim it's human, text an opted-out number, etc. — each
   with a clear pass/fail), then run / walk the operator through it.
2. Confirm the operator verified the Stripe signing secret; if billing still
   doesn't sync, trigger a test webhook event and trace it.
3. Collect mispronounced words → Retell pronunciation dictionary; evaluate the
   faster-LLM swap as part of the red-team.
4. Live-call verification of the voice tuning.
5. When the operator adds Stripe live keys, verify a live-mode test charge +
   receipt end-to-end.

---

## Cross-cutting notes

- **Workflow:** migrations applied by the operator via the Supabase SQL editor;
  Vercel auto-deploys on push to `main`. Apply each migration before/with the
  deploy that selects its new columns.
- **Commit hygiene:** the long-standing uncommitted batch is fully resolved — the
  working tree is clean. This session shipped: `85795da` (voice tuning),
  `6b9174e` (M10), `7750b1e` (M10 docs), `26bf713` (webhook self-heal),
  plus doc + stale-endpoint-cleanup commits.
- **Margin discipline:** M10 adds no new per-unit cost beyond the gated,
  idempotent alert SMS/email; Sentry trace sampling dropped to 0.1 in prod.
