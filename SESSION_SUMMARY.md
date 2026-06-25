# Session Summary — Missed No More Pro (June 25, 2026 · GO-LIVE)

**Stripe is LIVE.** Operator flipped live keys into Vercel this session. Did a
four-lens pre-flip review (architecture / security / UI-UX / RLS — all green),
caught + fixed a real go-live bug, trimmed the trial, finished the self-serve
funnel, ran a legal-compliance pass, and wrote customer phone-setup
instructions. **Committed + pushed `272c52f` (deploying).**

**All gates green:** `npm run build` ✅ · `npm run typecheck` ✅ ·
`scripts/leak-test.mjs` **48/48** ✅ · `scripts/maps-check.mjs` all ✅ ·
Stripe webhook reviewed (signature + idempotent, no live-key guards) ✅.

---

## ▶ Next session — start here (finish the live activation)

The CODE is done and deployed. These are **operator console steps** to actually
charge cards — do them in order:

1. **Confirm the Vercel deploy of `272c52f` went green.**
2. **Confirm `ADMIN_EMAILS` is set in Vercel (Production)** to the email you sign
   into the app with — without it, `/admin/billing-setup` redirects you out.
3. **Open `/admin/billing-setup`** → it should show a green **"Live mode"** badge
   → **Run Stripe setup** (creates live products/prices/add-ons/webhook/portal) →
   it shows the **live webhook signing secret once** — copy it.
4. **Set `STRIPE_WEBHOOK_SECRET` in Vercel to that live secret → redeploy.**
   ⚠️ Live secret ≠ test secret; a mismatch silently breaks subscription sync.
5. **Confirm Stripe payouts/bank connected** (so money lands).
6. **Smoke test with a real card:** sign up → subscribe → confirm trial banner +
   plan unlock + sub in the **live** Stripe dashboard + portal works → cancel.
7. **Google OAuth → Publish to Production** now (stops 7-day calendar
   disconnects); submit for verification this week (`docs/google-oauth-verification.md`).
8. **At first paying customer:** Supabase Pro ($25, backups) + Vercel Pro ($20).

---

## 1. Pre-flip review — all clean ✅

Four review lenses (senior-architect / senior-fullstack / ui-ux-pro-max /
security-review). The working tree was clean so there was no diff to scan; instead
reviewed the live-money surfaces by hand:

- **Stripe webhook** — signature-verified before any work; idempotent
  (first-writer-wins on `event.id`, releases the claim on failure for retries);
  payment update matched on Stripe-signed metadata (no IDOR). Clean.
- **Public website-chat endpoint** — tenant from `widget_key` server-side, reads
  scoped to tenant + visitor, add-on gated, length-capped. Clean.
- **Payments** — hosted Checkout, staff-set amount, never touches card data.
- **`env.ts`** — Stripe keys validated as plain strings (no `sk_test_` regex), and
  a repo-wide grep found **zero** leftover test-mode guards → live flip is code-safe.

## 2. Go-live bug FIXED — test-card hint would show to live customers ✅

`billing/page.tsx` rendered "Test mode: use card 4242 4242 4242 4242"
**unconditionally** — in live mode that card is declined, so a real customer would
be stuck at payment. Added `isStripeTestMode()` (`src/lib/billing/stripe.ts`,
matches `_test_`); the hint now shows **only in test mode**. Bonus:
`/admin/billing-setup` now shows a gray **Test mode** / green **Live mode** badge
so the operator can confirm the flip at a glance.

## 3. Trial trimmed 50 → 30 free AI minutes ✅

`TRIAL_VOICE_MINUTES = 30` (`src/lib/billing/trial.ts`). All billing/dashboard copy
and `voiceAllowed` read the constant, so it updates everywhere; max trial COGS
~$4.50. Memory `free-trial-policy` updated.

## 4. Self-serve funnel finished ✅ (operator chose this)

All 7 primary CTAs now go to `/signup` "Start free trial" — landing **pricing**
(`pricing.tsx`) + **nav, hero, and final CTA** (`page.tsx`). The
**"Become a founding customer"** band and **Enterprise "Talk to us"** stay as
outreach/sales (mailto). Verified live: 7 signup links, 2 intended mailtos, no
console errors.

## 5. Legal / compliance pass ✅

- **Privacy** (`/privacy`): §5 processor list now includes **Retell** (processes
  call audio), **Google** (Calendar), and **Resend** (email) — they were missing;
  §2 adds a **cookies** disclosure. §6 Google **Limited-Use** disclosure confirmed
  present (satisfies OAuth verification). Re-dated June 25 2026.
- **Terms** (`/terms`): §4 adds the **free-trial auto-conversion disclosure**
  (card required, converts to paid unless canceled — FTC negative-option). Re-dated.
- **SMS Terms**: already A2P/CTIA-complete (opt-in "not a condition of purchase",
  STOP/START/HELP, msg&data-rates + carrier disclaimer, no-sharing-for-marketing).
- *Not legal advice — recommend a final attorney pass before scale.*

## 6. Phone-number setup instructions ✅

New `docs/phone-number-setup.md` — customer-facing: **Option A** new number through
us, **Option B** keep your current number via call forwarding (forward-all vs.
forward-on-no-answer, with common carrier codes), **Option C** port later. Hand it
to each customer during onboarding; good post-launch candidate for an in-app page.

---

## ⚠️ Known gap (not a blocker, but plan for it)

**Phone numbers are still admin-assigned.** A self-serve signup creates an account
and finishes setup, but the AI can't answer until **you assign a Twilio number** in
`/admin` and the customer uses it / forwards to it. Onboarding is **self-serve
config + manual number assignment** for now. Closing this (self-serve provisioning)
is the #1 post-launch item.

## 📈 Post-launch ideas (prioritized)

**Soon:** self-serve number provisioning · failed-payment dunning
(`invoice.payment_failed` → email + banner + grace) · in-app phone-setup page ·
deep-link plan (`/signup?plan=…`).
**Next:** dashboard onboarding checklist · "test my AI" call button · real
testimonial + demo-call video on the landing · annual toggle on the billing page.
**Later:** emailed weekly insight reports (Resend is live — easy now) · GBP
auto-replies (needs Google verification) · CRM connectors + Zapier · email channel ·
multi-location · membership plans · Sentry source maps (`SENTRY_AUTH_TOKEN`).

---

## Cross-cutting notes

- **Commit `272c52f`** (10 files): test-mode gating, trial 30, self-serve CTAs,
  legal, phone doc, CLAUDE.md. Pushed to `main` → Vercel auto-deploy.
- **Stripe is LIVE in prod; `.env.local` stays TEST.** Never point dev/scripts at
  live money. Gate test-only UI behind `isStripeTestMode()`. (Memory: `stripe-live-mode`.)
- **§5.1 held:** no pricing/booking behavior changed; the AI brain is untouched.
- Workflow unchanged: push to `main` → Vercel auto-deploys; prompt/tool changes
  re-sync the live Retell agent lazily on the next call.
