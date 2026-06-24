# Session Summary — Missed No More Pro (June 24, 2026)

Red-team **passed**. This session shipped the last pre-launch fixes the operator
surfaced on the live red-team calls (human transfer, opt-out-aware texting,
noisy-call STT), then fixed the "what area do you serve?" bug — which turned out
to be a stale/duplicated FAQ, not a config problem — and made the service-area
answer radius-driven + plug-and-play. **New decision: pull the home-base + radius
onboarding into the setup wizard NOW (was post-launch) so every new signup gets
the best version from day 1 — build it next session, then do the Stripe live
flip.** Operator asked to stop here and continue next session.

---

## 1. Red-team — PASSED ✅ (the M10 §14 beta gate)

- Operator ran the 25-call `RED_TEAM.md` list against the live line and reports
  **the lists passed** — hard-rule calls 1–15 hold, pricing hallucination 0%.
- Two residual issues from the run were fixed this session (calls 12, 15, 18 —
  see §2a). With those in, the gate is clear for the **Stripe live flip**.

---

## 2. Pre-launch fixes shipped this session

### 2a. Voice: transfer, opt-out texting, noisy-call STT ✅ (commit `0b88c3c`)
Red-team calls 12 / 15 / 18:
- **Transfer (call 12)** — the warm transfer had no ring timeout, so it bailed to
  "that didn't go through, want to leave a message?" the instant the line didn't
  answer. Added a **30s detection/ring window** + reassuring fallback wording — it
  only declares "couldn't reach someone" after it genuinely fails to connect.
  (`src/lib/voice/retell.ts`, `src/lib/voice/prompt.ts`,
  `src/app/api/twilio/voice/route.ts`.)
- **Opt-out texting (call 15)** — inject an `sms_opted_out` per-call flag so the AI
  **hard-declines** a text request from a STOP'd caller ("reply START to resume")
  instead of running the consent script. An explicit "text me" now counts as
  consent. Backstop: a voice "yes" can no longer clear a texted STOP suppression
  (§5.1 — STOP always wins). (`handlers.ts` + prompt.)
- **Background noise (call 18)** — accurate STT + strongest denoise (noise +
  background speech) + `interruption_sensitivity` 0.8 so wind/highway noise
  doesn't garble transcription or cut the agent off mid-sentence. Bumped
  `TUNING_VERSION` so live agents re-sync on the next call.

### 2b. Knowledge: radius-driven service area + FAQ cleanup ✅ (commit `10cbbdc`)
Operator hit **"what area do you serve?" returning the old 25-mile figure** even
though the live radius is **40**. **Root cause was data, not config:** a stale
"within 25 miles" FAQ, **duplicated ~10×** inside a pile of **680 FAQs (only 85
unique)** — because the doc-approve path (`applySuggestion`) inserted FAQs with no
dedupe check, so every re-upload piled them on. The AI reads FAQs as authoritative,
so it parroted 25.

- **Service area is now radius-driven.** `loadPromptInput`
  (`src/lib/voice/agent-sync.ts`) pulls `pricing_settings.max_service_miles`
  (only when the base is geocoded — i.e. exactly when `check_service_area`
  enforces it) and `formatServiceArea` injects it as the **authoritative**
  coverage line into BOTH the voice and chat prompts, with an explicit "ignore any
  FAQ stating a different mileage." promptHash bumps → live agent re-syncs next
  call. **Plug-and-play: set the radius once → the spoken answer is correct for
  every tenant.**
- **Uploads are idempotent now** — `applySuggestion` skips an FAQ whose question
  already exists (and a service whose name exists), so re-uploading a sheet can't
  recreate the pile-up.
- **FAQ manager gained an Edit action** (`updateFaq` + inline `<details>` editor in
  `src/app/dashboard/faqs/`) — was add/toggle/delete only.
- **Live data cleaned** with `scripts/dedupe-faqs.mjs --confirm --fix-radius`:
  **680 → 85 FAQs**, and the one stale coverage answer now reads "within 40 miles."
  Verified via `scripts/check-service-area.mjs` (both scripts committed; dedupe is
  dry-run by default, identical-dupe-only, keeps the oldest, precise mileage fix).

**build + typecheck green for both commits.** Both deployed (pushed to `main`).

---

## 3. 🧭 NEW DECISION — home-base + radius INTO the setup wizard, NOW (pre-launch)

Operator (June 24): *"instead of doing that post launch lets add that into the
setup wizard now, might as well rollout with the best version. lets get them hooked
from day 1."* So **Gap 1** of `docs/post-launch-onboarding.md` is pulled forward to
**before/with launch**.

