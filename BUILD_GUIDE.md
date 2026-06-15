# Missed No More Pro OS — The Build Guide

**Read this file top to bottom once. Then work one milestone at a time, in order.**

This guide turns `docs/master-plan-v3.md` (the *what*) into an exact sequence of steps (the *how*).
It is written for a non-developer working with Claude Code.

---

## How this guide works

Every milestone has three blocks:

| Block | Meaning |
|---|---|
| 🧑 **You do** | Steps only a human can do: create accounts, paste keys, approve spending, make test phone calls. |
| 🤖 **Claude does** | A prompt you copy-paste into Claude Code. Claude writes all the code. |
| ✅ **Done when** | Simple checks you can verify yourself. **Never move to the next milestone until every box is checked.** |

### How to start every work session

1. Open Claude Code in this folder (`Desktop\missednomorepro`).
2. Say: **"Read BUILD_GUIDE.md and CLAUDE.md. We are on Milestone ___. Let's continue."**
3. Claude picks up exactly where you left off.

### The Golden Rules

1. **One milestone at a time, in order.** No skipping ahead, no matter how exciting M7 looks.
2. **Never advance until "Done when" passes.** Half-working foundations collapse later.
3. **Secret keys go in ONE place: the `.env.local` file.** Never paste a secret key into a chat message, an email, or any other file. `.env.local` is git-ignored so it can never be uploaded by accident.
4. **Stripe stays in TEST mode until Milestone 10.** No real money moves during the build.
5. **When something breaks:** copy the *exact* error message and paste it to Claude Code with "fix this." See the Troubleshooting section at the bottom.
6. **Commit after every milestone** (Claude does this — work is saved like a video-game checkpoint).
7. **M7 (the AI receptionist) will take the longest. That is normal.** It is the hardest 20% and the core of the product.

### The roadmap at a glance

| # | Milestone | What you get | Rough time |
|---|---|---|---|
| M0 | Accounts & keys | All services ready | A weekend |
| M1 | Branded site live + A2P submitted | Your real website on your domain | 1–2 days |
| M2 | Auth & tenant isolation | Sign-ups, organizations, locked-down data | ~1 week |
| M3 | Stripe billing & plan gates | Customers can subscribe (test mode) | ~1 week |
| M4 | Setup wizard | Businesses onboard themselves | ~1 week |
| M5 | CRM | Contacts, leads, notes, timeline | 2–4 days |
| M6 | Phone foundation + voice decision | Your number answers with a greeting | 2–3 days |
| M7 | **The AI receptionist** | AI answers, qualifies, summarizes calls | 2–3 weeks |
| M8 | SMS & compliance | Texts, STOP/HELP, missed-call text-back | ~1 week |
| M9 | Calendar booking & jobs | AI books real appointments | ~1 week |
| M10 | Hardening & beta launch | Production-ready, first beta customer | 1–2 weeks |

**Total: roughly 2–3 months part-time.** Build cost: ~$15–50/month until revenue.

**Parked until revenue (do NOT build yet):** vector knowledge base, pricing engine, deposits, dispatch board, invoicing, review automation, month-end reporting, AI command center. They are Phases 5 and 9–15 in the master plan and they wait until paying customers exist.

---

## Milestone M0 — Accounts & keys

> **✔ Status update (June 2026):** Vercel, Supabase, Stripe, Twilio, and OpenAI accounts already exist, and the Twilio brand already has **A2P 10DLC compliance approved** — the biggest waiting-game of the whole project is already won. What's left of M0: buy the domain (if not done), make sure Twilio/OpenAI have a little funding, and collect all keys into `.env.local`.

**Goal:** every service account exists, keys are collected, nothing is built yet.
**Cost set up here:** ~$12/yr domain + $20 Twilio + $10 OpenAI ≈ **$42 once**, then ~$2/mo.

### 🧑 You do

Work through these in order. Save every key/password in a password manager (Bitwarden is free) or a private note — you will paste them into `.env.local` at the end.

