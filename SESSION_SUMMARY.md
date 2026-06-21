# Session Summary — Missed No More Pro (June 17, 2026)

A working session covering Phase 10, a landing-page makeover, a billing bug fix, Phase 11+12, and the start of the add-on suite (Phase 14).

---

## 1. Landing Page Makeover ✅ (shipped + live)

Rebuilt `src/app/page.tsx` into a full tech/SaaS sales page on the existing dark brand system (no palette/font change), with reusable pieces in `src/components/landing/`.

- **New sections:** niche marquee, "the math of a missed call," **product showcase bento** (dashboard / quote / inbox / pipeline mockups), 3-pillar feature breakdown, **add-ons grid** (mirrors the real catalog), integrations, comparison table, honest founder/early-access proof band (no fabricated quotes), **monthly/annual pricing toggle** + overage note, FAQ accordion, mobile menu.
- **Hero tweak (operator feedback):** replaced the generic icon-pill badge with a distinctive mono kicker — `AI RECEPTIONIST / SMART CRM / AI BUSINESS ASSISTANT`.
- Verified at 1440px / 375px (no horizontal scroll), no console errors, reduced-motion respected, pricing toggle works.
- **Commits:** `ae7263b` (makeover), `bad19ab` (hero kicker).

---

## 2. Phase 10 — Omnichannel AI Chat ✅ (shipped + verified)

The **+$29 `omnichannel_chat` add-on**: one AI brain across **website chat + two-way AI SMS**, with a **unified inbox**.

- **Architecture:** reused the §10 voice "tool brain" via a **channel-aware `ToolContext`** (`callId` now optional + `channel: voice|sms|web` + `conversationId`; call-only writes guarded). **Voice path is byte-for-byte unchanged** — the §5.1 rule text is now shared (`pricingRuleBody` / `bookingRuleBody`) so voice + chat can't drift, and the prompt hash is unchanged (no Retell re-sync churn).
- **Migration `20260625090000_omnichannel_chat.sql`:** `conversations` + `conversation_messages` (encrypted+redacted bodies; members read / staff-reply insert only), chat columns on `sms_settings` (`widget_key`, `web_chat_enabled`, `two_way_sms_ai_enabled`, greeting, accent), `tool_calls.call_id` nullable + `conversation_id`, chat timeline trigger.
- **Surfaces:** `src/lib/chat/*` (gpt-4.1-mini tool loop, tenant resolved server-side); public `/api/chat/web` (CORS, `widget_key` auth, rate-limited) + embeddable `public/widget.js`; two-way SMS branch in `/api/twilio/sms` (after STOP/START/HELP, gated, STOP wins); unified inbox `/dashboard/inbox` + nav (take-over toggle, close, polling); Settings card + embed snippet.
- **Verified:** build/typecheck green; **leak test 29/29** (added conversation isolation, no cross-tenant injection, widget-key non-leak, no forged AI turns).
- **Deferred:** Facebook Messenger; emailed/automated Stripe metered charging.
- **Commit:** `f1e96d0`.

---

## 3. Billing Bug Fix ✅ (resolved)

**Symptom:** operator subscribed to a plan; Stripe processed it but the app showed "no active plan."

**Two root causes found:**
1. **Stripe webhook stopped delivering after June 12** — today's Elite purchase produced zero webhook events on our side, so it never synced. (Operator-side fix: verify the webhook endpoint + that `STRIPE_WEBHOOK_SECRET` in Vercel matches Stripe's signing secret.)
2. **Four stacked active test subscriptions** + the DB row stuck on the old `scale` plan (post-re-tier → maps to `none`).

**Actions taken (operator-authorized):**
- Canceled the 3 stale test subs (book/revenue/scale); only `plan_elite_monthly` remains active.
- Set the DB record to the real **Elite** subscription (active, renews 2026-07-17).
- **Code fix:** `startCheckout` now routes an already-subscribed tenant to the **Customer Portal** to switch plans instead of stacking a new subscription. Also fixed a pre-existing duplicate-variable syntax error that had been breaking the leak test.
- **Commit:** `102ad51`.

