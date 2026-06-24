# Session Summary — Missed No More Pro (June 24, 2026 · cont.)

Built the agreed pre-launch "best from day 1" batch and **unlocked Stripe live
mode in code (pushed)** — so the only thing standing between here and live
billing is the operator's Vercel/Stripe key swap (checklist in §4). Shipped:
the home-base + radius onboarding (Gap 1), the Knowledge-Hub "steps to start
quoting" checklist, and a **limited + gated 7-day free trial**.

---

## 1. Setup wizard — home base + service radius (plug-and-play) ✅

Folded the home base + radius into **setup step 5 ("Service area")** so every new
signup captures the real coverage mechanism at onboarding (previously they sat
silently on the 25-mi default and the accurate radius `check_service_area` never
activated). **No migration** — columns already existed on `pricing_settings`.

- `saveHomeBase` (setup `actions.ts`): validates address + radius (**defaults to
  40 mi**), **geocodes immediately** (bounces on a bad address — never stores a
  half-set base, mirrors `approvePricing`), writes `base_address`/`base_lat`/
  `base_lng`/`max_service_miles`. Quoting approval is **not** touched (still needs
  the explicit `/dashboard/pricing` sign-off, §5.1).
- **Launch-gate reconciliation (the subtle bit):** the DB gate
  (`app.setup_complete()`) still hard-requires ≥1 active `service_areas` row +
  `area_approved_at`, and the `radius` type isn't allowed in that table's CHECK.
  Rather than migrate the gate right before the flip, `saveHomeBase`
  **auto-seeds the geocoded home city** as that one required row (only when none
  exist, so re-saving can't pile up). Result: owner enters **one address + one
  radius**, the gate passes, the radius check + spoken coverage answer go live,
  and the city doubles as a no-Maps fallback. `geocodeAddress` now returns
  `city`/`state` from `address_components` to enable this.
- UI: step 5 leads with a **Home base & service radius** card ("Covering N miles
  around …"); ZIP/city list reframed as an optional backup. Radius shown
  read-only on the launch review screen. Step completion now also requires a
  home base.
- **Future option (not needed now):** a small migration to `setup_complete()` +
  a `pricing_settings` approval-reset trigger would let a home base + radius
  launch with *no* city row at all (cleanest conceptual version).

## 2. Knowledge Hub — "Steps to start quoting" checklist ✅

A cyan card on `/dashboard/knowledge`, shown **only while quoting is off**,
mirroring `approvePricing`'s exact gates: home base ✓ · ≥1 dispatch zone ✓ ·
≥1 service+price ✓ · approved ✓ — each row links to the fix. Disappears once
quoting goes live. Pulled forward from Gap 2c so self-serve owners always see
what's left. No migration.

## 3. Free trial — limited + gated ✅ (operator choices: card req, 7 days, 50-min cap)

Stripe-native trial bolted onto the existing checkout. **No migration, no new
Stripe prices** (a trial is a checkout param; works identically in test + live).

- `src/lib/billing/trial.ts` — `TRIAL_DAYS=7`, `TRIAL_VOICE_MINUTES=50`, helpers
  (single place to tune).
- `startCheckout`: adds `trial_period_days` **only on a tenant's first-ever
  subscription** (no serial trials — a prior canceled sub blocks it) +
  `payment_method_collection: "always"` so the **card is required** (gated).
- **Margin protection** in `voiceAllowed` (`cost-controls.ts`): while `trialing`,
  AI talk-time is hard-capped at **50 min total** regardless of the plan's
  allotment, overage forced off → ~$7.50 max COGS per trial. Hitting it forwards
  the caller to the owner (existing cap→forward path, new `trial_cap` reason). No
  surprise bill.
- `effectivePlan`/`syncSubscription` already treat `trialing` as entitled, so
  features unlock during the trial automatically.
- UI: billing page trial banner ("ends [date] · N of 50 trial min · then $X/mo,
  cancel anytime") + first-timer CTA copy ("Start free trial · 7 days free, then
  $X/mo"); **landing pricing advertises the 7-day free trial** (verified live in
  preview).

**Commits:** `df97d9b` (onboarding + checklist + trial + landing) · `4951f12`
(Stripe live-mode unlock). build + typecheck green; pushed → deploying.

---

## 4. 🔴 Stripe live flip — DO THIS NEXT (operator, in Vercel/Stripe)

Step 1 (remove the `sk_test_` guard in `getStripe()` + push) is **DONE** — prod
still runs in test mode because Vercel still holds the test keys; the guard
removal just *allows* live keys. Remaining, in order:

1. **Get live keys** — Stripe Dashboard → toggle **Live mode** → Developers →
   API keys → copy `sk_live_…` (secret) and `pk_live_…` (publishable).
2. **Add to Vercel (Production env), then redeploy:**
   - `STRIPE_SECRET_KEY = sk_live_…`
   - `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = pk_live_…`
   - (leave `STRIPE_WEBHOOK_SECRET` for step 4)
3. **Re-run `/admin/billing-setup`** (now in live mode). It creates the **live**
   products/prices (5 plans × 2 intervals + 6 add-ons), the live **webhook
   endpoint** at `…/api/stripe/webhook`, and the Customer Portal config. It shows
   the **new live webhook signing secret once** — copy it.
4. **Put that live secret in Vercel** `STRIPE_WEBHOOK_SECRET`, redeploy.
   ⚠️ This is the suspected June-12 sync-gap cause — make sure the secret in
   Vercel matches the **live** endpoint at `missednomorepro.com/api/stripe/webhook`.
5. **Smoke test live:** start a plan from the billing page with a **real** card →
   confirm `trialing` sub appears, the trial banner shows, and (after the
   webhook) the plan unlocks. Then cancel in the portal if it was just a test.

Stripe test/live are fully separate — nothing from test mode carries over, hence
the re-run + new secret.

---

## 5. Carry-forward / still open (not flip blockers)

- **Google OAuth verification** — recommended to **start now** (lead-time item):
  Testing mode = scary interstitial + **7-day refresh-token expiry** (a new
  customer's calendar silently disconnects after a week; bookings still save in
  our DB). Publishing kills the expiry. Needs Google review (days–weeks).
- **Supabase Pro (daily backups) + Vercel Pro** — turn on at/with the first
  paying customer.
- **Voice latency** — A/B a faster model than `gpt-4.1` post-launch (call
  responsiveness is the #1 thing customers judge).
- **Trial abuse via new orgs** — per-tenant gate stops cancel/resubscribe
  farming; the 50-min cap bounds new-org abuse to ~$7.50. Tighten later if seen.
- Wipe red-team test data after launch (`scripts/redteam-wipe-number.mjs
  2164151568 --confirm`). Pronunciation dictionary. Gap 2a (upload →
  zones/surcharges, needs migration).

---

## Cross-cutting notes

- **Workflow:** push to `main` → Vercel auto-deploys. Prompt/tool changes
  re-sync the live Retell agent lazily on the next call. Pricing/FAQ are live DB
  data. Migrations via the Supabase SQL editor (none this session).
- **§5.1 held:** the wizard captures the radius + home base but **does not**
  enable quoting; every price is still computed by `calculate_quote`.
- **Margin discipline:** the trial's 50-min hard cap is the key protection —
  voice is the only material COGS, so a $0 trial can't run it up.