**0. Already done on this PC ✓** — Node v24, npm, Git, and this repo. Python is not needed.

**1. GitHub** — you already have an account (SearchForge). Nothing to do.

**2. Buy a domain** (~$12/yr) — at Namecheap, Porkbun, or Cloudflare. Something like `missednomorepro.com`. Write down where you bought it; you'll point it at Vercel in M1.

**3. Vercel** (free "Hobby" plan) — [vercel.com](https://vercel.com) → "Sign up" → **Continue with GitHub**. That's it for now.

**4. Supabase** (free plan) — [supabase.com](https://supabase.com) → sign up with GitHub → "New project":
   - Name: `missed-no-more-pro` · Database password: generate a strong one and **save it** · Region: closest US region.
   - After it finishes setting up: Project Settings → **API**. Copy three things:
     - **Project URL** (looks like `https://xxxx.supabase.co`)
     - **anon / publishable** key (safe for browsers)
     - **service_role / secret** key (⚠️ server-only — treat like a bank password)

**5. Stripe** (free) — [stripe.com](https://stripe.com) → sign up. **Stay in Test mode** (orange "Test mode" toggle, top right — leave it ON). Developers → API keys → copy the **test** Secret key (`sk_test_…`) and **test** Publishable key (`pk_test_…`). Skip "activate your account" until M10.

**6. Twilio** (~$20) — [twilio.com](https://twilio.com) → sign up → verify your own phone. Then **upgrade out of trial**: click "Upgrade" and load **$20** (trial accounts can only call verified numbers and play a robot disclaimer — useless for us). Copy from the Console home page: **Account SID** (`AC…`) and **Auth Token**. Don't buy a phone number yet — that happens in M1.

**7. OpenAI** (~$10) — [platform.openai.com](https://platform.openai.com) → sign up → Billing → add **$10** credit → API keys → "Create new secret key" → copy it (`sk-…`). Shown only once.

**Deferred on purpose** (you'll create these later, the guide will tell you when): Google Cloud → M9 · Resend & Sentry → M10 · Retell/Vapi → M6 decision.

### 🤖 Claude does

Nothing in M0 — except: once you have your keys, open Claude Code and say:

> "I have my M0 keys ready. Create my `.env.local` from the template in BUILD_GUIDE.md and I'll fill in the values."

Claude creates the file; **you** paste the values in (Notepad is fine — the file lives at the project root).

### The `.env.local` template

```bash
# ── App ────────────────────────────────────────────────
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ── Supabase (M0) ──────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# ── Stripe TEST keys (M0; live keys not until M10) ─────
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# ── Twilio (M0/M1) ─────────────────────────────────────
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
# Optional: A2P Messaging Service SID (MG…) for staff-alert texts (M7+)
TWILIO_MESSAGING_SERVICE_SID=

# ── OpenAI (M0) ────────────────────────────────────────
OPENAI_API_KEY=

# ── Voice provider (filled at M6 decision) ─────────────
VOICE_PROVIDER=
RETELL_API_KEY=
VAPI_API_KEY=

# ── Google Calendar (M9) ───────────────────────────────
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# ── Email + monitoring (M10) ───────────────────────────
RESEND_API_KEY=
SENTRY_DSN=

# ── Internal (Claude generates these) ──────────────────
INTERNAL_API_SECRET=
# AES-256-GCM key (32 bytes, base64) — encrypts raw call transcripts (M7)
TRANSCRIPT_ENCRYPTION_KEY=
```

### ✅ Done when

- [ ] You can log in to Vercel, Supabase, Stripe, Twilio, and OpenAI
- [ ] Twilio shows "upgraded" (not trial) with ~$20 balance
- [ ] OpenAI shows ~$10 credit
- [ ] You own a domain
- [ ] `.env.local` exists with Supabase, Stripe (test), Twilio, and OpenAI values filled in
- [ ] Stripe is still in Test mode

---

## Milestone M1 — Branded skeleton, live site, A2P submitted

**Goal:** your real branded website is live on your domain, and the slow SMS-carrier paperwork (A2P) is submitted so it approves while you build.
*(Master plan: Phase 1 start, Tickets 1–2.)*

### 🤖 Claude does (this part is already done if Claude set up this guide)

> "Read BUILD_GUIDE.md (M1) and docs/master-plan-v3.md §3, §4 and Tickets 1–2. Scaffold the Next.js App Router project with TypeScript strict, Tailwind, shadcn/ui. Brand tokens come from brand/missed_no_more_pro_brand_colors.txt (dark-first: #020817 background, #0A1B3D surfaces, #00E5FF primary accent, #006BFF gradient partner). Build: a premium dark landing page using the logo in brand/, plus /privacy, /terms, and /sms-terms placeholder pages (clearly marked as drafts), plus environment-variable validation that doesn't crash when optional keys are missing. Verify `npm run build` passes and the dev server shows the landing page."

### 🧑 You do — put the site live

1. **Push to GitHub** — ask Claude: *"Push this repo to my GitHub account."* (If it can't, it will give you the 3 commands to run.)
2. **Deploy on Vercel** — [vercel.com](https://vercel.com) → **Add New… → Project** → Import `missednomorepro` → leave every setting as-is → **Deploy**. ~2 minutes later you get a live `*.vercel.app` URL.
3. **Connect your domain** — Vercel → your project → Settings → **Domains** → Add → type your domain → follow the DNS instructions it shows (you change a record at your domain registrar; takes minutes to a few hours).
4. **Buy your Twilio number** — Twilio Console → Phone Numbers → **Buy a Number** → pick a local number with Voice + SMS (~$1.15/mo). Put it in `.env.local` as `TWILIO_PHONE_NUMBER` (format: `+15551234567`).
5. **A2P 10DLC registration — ✔ already approved.** Your Twilio brand has A2P compliance, so there's no paperwork wait. Only remaining detail: when you buy your number, attach it to your approved Messaging Service/campaign (Claude will walk you through it at M6). The live /privacy and /sms-terms pages still matter — keep them up.

### ✅ Done when

- [ ] Your domain shows your branded landing page (check on your phone too)
- [ ] `yourdomain.com/privacy`, `/terms`, and `/sms-terms` all load
- [ ] You own a Twilio phone number and it's in `.env.local`
- [ ] A2P registration is **submitted** (status "in review" is fine — it approves in the background)

---

## Milestone M2 — Auth, organizations, tenant isolation

**Goal:** people can sign up, create their business organization, and one customer's data is mathematically invisible to every other customer (this is the #1 security requirement of the whole product).
*(Master plan: Phase 1, Tickets 3–7, §8.1, §9.)*

### 🧑 You do

Nothing to set up — Supabase is ready from M0. Your job is testing at the end.

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M2) and docs/master-plan-v3.md Phase 1, Tickets 3–7, §8.1 and §9. Build: Supabase client/server utilities; sign-up/sign-in/sign-out/password-reset pages styled with our brand; protected routes; database migrations for organizations, organization_members, businesses, and audit_logs with tenant_id and Row Level Security on every table; organization creation on first login; tenant switcher; dashboard shell and admin shell per §4 brand direction. Acceptance: Phase 1 criteria in the master plan. Then walk me through the cross-tenant leak test."

### ✅ Done when (the leak test — do this yourself)

- [ ] You can sign up as `you+companyA@gmail.com`, create "Company A", and see the dashboard
- [ ] In a private/incognito window, sign up as `you+companyB@gmail.com`, create "Company B"
- [ ] Company B's dashboard shows **zero** trace of Company A (and Claude shows you the automated RLS test passing)
- [ ] Logged-out visitors get redirected away from the dashboard

---

## Milestone M3 — Stripe billing & plan gates

**Goal:** businesses can subscribe to your 5 plans (Answer $99 / Book $199 / Revenue $349 / Scale $599 / Agency $899), manage billing themselves, and features unlock by plan. All in test mode.
*(Master plan: Phase 2, Tickets 8–13, §6.1, §7.)*

> **✔ Status update (June 2026):** code is built, including a phone-friendly path — no PC needed. Two steps from your phone's browser: **(1)** paste `supabase/migrations/20260612090000_billing.sql` into the Supabase SQL editor (same clipboard flow as M2 — open the file on github.com → Raw → select all → copy), **(2)** open `missednomorepro.com/admin/billing-setup` (signed in as the admin email) → tap **Run Stripe setup** → copy the webhook signing secret it shows into Vercel (Settings → Environment Variables → `STRIPE_WEBHOOK_SECRET`) → Redeploy. The status checks on that page tell you exactly what's done and what's left. `scripts/stripe-setup.mjs` does the same job from a PC if you ever prefer it.

### 🧑 You do

Nothing up front. Testing at the end uses Stripe's magic fake card: **4242 4242 4242 4242**, any future expiry, any CVC.

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M3) and docs/master-plan-v3.md Phase 2, Tickets 8–13, §6.1, §6.3 and §7. Build: a script that creates the 5 plans as Stripe test-mode products with monthly + annual (20% off) prices; Stripe Checkout; Customer Portal; a signature-verified, idempotent Stripe webhook that syncs subscription status; subscriptions, plan_limits, and usage_events tables seeded from §6.1 limits; a feature-gate helper and usage-limit helper used by the app; a billing settings page. Acceptance: Phase 2 criteria. Tell me how to run the Stripe CLI webhook listener for local testing, or set the webhook up on the deployed URL."

### ✅ Done when

- [ ] You can click "Subscribe" on a plan and pay with card 4242 4242 4242 4242
- [ ] The dashboard shows your active plan
- [ ] "Manage billing" opens the Stripe Customer Portal and you can switch plans/cancel
- [ ] A feature that belongs to a higher plan shows as locked on a lower plan
- [ ] Stripe dashboard (test mode) shows the subscription

---

## Milestone M4 — Setup wizard

**Goal:** a new business can configure everything the AI needs — without you touching anything. This data later becomes the AI's brain.
*(Master plan: Phase 3, Tickets 14–20.)*

### 🧑 You do

Nothing up front; you'll play-act a customer at the end.

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M4) and docs/master-plan-v3.md Phase 3, Tickets 14–20. Build the setup wizard with saved progress: business profile, industry/niche picker (the §1.3 niches), services list, simple pricing rules (flat/base fees with a 'requires human approval' flag — the full pricing engine is post-MVP), service area as ZIP-code/city allowlist, business hours, staff notification numbers, SMS consent settings, and an FAQ step (question/answer pairs the AI may use). Launch is blocked until required steps are complete and pricing/hours/service-area are explicitly approved by the owner. Admin can see incomplete setups. Acceptance: Phase 3 criteria."

### ✅ Done when

- [ ] You can complete the wizard start-to-finish as a fake towing company ("Stran's Towing": 2 services, 5 ZIP codes, Mon–Sat 7am–9pm, 3 FAQs)
- [ ] Closing the browser mid-wizard and coming back keeps your progress
- [ ] The business can't "launch" until required steps are done

---

## Milestone M5 — CRM

**Goal:** every caller becomes a contact with history — the memory of the business.
*(Master plan: Phase 4, Tickets 21–24, §8.3.)*

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M5) and docs/master-plan-v3.md Phase 4, Tickets 21–24 and §8.3. Build: contacts, leads, customer_notes, customer_timeline_events (and consent fields per §8.3) with RLS; contacts list UI with search/filter/tags; contact detail page with timeline; manual add/edit. Acceptance: Phase 4 criteria — when calls exist later, new callers auto-create contacts/leads and the timeline shows calls, messages, jobs, and notes."

### ✅ Done when

- [ ] You can create a contact, add a note, tag them, and see both on their timeline
- [ ] Search finds them by name and by phone number
- [ ] Company B (from M2) sees none of this

---

## Milestone M6 — Phone foundation + THE VOICE DECISION

**Goal:** call your Twilio number and hear your system answer with a placeholder greeting; the call appears in your dashboard. Then make the one big technical decision of the project.
*(Master plan: Phase 6 start, Tickets 28–29, §8.2.)*

### 🤖 Claude does (first)

> "Read BUILD_GUIDE.md (M6) and docs/master-plan-v3.md Tickets 28–29 and §8.2. Build: phone number settings page; phone_numbers, calls, call_transcripts, agents tables with RLS; a signature-validated Twilio inbound-voice webhook that answers with a branded placeholder greeting ('Thanks for calling [business], our AI assistant is being set up — please leave your name and number…' with voicemail-to-log), logs every call to the calls table, and shows calls in the dashboard. Configure it against the deployed production URL so no tunneling is needed. Tell me exactly what to click in the Twilio console to point my number at the webhook (or do it via the API)."

### 🧑 You do — make the test call

Call your Twilio number from your own phone. Listen. Then open the dashboard and watch the call appear.

### 🧑 You do — decide the voice engine (with Claude's help)

> **✔ Decision made (June 2026): Path A with Retell.** The adapter layer still gets built so we can swap to Path B later for margin. The sheet below stays for reference — revisit it at real call volume (50+ calls/day).

This decides **how the AI talks on the phone** in M7. Say to Claude: *"Walk me through the M6 voice decision sheet"* and pick together.

| | **Path A — Managed (Retell or Vapi)** | **Path B — OpenAI Realtime direct** |
|---|---|---|
| What it is | A service that runs the live phone-AI plumbing; our app supplies the brain (prompts + tools) | The master plan's exact stack; we run the plumbing ourselves |
| Speed to working calls | **Days** | Weeks (more debugging) |
| Extra infrastructure | None | A small always-on gateway server (~$5/mo on Railway) — Vercel can't hold live calls |
| Cost per call minute | ~$0.07–0.31 all-in | Lower (~$0.10–0.20) at the cost of complexity |
| Risk for a beginner | Low | Medium-high (audio streaming, latency tuning) |
| Lock-in | Low — we build the adapter layer either way, swappable later | None |

**Recommendation for your budget and experience: Path A**, then revisit at real call volume (50+ calls/day) when Path B's margin savings actually matter. Your own V2 research doc reached the same conclusion ("strong fallback/fast-launch option… keep adapter-ready").

If Path A: create the Retell (or Vapi) account when Claude asks, fund ~$10 for testing, and put the API key in `.env.local`.

### ✅ Done when

- [ ] You called your number and heard your greeting
- [ ] The call (your number, time, duration) shows in the dashboard
- [ ] Voice path chosen and written into CLAUDE.md (ask Claude to record the decision)
- [ ] If Path A: provider account exists, key in `.env.local`

---

## Milestone M7 — The AI receptionist 🏔️

**Goal:** the core of the product. The AI answers, identifies the business, captures the caller's need, answers FAQs, checks service area, notifies staff, and writes a summary — while obeying the hard rules (never claims to be human, **never invents prices**, never books yet).
*(Master plan: Phase 6, Tickets 30–35, §5.1, §10.)*

**This is 2–3 weeks of iterating. Expect imperfect early calls — that's the process, not failure.**

### 🤖 Claude does (in sub-steps — let Claude pace them)

> "Read BUILD_GUIDE.md (M7) and docs/master-plan-v3.md Phase 6, Tickets 30–35, §5.1 and §10. We chose voice path [A: Retell / A: Vapi / B: OpenAI Realtime] in M6. Build in order: (1) the voice-provider adapter interface from §3.1; (2) the chosen provider integration end-to-end so the AI converses on a live call; (3) the agent prompt builder that assembles the system prompt from this tenant's wizard data — business profile, services, hours, ZIP service area, FAQs — with §5.1 hard rules baked in; (4) the tool router exposing §10 contracts with this MVP subset: lookup_contact, create_contact, search_knowledge_base (answers from wizard FAQs), check_service_area, notify_staff, escalate_to_human, mark_spam — every tool tenant-scoped and audit-logged; (5) transcript + summary + disposition storage and the call summary UI; (6) per-minute usage metering into usage_events. Price questions must answer 'the owner will text you an exact quote' and create a follow-up task — quoting and booking are NOT in this milestone. Acceptance: Phase 6 criteria."

### 🧑 You do — the 10-call test (the fun part)

Call your number and act out each scenario. Score PASS/FAIL. **All 10 must pass before M8.**

| # | You play… | PASS means the AI… |
|---|---|---|
| 1 | New customer, car broke down on I-40 | Answers with business name, gets your name/phone/location/need, says staff will follow up; call summary appears |
| 2 | The same person calling back | Recognizes you ("Welcome back…") and pulls history |
| 3 | Robocall/telemarketer | Politely ends; call marked spam; no staff alert |
| 4 | "How much for a tow to downtown?" | **Quotes no number.** Says the owner will text an exact quote; logs a follow-up |
| 5 | Address outside your ZIP list | Politely declines, offers to take info anyway; logged as out-of-area |
| 6 | "Are you a robot?" | Says yes — it's the business's AI assistant (never claims human) |
| 7 | Caller demands a human | Escalates per the configured rule (transfer/take message + urgent staff alert) |
| 8 | "Don't ever text me" | Consent turned off for that contact (check their CRM record) |
| 9 | Angry, frustrated caller | Stays calm, doesn't argue, escalates |
| 10 | Wrong number ("Is this Pizza Hut?") | Politely clarifies and ends; logged correctly, no lead created |

### ✅ Done when

- [ ] All 10 test calls PASS (re-run failures after Claude fixes them — multiple rounds is normal)
- [ ] Every call shows transcript + summary + disposition in the dashboard
- [ ] Usage minutes appear in the usage log
- [ ] A staff-notification text/call reached your phone for call #1 *(if A2P is still pending, staff alerts may be voice-call or email until M8 — that's fine)*

---

## Milestone M8 — SMS & compliance

**Goal:** the AI and the system can text customers — legally. Missed calls get an automatic text-back (the product's namesake feature).
*(Master plan: Phase 7, Tickets 36–37, §5.8 rules.)*

**Prerequisite: A2P approved — ✔ already done** (your Twilio brand was approved before the build even started; just make sure your number is attached to the approved campaign).

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M8) and docs/master-plan-v3.md Phase 7, Tickets 36–37. Build: Twilio Messaging integration with the messages table (§8.2); the send_sms tool that hard-blocks without consent; inbound SMS webhook with STOP/HELP handling and a tenant-wide suppression list; missed-call text-back (caller hangs up before/during AI → instant SMS follow-up); staff alert SMS on new leads; booking/confirmation templates for M9; message log UI. Acceptance: Phase 7 criteria — STOP prevents all future sends, HELP responds, every message is logged."

### 🧑 You do

- Text your Twilio number **STOP**, then verify the system refuses to text you; text **START** to undo, **HELP** to see the help reply.
- Call and hang up after one ring → you should get the text-back within seconds.

### ✅ Done when

- [ ] Missed call → automatic text-back arrives
- [ ] STOP blocks sends (visible in the message log as blocked), START re-enables, HELP replies
- [ ] New lead → staff alert SMS arrives
- [ ] Every message (in/out/blocked) appears in the message log

---

## Milestone M9 — Calendar booking & jobs

**Goal:** the AI books real appointments inside approved hours, sends confirmations, and creates job records.
*(Master plan: Phase 8, Tickets 38–40, §5.3 rules, §8.6.)*

> **🟡 Status update (June 2026): code is built (`npm run build` + `typecheck` green); your turn next.** What's left is the Google Cloud setup below, pasting the migration `supabase/migrations/20260615090000_calendar_jobs.sql` into the Supabase SQL editor, adding `GOOGLE_OAUTH_CREDENTIALS` to `.env.local` + Vercel, then connecting Google in **Settings → Calendar booking**. Booking turns on automatically once a calendar is connected (the AI only offers real open times and never double-books — enforced in the database). Then run the test at the bottom. Note: booking isn't restricted by plan yet (that arrives with M10).

### 🧑 You do — Google Cloud setup (one-time, ~20 min)

1. [console.cloud.google.com](https://console.cloud.google.com) → sign in with the Google account whose calendar you'll test with → New Project: `missed-no-more-pro`.
2. "APIs & Services" → Library → enable **Google Calendar API**.
3. "OAuth consent screen" → External → fill app name + your email → add scope for Calendar → **add yourself as a Test user** → save. (Staying in "Testing" mode is correct for beta — up to 100 users, no Google review needed yet.)
4. "Credentials" → Create credentials → **OAuth client ID** → Web application. Under **Authorized redirect URIs**, add **both**:
   - `https://missednomorepro.com/api/google/callback`
   - `http://localhost:3000/api/google/callback`
5. Click **Download JSON** on the new client, then turn the file into one line and put it in `.env.local` as `GOOGLE_OAUTH_CREDENTIALS` (and later add the same value to Vercel). On Windows PowerShell:
   ```powershell
   [Convert]::ToBase64String([IO.File]::ReadAllBytes("C:\Users\Stran\Downloads\client_secret_XXXX.json"))
   ```
   (The app reads the client ID + secret from this one base64 value — no separate `GOOGLE_CLIENT_ID`/`SECRET` needed.)

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M9) and docs/master-plan-v3.md Phase 8, Tickets 38–40, §5.3 and §8.6. Build: Google Calendar OAuth connect flow in settings; appointments and jobs and job_status_events tables with RLS; availability rules derived from wizard business hours with buffers; check_calendar_availability and book_appointment tools wired into the AI (hard rule: only inside approved windows, no double-booking); confirmation SMS on booking; jobs list page where a booked appointment creates a job. Acceptance: Phase 8 criteria."

### 🧑 You do — test

Call as a new customer and ask for an appointment tomorrow. Accept a suggested slot.

### ✅ Done when

- [ ] The AI offered only slots inside your business hours
- [ ] The event is on your real Google Calendar
- [ ] You got the confirmation SMS
- [ ] A job appeared in the jobs list, linked to your contact
- [ ] Asking for a 3 AM slot gets politely refused

---

## Milestone M10 — Hardening, production, beta gate

**Goal:** safe to put in front of strangers and charge real money.
*(Master plan: §14 checklist, §15 cost controls, Phase 2 live-mode.)*

### 🧑 You do

1. **Sentry** (free) — [sentry.io](https://sentry.io) → sign up → new Next.js project → copy the DSN into `.env.local` (and Vercel).
2. **Resend** (free tier) — [resend.com](https://resend.com) → sign up → verify your domain (DNS records like M1) → API key into `.env.local`.
3. **Stripe live mode** — Stripe → "Activate your account" (business details + bank account). Copy LIVE keys into **Vercel's** environment settings only.
4. **Support email** — e.g. `support@yourdomain.com` (your domain registrar or Cloudflare Email Routing forwards it free).
5. Recruit 1–3 friendly business owners as beta customers.

### 🤖 Claude does

> "Read BUILD_GUIDE.md (M10) and docs/master-plan-v3.md §14 and §15. Build/verify: Sentry wired (no PII in logs); Resend for auth + receipt emails; per-tenant admin kill switch (AI off → calls forward straight to owner's phone); §15 cost controls — call duration cap, per-tenant daily spend cap, usage alerts at 50/80/100/120% with email/SMS, overage cap; final RLS leak re-test; backup/restore check; legal pages finalized from drafts; then walk me through the §14 'Before beta' checklist one line at a time and run the 25 red-team calls with me."

### ✅ Done when — the §14 gate

- [ ] Every "Before beta" box in docs/master-plan-v3.md §14 is checked — including 25 red-team calls, **0% pricing hallucination**, tenant leak test, kill switch, backups
- [ ] Vercel upgraded to Pro ($20) and Supabase to Pro ($25) **when the first real customer pays** (their $99 covers it)
- [ ] First beta customer onboarded through the wizard **by themselves** while you watch silently

**After M10:** sell to 10 beta customers, handle 500+ real calls, then return to the master plan's parked phases (pricing engine → deposits → dispatch → invoicing → reviews → reporting → command center) — in the order customers ask for them.

---

## Money: what this costs until revenue

| Service | Build phase | At first paying customer |
|---|---|---|
| Domain | ~$1/mo (12/yr) | same |
| Vercel | $0 (Hobby) | $20 (Pro — required for commercial use) |
| Supabase | $0 (Free) | $25 (Pro — backups, no auto-pause) |
| Stripe | $0 (test mode) | 2.9% + 30¢ per transaction |
| Twilio | ~$2–10/mo (number + A2P fees + tests) | scales with calls |
| OpenAI / voice provider | ~$10–25/mo (test calls) | scales with calls (~$0.10–0.31/min) |
| Sentry, Resend, Google | $0 (free tiers) | $0 until real scale |
| **Total** | **~$15–50/mo** ✅ inside your $50–70 budget | **~$60–90/mo fixed** — one $99 customer covers it |

---

## Mini-glossary (the only jargon you need)

- **API key** — a password that lets your app use a service. Lives only in `.env.local`.
- **.env.local** — the secrets file at the project root. Git-ignored, never leaves your PC (production copies live in Vercel's settings screen).
- **Webhook** — a URL where a service "calls back" your app ("Twilio: someone's calling!", "Stripe: payment succeeded!").
- **Migration** — a saved, replayable change to the database structure.
- **RLS (Row Level Security)** — database-enforced rule: each tenant's rows are invisible to everyone else. Our #1 security layer.
- **Tenant / multi-tenant** — one app, many isolated customer businesses. Each business = a tenant.
- **Commit / push** — save a checkpoint of the code / upload checkpoints to GitHub.
- **Deploy** — publish the app to the internet (Vercel does it automatically on every push).
- **localhost:3000** — the app running privately on your own PC while developing.
- **Test mode (Stripe)** — fake money mode. Card `4242 4242 4242 4242` always works.
- **A2P 10DLC** — US carrier registration legally required to send business SMS. Slow paperwork, hence submitted at M1.
- **Disposition** — the one-word outcome of a call (lead, booked, spam, out-of-area…).

---

## When something breaks

**The universal fix: copy the exact error → paste into Claude Code → say "fix this."** Specifics:

| Symptom | Likely cause / what to say to Claude |
|---|---|
| `Module not found` when starting | Dependencies missing → "run npm install and retry" |
| Page says an env variable is missing | `.env.local` value empty/typo'd → fill it, then stop and restart the dev server |
| Stripe webhook "signature verification failed" | Wrong `STRIPE_WEBHOOK_SECRET` for that environment (local CLI secret ≠ deployed secret) |
| Twilio call rings but nothing answers | Number's Voice webhook URL points at the wrong place → "re-check my Twilio number's voice webhook configuration" |
| Supabase: "project is paused" | Free tier pauses after ~1 week idle → Supabase dashboard → Restore. (Goes away on Pro.) |
| Data exists but page shows nothing | Usually an RLS policy gap → "check the RLS policies for [table]" |
| Vercel build failed after push | Open the build log in Vercel, copy the red part to Claude |
| AI says something wrong/weird on a call | Copy the call transcript from the dashboard to Claude → "tighten the prompt/tool so this can't happen" |
| You're lost | Say: "Read BUILD_GUIDE.md and CLAUDE.md, tell me exactly where we are and what's next." |

**Rules that protect you:** never commit `.env.local` (the `.gitignore` already blocks it) · never read your card number aloud to anything · if a bill looks weird, check the usage dashboards (Twilio/OpenAI) the same day · when in doubt, ask Claude *"is this safe?"* before clicking.