**Why it matters:** today a new business that only runs the wizard never sets a home
base or radius — they silently sit on the **default 25-mile** radius and the
accurate radius-based `check_service_area` never activates (it falls back to the
coarse ZIP/city list). Folding it into onboarding makes "sign up → correct service
area" automatic. The §2b fix made the *answer* radius-driven; this makes the
*radius itself* get captured at signup.

**The build (Gap 1 — small, NO migration; columns already exist on
`pricing_settings`):**
- Add a **home-base address + radius (miles)** capture to **setup wizard step 5
  ("Service area")**. Inputs: address (required for distance math) + radius
  (default — consider 25, editable).
- On save: upsert `pricing_settings.base_address` + `max_service_miles`, then
  **geocode immediately** (reuse `geocodeAddress` from `src/lib/maps/client.ts`)
  so `base_lat/lng` populate. Handle geocode failure like `approvePricing` (bounce
  with a reason; don't store a half-set base).
- Keep the ZIP/city list as an **optional fallback** (and for tenants without a
  Maps key). Surface the radius read-only on the launch/review screen.
- **Do NOT auto-enable quoting from the wizard** — quoting still needs the explicit
  `/dashboard/pricing` approval (§5.1).
- **Touch points:** `src/app/dashboard/setup/actions.ts` (step-5 handler),
  `src/app/dashboard/setup/_components/lists.tsx` (service-area UI),
  `src/app/dashboard/setup/_components/launch.tsx` (show radius in summary),
  `src/lib/setup/steps.ts` if the step copy changes.

**Optional follow-on (Gap 2, has a small migration):** extend knowledge-upload
extraction to **zones + surcharges**, then a "Finish pricing setup" guided step +
a completeness checklist on the Knowledge Hub so "upload a sheet → quote-ready" is
one path. Full detail + phasing in `docs/post-launch-onboarding.md`. Decide next
session whether to bundle Gap 2 with the rollout or keep it just-after.

---

## Next session — pick up here

1. **Build Gap 1: home-base + radius in the setup wizard** (§3 above). Small, no
   migration. This is the agreed "best version at rollout" work. (Then decide on
   Gap 2.)
2. **Stripe live flip** (red-team gate is now clear — sequence unchanged): Claude
   removes the `getStripe()` `sk_test_` guard
   ([src/lib/billing/stripe.ts:17](src/lib/billing/stripe.ts:17)) + pushes →
   operator adds `sk_live_`/`pk_live_` to Vercel → re-runs `/admin/billing-setup`
   in live mode → copies the **new live webhook signing secret** into Vercel
   `STRIPE_WEBHOOK_SECRET`.
3. **Carry-forward (verify, not yet confirmed this session):**
   - **Google Calendar** was being reconnected last session (7-day refresh-token
     expiry while the OAuth app is in "Testing"). Confirm `status=connected` via
     `node scripts/m9-verify.mjs`; bookings still save in our DB + dashboard
     regardless, but Google sync needs a live connection. Publishing the OAuth app
     kills the 7-day expiry (post-launch Google-verification item).
   - **Wipe red-team test data** after launch: `node
     scripts/redteam-wipe-number.mjs 2164151568 --confirm` (or the full-CRM
     `redteam-cleanup.mjs`).

---

## Still open (not blockers)

- Pronunciation dictionary (needs operator's exact mis-said words).
- Faster-LLM latency swap (`gpt-4.1` → faster) — fold into final polish.
- Post-launch: publish the Google OAuth app; **Phase 16 premium channels**
  (RCS → Apple Messages → WhatsApp) on the vision roadmap.

---

## Commits this session (in order)

`0b88c3c` Voice: reliable human transfer, opt-out-aware texting, noisy-call STT ·
`10cbbdc` Knowledge: radius-driven service area, dedupe FAQs, idempotent uploads,
FAQ edit.

New scripts (committed): `scripts/dedupe-faqs.mjs` (one-time FAQ cleanup, dry-run
by default), `scripts/check-service-area.mjs` (read-only diagnostic of where each
tenant's coverage answer comes from).

---

## Cross-cutting notes

- **Workflow:** Vercel auto-deploys on push to `main`; prompt/tool changes re-sync
  the live Retell agent **lazily on the next call** (promptHash bump). Pricing/zone
  and FAQ changes are **live DB data** (no deploy). Migrations via the Supabase SQL
  editor.
- **§5.1 held throughout:** the radius is now the source of truth for coverage, but
  every *price* is still computed by `calculate_quote`; FAQs can't override a quote.
- **Margin discipline:** no new per-unit cost this session (the radius read is a DB
  field already loaded; cleanup was one-time).
