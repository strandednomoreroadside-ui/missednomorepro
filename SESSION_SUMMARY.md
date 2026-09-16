# Session Summary — Missed No More Pro (Sep 16, 2026 · 3-tier repricing, voice tuning, self-serve phone setup)

**All shipped, committed, and pushed to `main`** from a remote (non-local)
Claude Code session — the operator was away from their local machine the
whole session, so every migration below is still sitting as a file, not yet
pasted into the Supabase SQL editor. That's the main thing next session (or
the operator, once local) needs to close out.

**Commits on `main`:**
- `a4cca11` — Reprice to 3 tiers at $50/$100/$200, fold every add-on in free
- `77dde13` — Strip all "new/lower price" framing from customer-facing copy
- `80c9e6d` — Voice naturalness pass: enable backchannel + add ambient office sound
- `adafe96` — Add scripts to register + apply the cloned ElevenLabs voice
- `a55b33e` — Fold phone number setup into the wizard so self-serve is 100% covered
- `df9e1da` — Track the two newest migrations in the pending-migrations checker

build ✅ · typecheck ✅ · vitest 42/42 ✅ · pushed ✅ · **2 migrations pending**

---

## ▶ Next session — start here

### Migrations — apply these first; the phone-step one is urgent
Both are already **live in the deployed code** (pushed to `main`, Vercel
auto-deploys) but **not yet applied to the database**. Full copy-pasteable
SQL for both, plus a read-only "what's actually applied" checker query, was
posted in-chat this session and lives in `docs/pending-migrations.md`.

