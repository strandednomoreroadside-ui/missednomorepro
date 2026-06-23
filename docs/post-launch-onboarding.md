# Post-launch: self-serve onboarding improvements

**Status:** planned — build *after* the Stripe live flip + red-team pass. Neither
affects the current live business (already fully configured). Both close gaps in
the experience for *new* businesses signing up by themselves, which is the
product goal ("a business uploads their info and the app fills itself out").

Grounded in the code as of June 2026. Two independent workstreams.

---

## Gap 1 — Service area (radius + home base) isn't in the setup wizard

### What's true today
- **Setup wizard step 5** ("Service area") only captures a **ZIP / city list**
  → `service_areas` table
  ([src/app/dashboard/setup/actions.ts:167](../src/app/dashboard/setup/actions.ts)).
- The **radius** (`pricing_settings.max_service_miles`, default 25) and the
  **home-base address** (`pricing_settings.base_address` + geocode) are only
  settable later on **Knowledge Hub → Prices & Services** (`/dashboard/pricing`)
  via `setHomeBase` / `updateServiceRadius`
  ([src/app/dashboard/pricing/actions.ts:63](../src/app/dashboard/pricing/actions.ts)).
- `check_service_area` prefers **driving-distance ≤ radius** when a home base +
  Maps exist, and **falls back to the ZIP/city list** otherwise.

### The gap
A new business that only does the wizard never sets a home base or radius, so:
- they're stuck on the **default 25-mile** radius without knowing it exists, and
- the accurate radius-based service-area check never activates — they silently
  run on the coarser ZIP/city fallback.

### The fix
Add a **home-base + radius** capture to onboarding (either a new sub-step or
folded into step 5):
- Inputs: home-base **address** (required for distance math) + **radius in
  miles** (default 25, editable).
- On save: upsert `pricing_settings.base_address` + `max_service_miles`, then
  **geocode** the address immediately (reuse `geocodeAddress` from
  `src/lib/maps/client.ts`) so `base_lat/lng` are populated.
- Keep the ZIP/city list as an **optional fallback** (and for businesses without
  a Maps key).
- Surface the radius read-only on the launch/review screen.

### Touch points
- `src/app/dashboard/setup/actions.ts` (step 5 handler — add the base/radius write)
- `src/app/dashboard/setup/_components/lists.tsx` (the service-area UI)
- `src/app/dashboard/setup/_components/launch.tsx` (show radius in the summary)
- No migration (columns already exist on `pricing_settings`).

### Watch-outs
- Geocode can fail (bad address) — handle like `approvePricing` does (bounce with
  a reason; don't store a half-set base).
- Don't auto-enable quoting from the wizard — quoting still requires the explicit
  pricing approval (see Gap 2 + §5.1).

---

## Gap 2 — Knowledge-Hub upload only fills FAQs + service prices (not the whole engine)

### What's true today
The upload → extract → approve flow
([src/lib/knowledge/extract.ts](../src/lib/knowledge/extract.ts),
[src/app/dashboard/knowledge/upload/actions.ts](../src/app/dashboard/knowledge/upload/actions.ts))
fills exactly two things, each behind a human **Approve** (deliberate — §5.1, the
AI never invents prices):
- ✅ **FAQs** → `faqs`
- ✅ **Services with prices** → `service_pricing` (flat fee, or tow = hook +
  per-mile)

It does **not** extract or fill:
- ❌ dispatch **zones** (`pricing_zones`)
- ❌ **surcharges** (`pricing_surcharges`)
- ❌ **business hours**, **service area / radius**, **home-base address**

And critically: even after approving uploaded services, **quoting stays OFF**
until the owner goes to `/dashboard/pricing` and clicks **Approve**, which itself
needs a home base + ≥1 zone + ≥1 active service. So an uploaded price sheet gets
the *service menu* in, but the business still can't *quote* without manual zone +
home-base setup.

### The fix (phased)

**2a. Extend extraction to zones + surcharges.**
- Add `zones` and `surcharges` to the extraction JSON schema + system prompt in
  `extract.ts` (model only transcribes what's written — never computes/infers a
  fee, same guardrail as services).
- New suggestion `kind` values `'zone'` / `'surcharge'`; relax the
  `knowledge_suggestions.kind` check constraint (migration).
- `applySuggestion` (in `upload/actions.ts`) inserts approved rows into
  `pricing_zones` / `pricing_surcharges`.
- Reality check: zones are distance bands the model can only get from an explicit
  sheet. When the doc has none, fall through to 2b rather than guessing.

**2b. A "Finish pricing setup" guided step after upload.**
- After approving suggestions, route the owner through a short confirm flow:
  confirm **home base** (prefill from Gap 1), confirm/edit **zones** (offer a
  sensible default ladder they can tweak), then **one-tap Approve** → quoting on.
- This makes "upload a sheet → quote-ready" a single guided path instead of the
  owner hunting across pages.

**2c. Completeness checklist on the Knowledge Hub.**
- Show "N steps to start quoting" (home base ✓/✗, ≥1 zone ✓/✗, ≥1 service ✓/✗,
  approved ✓/✗) so the owner always sees what's left. Never auto-enable quoting.

### Touch points
- `src/lib/knowledge/extract.ts` (schema, prompt, types, line-cap)
- `src/app/dashboard/knowledge/upload/actions.ts` (`applySuggestion` new kinds)
- migration: widen `knowledge_suggestions.kind` check
- `src/app/dashboard/knowledge/page.tsx` (completeness checklist)
- reuse `approvePricing` for the final one-tap enable

### Margin / safety
- Text-only LLM extraction (already `gpt-4.1-mini`) — pennies, capped line items.
- Keep the human-approval gate; never let an upload flip quoting on by itself.

---

## Build order when we pick this up
1. **Gap 1** first (small, no migration, immediately improves every new signup).
2. **Gap 2a** (extraction → zones/surcharges) — needs a small migration.
3. **Gap 2b/2c** (guided finish + checklist) — the polish that ties it together.
