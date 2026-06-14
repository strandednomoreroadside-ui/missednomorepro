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
- ✅ M3 complete (June 12 2026): Stripe test-mode billing live — 5 plans (monthly+annual), Checkout, Customer Portal (API-configured), signature-verified idempotent webhook, plan_limits/subscriptions/usage_events in prod, feature-gate + usage-limit helpers, billing page with usage, dashboard locked-features card. Operator verified: 4242 test subscription, portal, locked features. `/admin/billing-setup` = one-tap Stripe setup + live status checks (requires `ADMIN_EMAILS` in Vercel). Webhook signing secret lives in Vercel env (`STRIPE_WEBHOOK_SECRET`); retrievable anytime in Stripe dashboard → Webhooks → reveal
- ✅ M4 complete (June 12 2026, operator-verified): setup wizard at `/dashboard/setup` — 10 steps, saved progress (operator confirmed mid-wizard resume works), DB-enforced launch gate (trigger + `launch_business`/`approve_setup_section` RPCs; approval stamps not writable by clients), admin sees incomplete setups
- ✅ M5 complete (June 12 2026, operator-verified): CRM at `/dashboard/contacts` — contacts (tags, §8.3 consent fields, phone unique per tenant for M7 caller matching), leads, notes, tamper-proof timeline (trigger-written, clients read-only). **Leak test passed 18/18** — rerun before beta
- ✅ M6 complete (June 13 2026, operator-verified): phone_numbers/agents/calls/call_transcripts tables (members read-only; server writes); signature-validated Twilio voice webhook `/api/twilio/voice` (greeting + voicemail-to-log, known-caller matching to CRM, timeline event on call end) + `/status` + `/recording` callbacks; voicemail playback proxy `/api/recordings/[callId]`; `/dashboard/calls` + `/dashboard/settings`; admin number assignment; `scripts/twilio-setup.mjs` pointed +14406442423's webhooks at prod. Operator placed a real test call — greeting answered, call logged. **Leak test passed 21/21** (`scripts/leak-test.mjs`, now incl. M6 checks 15-16) — rerun before beta. Next: M7 builds the Retell integration on top of this phone foundation
- 🚧 **M7 code-complete, NOT yet call-verified** (June 13 2026): the AI receptionist. Built: §3.1 voice adapter (`src/lib/voice/*`, Retell impl on `retell-sdk` 5.36, OpenAI Path B stub, factory keyed on `VOICE_PROVIDER`); per-tenant prompt builder baking in §5.1 hard rules (`prompt.ts`, lazy re-sync via prompt hash stored on `agents`); 8-tool §10 router at `/api/voice/tools` — lookup_contact, create_contact, search_knowledge_base (wizard FAQs), check_service_area, notify_staff (**Twilio voice call** until M8 SMS), escalate_to_human, mark_spam, create_follow_up_task — **tenant resolved from the call row, never from LLM args**, zod-validated, audit + `tool_calls` logged; encrypted-raw + redacted-display transcripts (`crypto.ts`/`redact.ts`/`finalize.ts`, §9); disposition derived from AI actions; per-minute metering into `usage_events`; call-summary UI `/dashboard/calls/[id]`; Retell agent provisioning + `registerPhoneCall` + Twilio↔Retell media-stream bridge in `/api/twilio/voice` (M6 greeting is the graceful fallback when not live / AI off / error); secret-authed idempotent webhook `/api/voice/retell/webhook`. Migration `supabase/migrations/20260613120000_ai_receptionist.sql` (agents/calls extensions, `follow_up_tasks`, `tool_calls`). Secrets `INTERNAL_API_SECRET` + `TRANSCRIPT_ENCRYPTION_KEY` generated → in `.env.local`. **build + typecheck green.** Pending operator before the 10-call test: (1) paste the migration into the SQL editor; (2) add the 2 new secrets to **Vercel** + confirm `NEXT_PUBLIC_APP_URL` is the prod domain there (Retell must reach our URLs); (3) ensure "Stran's Towing" is **launched** with +14406442423 assigned. Then run the BUILD_GUIDE M7 10-call test. TODO before beta: extend `scripts/leak-test.mjs` for `follow_up_tasks` + `tool_calls`. Retell model `gpt-4.1` (tune in `retell.ts`); bridge wss URL is the one thing to confirm in `retell.ts` if a call connects but stays silent
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