1. **`20260916090000_setup_wizard_phone_step.sql` — apply this one first.**
   The deployed code already renders a "Phone number" step in the setup
   wizard and tries to save progress against it. The database's
   `save_setup_progress` RPC still has the OLD step whitelist, which does
   not include `"phone"` — so **right now, any real customer who reaches
   that step and clicks Continue gets a hard error** ("unknown wizard
   step: phone") until this migration lands. This is the urgent one, not
   just a nice-to-have.
2. **`20260915090000_plan_retier_3tier.sql`.** Until this runs:
   - `plan_limits.monthly_minutes` is still 250/500/900 (old values), not
     the new 200/400/800 — customers get MORE minutes than advertised,
     not fewer, so this direction is customer-safe but still wrong.
   - `outbound_assistant` is NOT yet in any plan's `feature_flags_json`,
     so even though the UI and landing page already say "every add-on
     included free," a tenant's `ent.has("outbound_assistant")` check
     still returns false — **the feature is advertised but not actually
     unlocked** until this migration runs. Worth prioritizing over
     "eventually."
3. After #2 lands, **re-run `/admin/billing-setup`** so Stripe creates the
   new $50/$100/$200 prices — it auto-detects the old $79/$159/$279
   prices are stale and archives them (same mechanism that handled the
   last price cut).

### ElevenLabs voice clone — waiting on the operator, not on more code
Operator has a cloned voice (`mR1Sw5fKViIYihlMg7me`) but no Retell
voice_id yet, and this sandbox has no live `RETELL_API_KEY`/Supabase
credentials to run the scripts. Two scripts are ready on `main`:

1. `node scripts/register-elevenlabs-voice.mjs mR1Sw5fKViIYihlMg7me "<display name>"`
   — registers it with Retell, prints the resulting voice_id + a preview
   URL. If it errors asking for a `public_user_id`, that means it's a
   private clone — find that in the ElevenLabs account settings and
   re-run with it as a third argument.
2. **Listen to the preview before going further** — ideally on the
   `eleven_flash_v2_5` model specifically (what live calls actually use),
   since some clones sound different on the fast model.
3. `node scripts/apply-cloned-voice.mjs "<voice_id from step 1>"` — points
   Stranded No More's live agent and the Summit Home Services demo agent
   at it. Safe to re-run, no redeploy needed (voice_id feeds
   `prompt.ts`'s promptHash, so `syncAgent` re-syncs on each tenant's next
   call).

Needs a real Node environment with the project's secrets. The operator
asked how to do this from mobile; the answer (a Claude Code environment
with env vars configured, or GitHub Codespaces as a fallback) was covered
in-chat this session, not written to a file.

### Not yet verified on a live call
Nothing this session touched voice/pricing logic broke on typecheck/build,
but the backchannel + ambient sound tuning (see below) has not been heard
on a real call — worth a test call (public demo line or Test My AI) once
the operator is back, to confirm backchannel timing doesn't sound off and
the ambient sound is present-but-not-distracting.

---

## What shipped this session

### 1. Repriced to 3 tiers: Starter $50 / Growth $100 / Professional $200 (`a4cca11`, `77dde13`)
Operator's explicit call: trade margin-per-account for signup volume while
the product is still building its first case studies/testimonials — full
margin math (worst-case vs. blended, at 100%/50%/30% utilization) was
worked in-chat before implementing, not guessed.

- Elite ($479/1,500min) retired from self-serve but kept **fully intact**
  in `plans.ts` and `plan_limits` (`PLAN_META.elite.retired = true`) —
  deleting it would have made `effectivePlan()`'s stale-id guard resolve
  any existing Elite subscriber to `"none"` and lock them out. New
  `SELF_SERVE_PLAN_ORDER` drives every checkout button, Stripe sync, and
  plan-deep-link check; `PLAN_ORDER` stays the full list because
  `sync.ts`'s Stripe webhook plan-resolution still needs to recognize
  `"elite"` for existing subscribers' renewals.
- Minutes: 200/400/800 — sized so worst-case (100% utilization) gross
  margin stays positive (~31-36%) against the app's actual modeled voice
  cost ($0.15/min, `cost-controls.ts`), not just on a realistic-usage
  average. There's no metered overage, so included minutes are a hard
  ceiling on cost, not a soft one.
- `outbound_assistant` (the last paid add-on) folded in free everywhere,
  same pattern as July's fold of the other four. `PURCHASABLE_ADDON_ORDER`
  is now empty; the billing page hides the "Add-ons" section instead of
  rendering it blank; `addAddon()` now server-side rejects any retired
  add-on key (closes a pre-existing gap where a crafted POST could have
  paid for something already free — found while widening the retired
  set, not something introduced this session).
- Founder offer re-pointed from "free add-ons" to a **price lock for
  life**, since every add-on is free for everyone now anyway — the
  mechanism is unchanged (Stripe just never reprices an existing
  subscription on its own); `founder.ts`'s add-on grant stays wired for
  any *future* paid add-on.
- Second pass (`77dde13`) at operator request: stripped every "new lower
  price" / "was $79, now $50" framing site-wide — the `previousMonthly`
  field was removed entirely (it only ever existed to drive that
  strikethrough), landing banners rewritten to state pricing as a plain
  fact, and the Rosie comparison page's whole argument rewritten since
  $50 vs. Rosie's $49 is now near-parity, not the real gap the old copy
  was built around.
- Swept and fixed stale `$79`/`Elite`/JSON-LD `lowPrice`/`highPrice`
  references across `/pricing`, all four `vs/*` comparison pages,
  `/ai-phone-assistant`, the landing ROI calculator, and `llms.txt` —
  found by grep, not assumed from memory.

### 2. Voice naturalness pass (`80c9e6d`)
Two of three ideas discussed earlier in the conversation (the third,
cloned voice, needed operator input — see above). Both fields verified
directly against the installed `retell-sdk` types
(`node_modules/retell-sdk/resources/agent.d.ts`) rather than guessed.

- `enable_backchannel`: false → true. `backchannel_frequency` and
  `backchannel_words` left unset (Retell's own defaults) — no live-call
  data yet to justify picking different values.
- Added `ambient_sound: "call-center"` at a low `ambient_sound_volume`
  (0.3 of the real [0,2] range) so the line has a faint office presence
  instead of dead silence, without competing with the noisy-roadside-
  caller denoising already tuned above it.
- Bumped `TUNING_VERSION` 16 → 17 (`prompt.ts`) — both changes are pure
  Retell agent-level config with no prompt-text change, so without the
  version bump `syncAgent`'s promptHash short-circuit would have skipped
  re-syncing every already-provisioned tenant agent.

### 3. ElevenLabs voice-clone registration scripts (`adafe96`)
Checked the actual `retell-sdk` `voice` resource before writing anything —
a raw ElevenLabs voice ID is NOT a valid Retell agent `voice_id` on its
own; it must be registered first via `voice.addResource`, which returns
Retell's own id. Two scripts, deliberately split with a manual checkpoint
between them (listen to the preview before it reaches a live phone line)
— see "Next session" above for the exact run order. Neither could be
executed in this sandbox (no live credentials); verified everything that
could be checked without them (`node --check`, usage/argument-validation
paths exercised directly, `retell.voice.addResource` confirmed to be a
real callable method at runtime).

### 4. Phone number setup folded into the wizard (`a55b33e`)
Operator goal: a new customer should be able to set the whole system up
themselves, in minutes, without ever needing to reach out — phone number
setup was the one real gap (it only lived on a standalone
`/dashboard/numbers` page the wizard never mentioned or linked to, even
though `onboarding/page.tsx`'s own copy already promised "your phone
setup in the wizard").

- New required "Phone number" step (last content step, right before
  Review & Launch): explains both paths in plain language side by side —
  get a new number to hand out, or claim any number (doesn't matter
  which, customers never dial it) to forward an existing number to —
  plus a condensed carrier-code cheat-sheet, linking to the existing full
  guide for porting/edge cases rather than duplicating it.
- Reuses `dashboard/numbers`' own `ProvisionNumber` picker and
  `provisionEligibility` check directly — nothing about Twilio
  provisioning was rebuilt.
- Handles the real sequencing gap gracefully: claiming a number needs a
  card on file, but a customer can reach the wizard before starting a
  trial. Explains "start your free trial first" with a direct link
  rather than a dead end, and still lets them continue through the rest
  of the wizard in the meantime.
- Found and updated the **actual DB-enforced launch gate**
  (`app.setup_complete`), not just a UI checklist — a business can no
  longer go live without a phone number, the same way it already can't
  without hours or a service area. Also had to widen
  `save_setup_progress`'s step whitelist (found by reading the actual
  RPC, not assumed) — see the urgent migration note above for why this
  matters right now.
- Confirmed via the `retire_wizard_pricing_gate.sql` precedent that a
  launch-gate change like this only fires on the transition *into* live,
  so it can't retroactively affect Stranded No More or the Summit Home
  Services demo — both already live with numbers.

### 5. `docs/pending-migrations.md` kept current (`df9e1da`)
Added both of this session's migrations to the read-only "what's actually
applied" checker query (new `phonegate` detection kind: presence, not
absence, of `phone_numbers` in `app.setup_complete`'s body) so the doc
doesn't silently go stale as the source of truth for migration status.

---

## Cross-cutting notes (unchanged unless noted)
- Push to `main` → Vercel auto-deploys; prompt/tool changes re-sync the
  live Retell agent lazily on the next call. No manual re-sync trigger
  exists or is needed for this session's voice tuning.
- Stripe stays **LIVE** in prod; `.env.local` stays **test** (this
  session's repricing did not touch that — same `getStripe()` behavior as
  before).
- §5.1 held throughout — nothing this session touched how a price is
  computed or spoken, only what tiers/minutes/framing surround the same
  unchanged `calculate_quote` engine.
- DB migrations are applied by pasting into the Supabase SQL editor (CLI
  not authenticated) — **this session specifically had no local-machine
  access at all**, so unlike most prior sessions, migrations were handed
  to the operator as copy-pasteable text in-chat rather than applied
  mid-session. Both are still outstanding — see "Next session" above.
- This session ran as a fully remote/cloud session (no `.env.local`, no
  `node_modules` present at start). Build/typecheck/test verification
  used placeholder Supabase env vars passed inline to `npm run build`
  purely to get past static-generation guards; nothing placeholder was
  ever committed.
