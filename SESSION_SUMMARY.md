# Session Summary — Missed No More Pro (Aug 14, 2026 · Site-audit fixes shipped)

**All shipped, committed, and pushed directly to `main`** from a mobile Claude
Code session. A third-party site audit (heycatch.ai) scored the marketing
site; every below-max finding that could be fixed from the repo was fixed.
Two things are researched but NOT built: a JobNimbus/ServiceTitan CRM
integration (see below) and nothing else pending.

**Commits on `main`:**
- `d006286` — Site-audit pass: hero wedge, real `/pricing` + `/about`, CTA
  hierarchy, FAQ/SEO gaps
- `86c6cac` — Clarify founding-offer wording (named the actual free add-on
  instead of "every add-on")

build ✅ · typecheck ✅ · pushed ✅ · no migration needed for either commit

---

## ▶ Next session — start here

### Operator items still open (not code)
- **Re-run the heycatch.ai audit** against the live site once Vercel has
  redeployed, to confirm the score deltas on D1.1, D1.2, D1.4, D1.6, D2.2,
  D2.4, D3.1, D3.3, D5.1, D5.3, D5.5, and "Brief fit."
- **Send 2-3 real testimonials** (name, trade, city, quote) — this is the
  single biggest lever left (D3.2 was 1/7, the lowest-scoring finding on the
  whole audit, and can't be fixed with more code, only real customer proof).
- **Send your name, a headshot, and your LinkedIn URL** for `/about` — the
  page is written to drop them in without a rewrite (see the comment near
  the top of `src/app/about/page.tsx`).
- **Product Hunt / press / review-site presence** (D3.5, was 0/3) — nothing
  to build until a real listing or mention exists.

### JobNimbus / ServiceTitan integration — researched, not built
Operator asked what it'd take to add these (closing the "no native
integrations" objection from ICP2 reviewers). Findings, in case this gets
picked up next session:

- **Quick win available today, zero new code:** MNMP already ships generic
  outbound webhooks (`/dashboard/integrations`, Professional+, fires on
  `lead.created`/`appointment.booked`/`job.completed`/`payment.received`),
  and both JobNimbus and ServiceTitan already have Zapier apps with
  "Create Contact"/"New Booking" actions. A short setup guide for each
  (docs, no code) would let customers wire this up immediately.
- **JobNimbus (native, ~1 build session):** self-serve per-customer bearer
  API key, no partner approval needed. Endpoints: `/contacts`, `/jobs`,
  `/tasks`, `/estimates`, `/invoices` at `app.jobnimbus.com/api1/`. Docs are
  thin (Postman collection only, no sandbox, unpublished rate limits — graded
  "C" by third-party API trackers), so expect live trial-and-error. Maps
  cleanly onto two patterns already in the codebase: encrypted per-business
  credential storage (the `calendar_connections` pattern from Google
  Calendar) and the retry/backoff HTTP delivery already in
  `src/lib/webhooks/deliver.ts`. Recommended scope: **push-only**
  (MNMP → JobNimbus, new leads/jobs land there automatically) — doesn't touch
  the live call-answering path, so no risk to the working AI receptionist.
  Pulling JobNimbus data into MNMP's CRM for caller lookup is a separate,
  riskier project (touches `contacts`, needs real dedup) — not recommended
  as a first step.
- **ServiceTitan: a business decision, not an engineering one, yet.** Access
  is gated behind a formal App Marketplace Partner Program — signed
  agreement, an Information Security Review, tiered annual dues, and either
  a per-tenant connection fee or revenue share. No published approval
  timeline. Recommend validating real demand (e.g. a "request this
  integration" link) before spending partner-program money — ServiceTitan
  customers skew toward the larger multi-crew operations that sit past
  MNMP's declared "1–15 person, not enterprise" positioning.
- **Recommended order if this gets picked up:** (1) write the two Zapier
  guides, (2) build the native JobNimbus push integration, (3) hold
  ServiceTitan until a paying customer specifically asks.

---

## What shipped this session

### 1. Site-audit fixes (`d006286`)
A professional site audit (positioning, conversion clarity, trust, pricing,
SEO dimensions) was worked dimension-by-dimension, lowest-scoring first,
since the audit page had no action plan to follow. Every finding scored
below its max was reviewed; only those with an actual described defect were
touched (three findings — D2.1, D2.3, D2.5 — were below max but had purely
positive one-line findings with nothing to fix, so were left alone).

- **Positioning (D1.x):** hero H1 now leads with the deterministic-quote
  differentiator instead of the category-generic "never miss a call" framing
  every competitor uses; added the wasted-ad-spend angle for HVAC/plumbing/
  electrical owners running Google/LSA ads; new FAQ item rebuts the
  "will the AI fumble a complicated call" objection; plain-language "AI
  minute" definition next to the plan cards.
- **Conversion (D2.x):** the site had two competing top-of-funnel CTAs (a
  "founding access" mailto and a self-serve "Start free trial") — unified to
  the self-serve path everywhere except the Enterprise "Talk to us" tier,
  which legitimately needs a sales conversation. Also: `/pricing` and
  `/about` both 404'd; both are now real pages via a new shared
  `MarketingShell` component.
- **Trust (D3.x):** the showcase's mock revenue-dashboard tile now says
  "Sample data" instead of implying it's live. Real quantity/story/
  third-party proof (D3.1/D3.2/D3.5) needs actual customers and can't be
  faked — flagged for the operator, not stubbed with placeholder content.
- **SEO (D5.x):** found and fixed a real bug along the way — privacy/terms/
  sms-terms/signup/login were all silently inheriting the root layout's
  `canonical="/"` instead of pointing at themselves, meaning every one of
  those pages was telling Google to index the homepage in its place. Added
  FAQPage JSON-LD schema and `public/llms.txt`.

Full finding-by-finding change log with "was" scores was posted in-chat;
CLAUDE.md's Current State log carries the same detail for future reference.

### 2. Founder-offer wording fix (`86c6cac`)
Operator flagged the founding-offer copy as confusing and suggested "you
get all the features in the Growth Suite bundle for free." Checked
`src/lib/billing/addons.ts` first: `growth_suite_bundle` is `retired: true`
— two of its three original components are already free for every
customer, not a founder-exclusive perk, so using that name would reintroduce
the same confusion pointing at a product that doesn't really exist anymore.
Reworded both the landing pricing banner and the billing-page founder card
to name the actual current paid add-on (AI Outbound Assistant, "plus
anything we add later") and adopted the "lifetime of your subscription, as
long as it stays continuously active" phrasing that was requested.

### 3. JobNimbus/ServiceTitan integration research
See "Next session — start here" above. Pure research, no code changed.

---

## Cross-cutting notes (unchanged)
- Push to `main` → Vercel auto-deploys; prompt/tool changes re-sync the live
  Retell agent lazily on the next call. Neither commit this session touched
  the voice prompt, so no re-sync is pending from tonight's work.
- Stripe stays **LIVE** in prod; `.env.local` stays **test**.
- §5.1 held throughout — the AI never speaks an un-computed number; nothing
  this session touched voice/pricing logic at all (marketing-site copy and
  routing only).
- DB migrations applied by pasting into the Supabase SQL editor (CLI not
  authenticated). Neither commit this session needed one.
- Parallel cloud sessions can push to GitHub — `git fetch` + reconcile before
  pushing.
