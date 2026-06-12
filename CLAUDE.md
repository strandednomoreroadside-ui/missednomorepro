# CLAUDE.md — Missed No More Pro OS

Multi-tenant SaaS: AI receptionist + field-service OS for local service businesses (1–15 employees). The operator is a **non-developer** — Claude codes everything; they handle accounts, keys, payments, and test calls. Explain things in plain English.

## The two source-of-truth documents

1. **BUILD_GUIDE.md** — the milestone roadmap (M0–M10). Always know which milestone we're on; never build ahead of it.
2. **docs/master-plan-v3.md** — the full product spec (schema §8, security §9, AI tool contracts §10, phases §11, pricing §6).

## Current state (update this section as milestones complete)

- ✅ M1 scaffold: Next.js 16 + TS strict + Tailwind v4 + shadcn-style components, brand theme, landing page, legal pages (drafts — finalize at M10), env validation
- ✅ M0 accounts: Vercel/Supabase/Stripe/Twilio/OpenAI all exist (user, June 2026). Remaining: domain (confirm), fill `.env.local`
- ✅ A2P 10DLC: **already approved** on the Twilio brand — no SMS-registration wait; attach number to the approved campaign at M6
- ✅ Voice engine: **decided — Retell (Path A)**, June 2026. Still build the §3.1 provider adapter so OpenAI Realtime direct stays swappable. `VOICE_PROVIDER=retell`, key in `RETELL_API_KEY`
- ✅ M1 complete: deployed on Vercel (git auto-deploy connected), domain `missednomorepro.com` live, all env vars in Vercel, Twilio number owned (+14406442423), `.env.local` filled
- ✅ M2 complete (June 2026): auth + orgs + RLS live in prod; migration applied via SQL-editor paste (table grants included — SQL editor didn't apply default privileges, explicit grants required); **leak test passed 8/8** (`scripts/leak-test.mjs` — rerun before beta)
- 🔶 M3 in progress: **code complete** — Checkout, Customer Portal (API-configured), signature-verified idempotent webhook, billing migration (subscriptions/plan_limits/usage_events), feature-gate + usage-limit helpers, billing page with usage, dashboard locked-features card, and `/admin/billing-setup` (one-tap Stripe setup — operator works from phone, no local scripts). **Remaining (operator, phone browser):** paste `20260612090000_billing.sql` into Supabase SQL editor → run setup at `/admin/billing-setup` → add `STRIPE_WEBHOOK_SECRET` to Vercel + redeploy → test-subscribe with 4242 card
- ℹ️ DB migrations: applied by pasting the migration file into the Supabase SQL editor (clipboard flow). Supabase CLI not authenticated; `SUPABASE_DB_PASSWORD` in .env.local still empty

## Hard rules (from master plan §5.1, §9, §10 — never violate)

- `tenant_id` + RLS on **every** tenant-owned table; service-role key never in client code
- AI never: claims to be human, invents prices, takes card numbers by voice, books outside approved windows, texts opted-out contacts
- Every risky AI action goes through a §10 backend tool with server-side validation + audit log
- Webhooks (Stripe/Twilio): signature-validated + idempotent, always
- Stripe stays in **test mode** until M10
- Scope discipline: pricing engine, deposits, dispatch, invoicing, reviews, reporting, command center are **post-MVP** — do not build early

## Conventions

- App Router server components by default; `src/` layout; `@/*` imports
- Brand: dark-first only. Tokens in `src/app/globals.css` from `brand/missed_no_more_pro_brand_colors.txt` (night `#020817`, navy `#0A1B3D`, cyan `#00E5FF`, blue `#006BFF`, steel `#A7B0C0`). Fonts: Bricolage Grotesque (display) / Instrument Sans (body) / IBM Plex Mono (numbers, labels)
- Env vars: add to `src/lib/env.ts` schema + BUILD_GUIDE template together; everything optional until its milestone needs it
- Verify before done: `npm run build` + `npm run typecheck` pass; commit per milestone step
- Budget: ~$50–70/mo until revenue — prefer free tiers, flag anything that costs money **before** doing it
