# Session Summary — Missed No More Pro (June 24, 2026 · pre-rollout fixes)

Worked the **NEEDS.md** punch-list: found and fixed the root cause of the
home-base/service-area bug, hardened it so it can never silently lose a lead
again, switched billing messaging to a true **hard cap**, added a **usage
meter + upgrade prompt**, put **legal links on every page**, surfaced **all
services** in setup, added **upload-to-setup**, wrote the **Google OAuth
verification** walkthrough, and ran a **full pre-live wiring audit (all green)**.

**No migration this session.** build + typecheck green · `prelaunch-check.mjs`
all schema checks pass · `leak-test.mjs` **48/48 PASS**.

**Integrations verified** (`scripts/verify-integrations.mjs`): Resend test email
delivered + production cron accepts `CRON_SECRET`. Commits: `0c655c9` (the batch),
`528becc` (verify script + OAuth doc), `1c5947e` (redeploy for the new Resend key).

---

## ▶ Next session — start here

1. **Google OAuth demo video** — branding is approved; the only thing between you
   and submitting for verification is recording the ~2-min screen video. Step-by-step
   recipe in `docs/google-oauth-verification.md` §B2, then **Submit for verification**.
2. **Maps key restriction** — confirm it's actually fixed: `node scripts/maps-check.mjs`
   should print all ✅ (this is the live home-base / "out of area" lost-lead fix).
3. **Stripe live flip** — the final go-live whenever you're ready to charge real
   cards (see "Stripe live flip" below).

---

## 1. 🔴 ROOT CAUSE of the home-base bug — a Google Maps key restriction (YOU fix this)

Your `GOOGLE_MAPS_API_KEY` is locked with an **"HTTP referrer" restriction**.
That's for browser keys; yours runs **server-side** (Vercel sends no referrer),
so Google **denied every call**. Confirmed live against your real key:

- Geocoding → `REQUEST_DENIED` → setup wizard rejected *every* home-base address
- Distance Matrix → denied → `check_service_area` fell back to the near-empty
  ZIP list → **in-radius callers wrongly told "out of area"** = your lost lead
- Places → denied → tow-destination finder broken