---

## 4. Phase 11 + 12 (core) ✅ (shipped + verified)

Bundled **Dispatch/scheduling + Team (multi-user) & Numbers**.

- **Migration `20260626090000_dispatch_team.sql`:** `jobs.assigned_to` + `appointments.assigned_to` (→ `staff_contacts`); `invitations` table; `accept_invitation(token)` SECURITY DEFINER RPC (the only client path into an existing org).
- **Ph11 Dispatch** (`/dashboard/dispatch`, gated `dispatch_board` / `team_calendar`): day/week board merging the day's appointments + jobs, assign-to-staff, job status (reuses `updateJobStatus`), "text a tech their day" via `sendStaffSms`.
- **Ph12 Team** (`/dashboard/team`, gated `multi_user`): members + roles, invite-by-link (email delivery deferred — no Resend yet), change role / remove (owners immutable to prevent lockout), revoke; public `/invite/[token]` accept page. **Numbers** (`/dashboard/numbers`): read-only list.
- **Verified:** build green; **leak test 32/32** (invitation isolation, no cross-tenant invite forgery, no cross-tenant job assignment); `accept_invitation` RPC confirmed deployed + locked to authenticated users.
- **Deferred (operator-agreed):** full multi-location (would refactor every "first business" call site — risky pre-M10) and customer membership plans. Tier flags already exist for later.
- **Commit:** `2939add`.

---

## 5. Phase 14 — Add-on Suite ✅ (built — build+typecheck green; needs migration + operator test; not yet committed)

The last two add-ons, deferring the pieces that need external setup (Google Business Profile verification, Resend email).

- **Migration `20260627090000_addons_suite.sql`:** `insight_reports` (Call Intelligence), `reviews` (Reputation), reputation columns on `sms_settings`. **Operator TODO: apply this migration.**
- **Call Intelligence (+$19, `call_intelligence`):** `src/lib/insights/call-intelligence.ts` — weekly metrics from existing call/lead/job/tool data + one cheap gpt-4.1-mini digest. Generation **piggybacks the daily outbound cron on a Monday gate** (stays within Vercel Hobby's 2-cron limit). In-app `/dashboard/insights` page + a "Refresh report" action.
- **Reputation Manager (+$29, `reputation_manager`):** `src/lib/reputation/review.ts` — the reputation gate over SMS. On **job completion** (`jobs/actions.ts#updateJobStatus`) `requestReview` fires (gated on the add-on AND the per-business `reputation_enabled` toggle; idempotent per job; runs the full consent gate so STOP wins) and opens a `reviews` row. The **inbound SMS webhook** (`/api/twilio/sms`) runs `handleReviewReply` **after STOP/START/HELP, before the AI branch**: a 1–5 reply to an open request → 4–5 gets the public review link (`businesses.gbp_url` preferred, else Facebook URL) + marks `rated`; 1–3 → `feedback` state, owner alerted via `notify_on_lead` staff, and the customer's next message is captured as private `feedback_redacted` (never auto-posted publicly). `/dashboard/reputation` page = stats + settings (toggle, request template, Facebook fallback) + recent-reviews list with private feedback. Nav links added (Reputation, Insights).
- **Leak test:** extended to **checks 33–35** (B can't read A's reviews/private-feedback or insight reports; B can't forge a review into A's tenant). **Rerun `scripts/leak-test.mjs` after the migration is applied.**
- **Deferred:** GBP-API auto-replies (needs Google verification) + emailed reports (needs Resend).
- **Margin:** at most a request + one reply text per job; reports are one LLM call/tenant/week.

---

## Cross-cutting Notes
- **Workflow:** migrations are applied by the operator via the Supabase SQL editor, then redeploy (Vercel auto-deploys on push to `main`). Deployed code that selects new columns errors until the migration is applied — apply before/with each deploy.
- **Margin discipline:** every add-on is LLM/text-based (pennies); SMS stays metered + STOP-gated.
- **Outstanding operator items:** apply `20260627090000_addons_suite.sql` when the add-on suite is finished; fix the Stripe webhook config so future billing changes sync automatically.
