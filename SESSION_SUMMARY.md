# Session Summary — Missed No More Pro (June 23, 2026)

Red-team prep + live execution. This session: built the 25-call red-team kit and
test-data cleanup, did a live pricing re-config (→ 5 zones / 40 mi), shipped the
`find_tow_destination` tool (nearest mechanic/tire shop for tows), then fixed a
string of real issues the operator surfaced on live red-team calls (proactive
quoting, immediate-dispatch vs scheduled booking, no invented waitlist, dispatch
ETA wording, availability roll-forward). Diagnosed a broken Google Calendar
connection. **Stopping point — operator is mid-red-team; reconnecting Google
Calendar; Stripe live flip still pending the red-team pass.**

---

## 1. Red-team kit + test-data wipe ✅

- **`RED_TEAM.md`** — 25-call §14 checklist + a **pricing answer key** matching the
  live rules so the operator can verify the **0%-hallucination** gate. Hard-rule
  gates = calls 1–15; quality = 16–25 (incl. call 23 = the new tow finder).
- **`RED_TEAM_TRACKER.md`** — a printable PASS/FAIL checkoff sheet (operator asked).
- **`scripts/redteam-wipe-number.mjs`** — scoped single-number CRM wipe (child-first
  delete order for the composite-FK SET-NULL/NOT-NULL `tenant_id` quirk).
- **`scripts/redteam-cleanup.mjs`** — time-window full-CRM wipe (dry-run by default).
- **Done:** wiped test number `+12164151568` (was contact "Josh"), then ALL prior
  test CRM data for the live tenant (`880a6037…`) → clean slate. One leftover STOP
  suppression on `+12164150847` (different number) left in place — harmless.