**Fix it (2 minutes, in Google Cloud Console):**
1. console.cloud.google.com → **APIs & Services → Credentials** → your Maps key.
2. **Application restrictions** → change **"HTTP referrers"** → **"None"** (safe —
   this key is server-only, never in a browser; don't use IP, Vercel IPs rotate).
3. **API restrictions** → **Restrict key** → check **Geocoding API**,
   **Distance Matrix API**, **Places API (New)**.
4. **Save**, wait ~2 min, then run: `node scripts/maps-check.mjs` → expect all ✅.

Once green: setup accepts addresses, the radius `check_service_area` is accurate,
and the tow finder works.

## 2. Defensive code so a maps hiccup never loses a lead again ✅

- `check_service_area` now **fails SAFE**: if a home base is configured but the
  distance lookup fails, it returns `covered: true` (`matched_by:
  "radius_unverified"`) and captures the lead, instead of declining. A false
  "you're covered" is recoverable; a false "out of area" loses a customer.
- `maps/client.ts` added `geocode()` → typed `not_found` vs `unavailable`, so
  `saveHomeBase` no longer blames the owner's address when the **key** is the
  problem ("address lookup temporarily unavailable… run maps-check").

## 3. Setup now shows all your services ✅

The wizard services step listed only the 2 from the M4 `services` table. It now
also lists active `service_pricing` names (read-only, link to Prices & Services).
The AI already *spoke* all 7 (the prompt unions both); only the wizard UI lagged.

## 4. Upload-to-setup ✅

Services + FAQs wizard steps now have an **"upload a file instead of typing"**
card with a short what-to-include guide, linking to the existing
upload-and-extract flow (`?from=setup` → it links back to setup). Drop in a price
sheet/FAQ doc → AI proposes rows → you approve. (§5.1 preserved: services still
need pricing approval before quoting.)

## 5. Overage → HARD CAP ✅

You reversed the metered-overage decision. The system **already** hard-caps
(`overage_enabled` defaults false and nothing turns it on → at the limit, calls
forward to your phone). This session fixed the **messaging** to match: landing
pricing, billing footnote, Terms, and usage-alert texts/emails now say "hard
cap — no surprise overage." No migration, no behavior risk.

## 6. Usage meter + near-limit upgrade prompt ✅

New `src/components/billing/usage-meter.tsx` — clear **minutes/texts used +
remaining** bars, shown on the **dashboard** and **billing** page. Turns amber
and shows **"Upgrade to {next plan}"** when ≤50 voice minutes remain or ≥80%
used; red ("calls now forward to you") at the cap. Trial-aware (shows the 50-min
trial cap during a trial).

## 7. Legal links on every page ✅

New `src/components/legal-footer.tsx` (Privacy · Terms · SMS Terms + support
email) on the **dashboard** and **admin** shells; inline legal links added to the
**auth** (login/signup) shell. Landing + the legal pages already had them.

## 8. Google OAuth verification — walkthrough written ✅ (YOU submit)

`docs/google-oauth-verification.md` — plain-English steps:
- **Step A (do now, ~10 min):** OAuth consent screen → fill branding →
  **Publish to Production**. This alone **stops calendars disconnecting after 7
  days** (the part that actually breaks customers).
- **Step B (this week):** Submit for verification (justify the 2 sensitive
  Calendar scopes, upload a 1–3 min demo video). Removes the "unverified app"
  warning. **No security assessment needed** (sensitive, not restricted, scopes).
- Also added the required **Google data-use / Limited-Use disclosure** to
  `/privacy` (a verification requirement).

## 9. Final wiring audit before Stripe live — ALL GREEN ✅

| Check | Result |
|---|---|
| `npm run build` + `npm run typecheck` | ✅ green |
| `prelaunch-check.mjs` (every migration's tables/cols + 5 plans seeded) | ✅ all pass |
| `leak-test.mjs` (cross-tenant RLS) | ✅ **48/48 PASS** |
| Crons (`reminders` 13:00, `outbound` 14:00 UTC) | ✅ in vercel.json |
| Webhooks (Stripe, Twilio voice/SMS/status/recording, Retell, voice-tools) | ✅ present |
| Stripe live-mode unlocked in code | ✅ (test/live both work) |
| Resend email + `CRON_SECRET` (live, `scripts/verify-integrations.mjs`) | ✅ test email delivered; cron 200 |

---

## 🔴 Operator action items (in order)

1. **ASAP — fix the Maps key restriction** (§1) → `node scripts/maps-check.mjs`
   should print all ✅. This unblocks home base, accurate service area, and tows.
2. ✅ **Resend + Cron secret — VERIFIED** (`scripts/verify-integrations.mjs`):
   Resend key valid, `missednomorepro.com` verified, test email delivered; the
   production cron endpoint accepts `CRON_SECRET` (200) and rejects bad/no auth
   (401). **Gotcha hit + fixed:** the first Resend key was a "Sending access" key
   scoped to an *unverified* domain → recreated as a full-access key once the
   domain was verified. Keys now in both Vercel and `.env.local`. (Still worth
   confirming `ADMIN_EMAILS` is in Vercel for /admin + alert recipients.)
3. **Google OAuth** — do Step A (publish) now; submit Step B this week.
4. **Stripe live flip** (unchanged from last session — see below).

## 🔴 Stripe live flip — the final go-live step

1. Stripe Dashboard → **Live mode** → Developers → API keys → copy `sk_live_…`
   and `pk_live_…`.
2. Vercel (Production env) → set `STRIPE_SECRET_KEY=sk_live_…` and
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_…` → redeploy.
3. **Re-run `/admin/billing-setup`** (now live) → creates live products/prices
   (5 plans × 2 intervals + 6 add-ons) + the live webhook + portal config; it
   shows the **new live webhook signing secret once** — copy it.
4. Put that secret in Vercel `STRIPE_WEBHOOK_SECRET` → redeploy. ⚠️ Make sure it
   matches the **live** endpoint at `missednomorepro.com/api/stripe/webhook`.
5. Smoke test with a real card → confirm `trialing` sub + the trial banner +
   plan unlock, then cancel if it was just a test.

---

## Cross-cutting notes

- **No migration this session** — all changes are code/UI/copy + one privacy edit.
- **§5.1 held:** all the setup/upload work keeps prices engine-computed; quoting
  still needs explicit approval on Prices & Services.
- **Hard cap is the margin guard:** voice is the only material COGS; the cap →
  forward-to-owner path (already live) means a runaway plan can't rack up costs.
- Workflow unchanged: push to `main` → Vercel auto-deploys; prompt/tool changes
  re-sync the live Retell agent lazily on the next call.
