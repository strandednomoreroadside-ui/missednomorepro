# Session Summary — Missed No More Pro (June 21, 2026)

This session: reviewed, verified, and shipped the two uncommitted batches that
had been sitting in the working tree (voice tuning + the M10 hardening "beta
gate"), then verified the beta gate against the live database.

---

## 1. Voice tuning ✅ (commit `85795da`, pushed → deploying)

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

## 2. M10 hardening — the beta gate ✅ (commit `6b9174e`, pushed → deploying)

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

## 4. Remaining to fully close the beta gate (operator §14 — external setup)

- ⬜ **Resend:** create the account → verify the sending-domain DNS → set
  `RESEND_API_KEY` + `RESEND_FROM` in Vercel. *Until then, usage-alert and
  receipt emails silently no-op (by design); the SMS half of alerts still fires.*
- ⬜ **Re-run `/admin/billing-setup`** to register the new `invoice.paid`
  webhook event (may need to delete + recreate the Stripe webhook endpoint so it
  picks the event up). This also addresses the stale-webhook issue from the
  prior session.
- ⬜ Confirm `SENTRY_DSN` in Vercel.
- ⬜ Set up `support@missednomorepro.com` forwarding.
- ⬜ **Stripe live-mode keys** in Vercel (flips out of test mode).
- ⬜ **25 red-team calls** + confirm 0% pricing hallucination.
- ⬜ Supabase Pro (backups) + Vercel Pro at the first paying customer.

---

## 5. Still open (not blockers)

- **Pronunciation dictionary** for specific mis-said words — needs the operator's
  exact examples (the word + how it currently sounds).
- **Faster-LLM latency swap** (`gpt-4.1` → a faster model) — fold into the
  red-team so the §5.1 hard rules are re-verified after the swap.
- **Live-call check of the voice tuning** — confirm boosted keywords improve
  recognition and the time reads cleanly, once the deploy lands.

---

## Next session — pick up here

1. As the operator completes §14 external setup (Resend, Stripe live), verify
   each end-to-end (a real test alert email, a live-mode test charge + receipt).
2. Run / walk the operator through the 25 red-team calls; collect mispronounced
   words → Retell pronunciation dictionary; evaluate the faster-LLM swap.
3. Live-call verification of the voice tuning.

---

## Cross-cutting notes

- **Workflow:** migrations applied by the operator via the Supabase SQL editor;
  Vercel auto-deploys on push to `main`. Apply each migration before/with the
  deploy that selects its new columns.
- **Commit hygiene:** the long-standing uncommitted batch is now fully resolved
  — the working tree is clean, shipped as two separate commits (`85795da`,
  `6b9174e`).
- **Margin discipline:** M10 adds no new per-unit cost beyond the gated,
  idempotent alert SMS/email; Sentry trace sampling dropped to 0.1 in prod.