- **Decision:** red-team on the **live number/tenant**, wipe after (operator's call).

---

## 2. Live pricing re-config ✅ (data only, no migration)

Operator expanded coverage, then trimmed it:
- Final state (applied to live DB, quoting stayed approved):
  **5 zones** — Z1 0–8/$55, Z2 8–16/$65, Z3 16–25/$75, Z4 25–33/$85, Z5 33–40/$95
  (+$10/zone) — and **service radius 40 mi**.
- Engine rule reaffirmed: the **top zone must cover the whole radius** (a caller
  inside the radius but past the top zone hits `no_zone` and the quote fails).
- Services unchanged (Jump $40, Lockout $50, Tire-spare $60, Tire-nospare $80+tire
  9–4, Battery $50+batt, Fuel $40+fuel, Tow $60 hook + $2.50/mi after 5 free).

---

## 3. `find_tow_destination` tool ✅ (commit `2cddab7`, deployed)

A stranded caller with no drop-off in mind ("just tow it to the nearest mechanic /
tire shop / body shop / dealership / gas station") gets **1–2 real nearby options**,
then `calculate_quote` prices the tow to the chosen address. **§5.1 intact —
prices stay engine-computed; the tool only finds destinations.**
- `maps/client.ts`: `findNearbyPlaces` (Google **Places API New** Text Search) +
  `drivingDistanceMilesMulti` (one Distance Matrix call ranks by real driving miles).
- `voice/tools/{registry,handlers}.ts`: zod-validated handler, tenant from call row,
  audit-logged, graceful fallback. Also wired into the **chat brain** (web/SMS).
- **Operator enabled "Places API (New)"** on `GOOGLE_MAPS_API_KEY` — **verified live**
  (geocode → places → driving-distance ranking returns real shops, e.g. Berea Tire
  1.4 mi). Cost ~$0.037 per lookup, only when asked. CLAUDE.md entry = commit `ef621b9`.

---

## 4. Red-team-driven fixes ✅ (all deployed)

Issues the operator hit on live calls, each fixed via prompt/tool (promptHash bumps
→ lazy Retell re-sync on the next call after deploy):

- **Proactive quoting** (`9f31f44`) — the AI was only quoting "when the caller asks,"
  so a "come help me" call went to the lead/"team will call you" wrap-up with **no
  price**. Now it quotes the moment it knows service + location, and as it confirms
  the service/address — wired into the pricing step, booking step, lead handoff, and
  wrap-up. Mirrored in chat.
- **Immediate-dispatch vs scheduled booking + no invented waitlist** (`c4b68f6`) —
  "I need it in 5 minutes" was dead-ending on "no appointments today." Roadside
  "help now" is **immediate dispatch** (quote + notify_staff high/emergency), NOT
  calendar booking; only a SCHEDULED time uses the calendar. Also **forbade** the AI
  from promising a "we'll call you if an earlier slot opens" waitlist (it doesn't
  exist) — exposed by the call-9 "squeeze me in" test.
- **Dispatch ETA wording** (`b2ff557`) — operator chose: on urgent dispatch the AI
  says help is on the way ASAP + the team will text/call with an ETA, and **never
  promises a specific number of minutes**. (The 60-min "lead time" only governs the
  scheduled-booking path, not dispatch — call 8 reframed to PASS.)
- **Availability roll-forward** (`9097392`) — booking in the evening returned "no
  available spots in the future at all" because the tool only checked the one
  requested day (and an after-close "today" is legitimately empty). It now scans the
  full **14-day horizon** and, when the requested day is full/past, returns the
  **next available times** (`rolled_forward=true`) with a note to offer them and name
  the day. **Engine + hours were correct** (verified 112 open slots/7 days); this was
  the tool's day-scoping.

---

## 5. 🔴 Google Calendar connection is BROKEN (in progress)

- Connection `status = error`, `cal=primary`. Root cause: **Google's 7-day
  refresh-token expiry while the OAuth app is in "Testing" publishing status**
  (connected June 14 → died ~day 7–9). Known M9 caveat biting.
- **Impact:** bookings **still work** (saved in our DB, shown on the dashboard) but
  **don't sync to Google Calendar**; availability is unaffected (falls back to
  business hours + DB appts — `isConnected()` requires `status==='connected'`, so an
  error connection is cleanly skipped).
- **Reconnect path (was walking the operator through this when we paused):**
  **Settings → Calendar booking → Disconnect, then Connect** (`/dashboard/settings`,
  `connectGoogleCalendar`/`disconnectGoogleCalendar` actions → `/api/google/callback`).
  The consent URL already forces `access_type=offline` + `prompt=consent`
  (`oauth.ts`), so a **fresh refresh token is issued** on reconnect. Will re-expire
  every ~7 days until the OAuth app is **published** (post-launch Google-verification
  item).

---

## Next session — pick up here

1. **Finish the Google Calendar reconnect** (Settings → Calendar booking →
   Disconnect → Connect; expect the "unverified app" interstitial — proceed). Then
   re-run `node scripts/m9-verify.mjs` to confirm `status=connected` + a test booking
   syncs to Google. (Optional but recommended: publish the OAuth app to kill the
   7-day expiry — folds into the post-launch Google-verification work.)
2. **Resume the red-team** (`RED_TEAM_TRACKER.md`). So far call 8 = PASS (reframed),
   call 9 booking fixed (retest the roll-forward). Work through all 25.
3. **When calls 1–15 pass at 0% hallucination → Stripe live flip** (unchanged
   sequence): Claude removes the `getStripe()` `sk_test_` guard
   ([src/lib/billing/stripe.ts:17](src/lib/billing/stripe.ts:17)) + pushes → operator
   adds `sk_live_`/`pk_live_` to Vercel → re-runs `/admin/billing-setup` in live mode
   → copies the **new live webhook signing secret** into Vercel `STRIPE_WEBHOOK_SECRET`.
4. **After the calls, wipe test data:** `node scripts/redteam-wipe-number.mjs
   2164151568 --confirm` (or the full-CRM `redteam-cleanup.mjs`).

---

## Still open (not blockers)

- Pronunciation dictionary (needs operator's exact mis-said words).
- Faster-LLM latency swap (`gpt-4.1` → faster) — fold into red-team.
- Post-launch: `docs/post-launch-onboarding.md` (radius/home-base in the setup
  wizard + extend knowledge-upload extraction to zones/surcharges); **Phase 16
  premium channels** (RCS → Apple Messages → WhatsApp) added to the vision roadmap
  (`~/.claude/plans/first-before-m10-we-snappy-deer.md`); publish the Google OAuth app.

---

## Commits this session (in order)

`2cddab7` find_tow_destination + red-team kit · `ef621b9` docs (tool + 5-zone/40mi) ·
`9f31f44` proactive quoting · `c4b68f6` immediate-dispatch vs scheduled + no waitlist ·
`b2ff557` dispatch ETA wording · `9097392` availability roll-forward.

**New read-only diagnostics used (not committed):** ad-hoc scripts for zone/hours/
availability/places checks (written + removed inline). Working tree: `RED_TEAM_TRACKER.md`
has an uncommitted call-8 row tweak — fine to commit next session.

---

## Cross-cutting notes

- **Workflow:** Vercel auto-deploys on push to `main`; prompt/tool changes re-sync
  the live Retell agent lazily on the next call. Pricing/zone changes are **live DB
  data** (no deploy). Migrations via Supabase SQL editor (none needed this session).
- **Margin discipline:** find_tow_destination is pay-per-use (~$0.037, only on a
  nearest-shop ask) inside Google's $200/mo free credit; no other new per-unit cost.
- **§5.1 held throughout:** every price still computed by `calculate_quote`; the new
  tool only returns destinations, never prices.
