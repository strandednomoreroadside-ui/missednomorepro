# 05 — Automation, Funnel & Metrics (The Machine)

**Owner:** Growth / Systems lead
**Consistent with:** `00-campaign-foundation.md` (that doc wins on any conflict).
**Constraints locked:** LinkedIn + Facebook only · nationwide US · broad home-services ICP ·
$0–500 TOTAL ad spend · maximum automation / minimal founder time · self-serve 7-day card-required
trial (the trial **is** the close) · killer mechanic = **call the AI / "Test my AI."**

_Last updated: July 24 2026._

---

## 0. TL;DR (read this first)

- **Base case (likely): ~11–13 paying customers in 30 days.** **Stretch-to-20: ~20–24** if four things
  break right (below).
- **The single bottleneck is TRIAL STARTS — the card-on-file gate**, not reach and not leads. A brand-new
  product asking for a card is where the funnel physically pinches.
- **The highest-leverage lever is the automated "call/hear the AI" demo.** Force *every* prospect through
  "hear it" before the trial ask. A prospect who has heard Grace converts to a card-trial at roughly
  **3–5× the rate** of one who hasn't — and it costs **zero founder time.**
- **Cash cost is NOT the constraint.** At $99–$349/mo and a blended cash CAC around $40, payback is
  ~1 month and LTV:CAC is wildly healthy. We are volume-constrained, not money-constrained.
- **Scheduling truth:** trials take 7 days to convert. To have 20 *paid* by day 30, **most trials must
  start by ~day 21–23.** The real lead-gen window is ~3 weeks, not 4. Front-load.

---

## 1. End-to-end funnel

The demo call is the load-bearing conversion event. Everything upstream exists to get a prospect to
**hear the AI**; everything downstream exists to get a trial user to **activate and stay.**

```
                         ┌─────────────────────────── TOP OF FUNNEL ───────────────────────────┐
                         │                                                                       │
   ORGANIC (free)        │   OUTBOUND (founder-controlled)     │   PAID (≤$500 total, validation)│
   ───────────────       │   ─────────────────────────────     │   ──────────────────────────────
   • FB owner-group        • LinkedIn ICP DMs (multi-loc,         • Meta ads → demo landing (bulk of
     value comments          franchise, B2B referral partners)     spend; trades live on FB)
   • FB + LinkedIn         • FB group replies to "who answers      • LinkedIn ads (tiny test only —
     posts (daily)           your phone?" threads                    CPCs too high for this budget)
   • Demo-clip shares      • Templated, personalized touches
                         │                                                                       │
                         └───────────────────────────┬───────────────────────────────────────────┘
                                                      │  every asset's CTA ladder:
                                                      ▼  "HEAR THE AI (call it)  →  start free trial"
                                        ┌─────────────────────────────┐
                                        │  "HEAR THE AI" LANDING PAGE  │  ← lead magnet = the demo itself
                                        │  • one-tap call the demo #   │
                                        │  • 30-sec recorded sample    │
                                        │  • "text this to a buddy"    │
                                        │  • email capture (optional)  │
                                        └───────────────┬─────────────┘
                                                        │
                        ┌───────────────────────────────┴───────────────────────────────┐
                        ▼                                                                 ▼
        ╔═══════════════════════════════╗                                   ┌───────────────────────┐
        ║  ★ CALL THE DEMO AI ★         ║  ◀── KEY CONVERSION EVENT          │  Email / DM lead      │
        ║  (hears Grace book a job,     ║      (leading indicator of         │  (not yet ready to    │
        ║   quote a price, text back)   ║       the entire campaign)         │   call) → nurture     │
        ╚═══════════════╤═══════════════╝                                   └───────────┬───────────┘
                        │  wowed → 25–35% start a trial                                  │ nurtured back
                        ▼                                                                 ▼  to "hear it"
                        └──────────────────────────┬──────────────────────────────────────┘
                                                   ▼
                              ┌───────────────────────────────────────┐
                              │  SELF-SERVE TRIAL SIGNUP (CARD)        │  ◀── THE BOTTLENECK
                              │  7-day trial · card required          │      (funnel pinches here)
                              │  ~30-min voice cap · founder offer     │
                              └───────────────────┬───────────────────┘
                                                  ▼
                              ┌───────────────────────────────────────┐
                              │  ACTIVATION (predicts payment)         │
                              │  1. connect number  2. connect cal     │
                              │  3. go live  4. ★ "TEST MY AI" ★       │  ◀── 2nd demo moment:
                              │     (product calls THEM, on their biz) │      they hear it as THEIR own
                              └───────────────────┬───────────────────┘
                                                  ▼  activated trials convert ~60–70%
                                                  ▼  non-activated convert ~10%
                              ┌───────────────────────────────────────┐
                              │  PAID  (trial auto-converts on day 7)  │  ◀── NORTH STAR
                              │  → claims a Founder slot (first 10)    │
                              │  → triggers referral + review loops    │
                              └───────────────────────────────────────┘
```

**Two demo moments do the heavy lifting:** (1) the public *call-the-demo* number that turns a cold
prospect into a trial, and (2) *Test my AI* inside the trial that turns a signup into an activated,
converting customer. Both are automated. Design the whole funnel to maximize the count of each.

---

## 2. The automation tool stack (target recurring cost: $0/mo)

Everything below runs on a free tier. The only money that moves is the ≤$500 one-time ad test. The
product's **own** SMS / email / review / webhook engine does all *post-trial* nurture — we dogfood it,
so trial users and customers are nurtured for $0 by the thing we're selling.

| Job | Tool (recommended) | Tier / cost | Notes |
|---|---|---|---|
| Content scheduling | **Metricool** (free) | $0 | Schedules FB + LinkedIn *and* gives cross-channel analytics — doubles as our reach dashboard. (Buffer/Publer free = fine alternates.) |
| Pre-trial lead CRM | **HubSpot Free CRM** | $0 | Pipeline for leads *before* they become trials, forms, source tags. The **product's own CRM** is the system of record once they're a trial/customer. |
| Pre-trial nurture email | **MailerLite** (free) | $0 | 1,000 contacts / 12k sends + automations on the free tier — better free email automation than HubSpot's. |
| DM / outbound tracking | **Airtable or Notion** (free) Kanban + **TextBlaze** (free) snippets | $0 | Manual-but-templated outreach tracked as a board. Deliberately **not** a scaled LinkedIn bot (see flag). |
| Product / funnel analytics | **PostHog** (free, 1M events/mo) | $0 | Funnel report: page view → "hear it" click → demo-call intent → trial start → activated. This is our real funnel truth. |
| Site traffic analytics | **Vercel Web Analytics** (free) | $0 | Already on Vercel. Traffic + top pages + referrers. |
| Ad analytics | **Meta Ads Manager** + **LinkedIn Campaign Mgr** (native) | $0 | Native reporting; feed spend/CPC/CPL into the weekly sheet. |
| Attribution | **UTM scheme + Google Sheet UTM builder** | $0 | Every link tagged `?utm_source=&utm_medium=&utm_campaign=`. PostHog + CRM store the source. |
| Glue / automation | **Make.com** (free, 1,000 ops/mo) primary · **Zapier** (free, 100 tasks) backup | $0 | Make's free tier is more generous. Zapier as failover / for its bigger app catalog. |
| **Product webhooks** | **Missed No More Pro outbound webhooks** (Professional+ tier — already built) | $0 | `lead.created`, `appointment.booked`, `job.completed`, `payment.received` → Make → CRM/dashboard. Our own integration layer *is* part of the growth stack. |
| Post-trial nurture (SMS + email + reviews) | **The product itself** (dogfood) | $0 | Trial onboarding nudges, "Test my AI" reminders, review requests, referral asks — all run on our own engine. |
| Creative | **Canva Free** + **CapCut Free** | $0 | Ad/post graphics, demo-call clip editing. |

### Wiring (how it connects)

```
[Meta / LinkedIn ad]──UTM──▶[Hear-the-AI landing]──▶ PostHog event "hear_it_click"
                                     │                         │
                                     ├─▶ call demo # (Twilio)  ├─▶ trial start ──▶ product CRM (source of truth)
                                     └─▶ email capture (MailerLite/HubSpot form)
                                                 │
                                                 ▼
                              MailerLite pre-trial nurture (3–4 emails, all pushing "hear it")

[Product webhook lead.created]────▶ Make.com ──▶ HubSpot CRM stage update  +  Google Sheet dashboard row
[Product webhook payment.received]▶ Make.com ──▶ (a) decrement Founder-slots counter in dashboard
                                                  (b) fire product SMS referral-ask to the new customer
                                                  (c) move CRM contact → "Customer"
[Product SMS/email/review engine]──▶ trial onboarding + Test-my-AI nudges + auto review collection
        (auto-collected 5-star reviews) ─────────▶ published on landing page = social proof loop
```

**Founder's actual hands-on time** (everything else is automated): ~1 batch day in Week 0 (content +
list + wiring), then **~30–45 min/day** of personalized outbound and **~20 min/week** on the dashboard.

### Cost flags (things that DO cost money)

- **Ad test: ~$450 to Meta + ~$50 LinkedIn** (or all $500 to Meta). LinkedIn CPCs ($8–15) are too rich
  for this budget — treat LinkedIn as an *organic/outbound* channel, not a paid one. **This is the only
  planned spend.**
- **NOT recommended:** scaled LinkedIn automation (Waalaxy/Dripify/PhantomBuster, ~$40–100/mo) — costs
  money **and** risks account bans. We use templated-manual outreach + a tracker instead.
- **Optional:** per-channel call-tracking numbers (~$1.15/mo each on Twilio) if we want to attribute demo
  calls by source. Skip at first; approximate attribution via the UTM'd landing click that precedes the
  call. Add one or two only if demo-call source becomes a real question.
- **Skip:** Plausible (~$9/mo) — Vercel Analytics + PostHog free already cover it.

---

## 3. KPI framework

Nine metrics, by funnel stage. Targets are **30-day** unless noted. "Base" = likely; "Stretch" = the
20-customer scenario.

| # | Metric | Stage | Base target | Stretch target | Source |
|---|---|---|---|---|---|
| 1 | **Impressions / reach** (organic + paid) | Reach | ~45–60k | ~80k+ | Metricool + Meta + LinkedIn |
| 2 | **Demo-AI calls** ("hear it" completions) | Engage | **~55–70** | **~110** | PostHog event + demo-line logs |
| 3 | **Leads** (demo call OR email OR live DM thread) | Lead | ~180 | ~330 | HubSpot CRM |
| 4 | **Trial starts** (card on file) ◀ bottleneck | Trial | **~28** | **~45** | Product admin / DB |
| 5 | **Activation rate** (go-live + Test-my-AI) | Activate | 65% | 75% | Product analytics |
| 6 | **Trial → Paid conversion** | Paid | 40% | 52–55% | Product / Stripe |
| 7 | **Paying customers (cumulative)** ◀ NORTH STAR | Paid | **11–13** | **20–24** | Stripe / `/admin` |
| 8 | **Outbound touches sent** (controllable input) | Input | ~400 | ~700 | Outreach tracker |
| 9 | **Founder slots remaining** (scarcity driver) | Meta | 10 → ~2 | 10 → 0 | Product `/admin` |

**Efficiency check (not a target, a sanity rail):** blended cash CAC ≈ $500 ad spend ÷ paying ≈ **$40**
(most customers come from $0 organic/outbound; the paid-attributed subset is higher, ~$125–165 each).
At $99–$349/mo, **CAC payback ≈ 1 month, LTV:CAC easily 5:1+.** Confirms the constraint is trial volume,
not money — spend freely inside the $500 to buy demo calls.

### One-screen weekly dashboard (single Google Sheet or Notion page)

```
┌──────────────────────────────────────────────────────────────────────────────────────┐
│  MISSED NO MORE PRO — 30-DAY SPRINT              Week __ of 4        Day __ / 30        │
├───────────────────────────┬───────────────────────────┬──────────────────────────────┤
│  ★ NORTH STAR             │  PIPELINE (live)          │  SCARCITY                     │
│  Paying: __ / 20          │  Active trials: __        │  Founder slots left: __ / 10  │
│  (base pace: __ / stretch)│  Deciding in ≤3 days: __  │                               │
├───────────────────────────┴───────────────────────────┴──────────────────────────────┤
│  FUNNEL — this week (actual vs target)                                    WoW          │
│  Reach ______ / _____   │  Demo calls __ / __ ◀KEY  │  Leads __ / __                  │
│  Trials __ / __ ◀PINCH  │  Activated __ / __ (__%)  │  Paid __ / __                  │
├────────────────────────────────────────────────────────────────────────────────────── │
│  INPUTS                    │  ECONOMICS              │  HEALTH FLAGS (R/Y/G)           │
│  Outbound sent: __         │  Ad spend to date: $__  │  Activation rate ___%           │
│  Posts published: __       │  CPL: $__               │  Trial→Paid ___%                │
│  Demo-clip shares: __      │  Blended CAC: $__       │  Outbound reply rate ___%       │
├────────────────────────────────────────────────────────────────────────────────────── │
│  DATA SOURCES: reach=Metricool/Meta · demo calls+funnel=PostHog · trials/activated/paid │
│  =product admin+Stripe · leads/outbound=HubSpot/tracker · slots=/admin                  │
└──────────────────────────────────────────────────────────────────────────────────────┘
```

The **one metric to watch daily** is #2, demo-AI calls — it leads everything downstream by ~7 days.
If demo calls are on pace, paid customers follow. If demo calls stall, fix that before touching anything else.

---

## 4. Honest funnel math for 20 paying in 30 days

Worked backwards, with the conversion rates stated so anyone can challenge them.

### The driving assumption
A **card-required** trial converts to paid far better than a free trial (typically **40–55%** vs
15–25% for no-card). That's our friend. But card-required also produces **far fewer starts** — the funnel
narrows at the trial gate. So the two numbers to solve are (a) how many trial starts we can generate, and
(b) at what rate they convert.

### Backwards from 20 paid

| To net 20 paid… | Trial→Paid | Trial starts needed | Realistic in 30d? |
|---|---|---|---|
| Base conversion | 40% | **50 trials** | Hard from a cold start |
| Stretch conversion | 55% | **37 trials** | Reachable if activation + demo click |

### BASE CASE (what's likely)

| Stage | Number | Rate applied |
|---|---|---|
| Impressions (organic ~20k + paid ~30k) | ~50,000 | — |
| Site sessions + engaged | ~750 | ~1.5% blended |
| **Leads** (demo calls + email + real DM threads) | **~180** | mix (see below) |
| — of which demo-AI calls | ~60 | the key micro-conversion |
| **Trial starts (card)** | **~28** | ~15% blended lead→trial |
| Activated (go-live + Test-my-AI) | ~18 | 65% of trials |
| **Paying** | **~11–13** | 40% of trials |

Lead mix behind the ~28 trials: warm demo-callers convert ~30% (≈18 trials from ~60 calls), warm DM/email
leads convert ~8% (≈10 trials from ~120). Cold ad traffic barely trials directly — it feeds demo calls.

### STRETCH-TO-20 CASE (everything that has to go right)

| Stage | Number | What changed |
|---|---|---|
| Impressions | ~80,000+ | a post/clip pops in FB owner groups (the free viral shot) |
| **Leads** | ~330 | outbound volume ~doubles (light automation protects founder time) |
| — demo-AI calls | ~110 | "hear it" becomes the mandatory step; clips get shared |
| **Trial starts** | ~45 | more demo-callers → more card trials |
| Activated | ~34 | 75% activation (frictionless go-live + auto Test-my-AI nudges) |
| **Paying** | **~20–24** | 52–55% trial→paid (founder-offer scarcity + it just works) |

**The four things that must all break right for 20:**
1. **Outbound volume roughly doubles** (~700 quality touches) *and stays personalized* — needs templates +
   light, ban-safe automation, not more founder hours.
2. **At least one organic asset or demo clip gets real reach** in FB owner groups — the one free viral
   multiplier we can't manufacture, only earn.
3. **Activation hits 75%+** — every trial connects a number, goes live, and hits *Test my AI*, driven by
   the product's own automated SMS/email nudges.
4. **Trial→paid holds at ~52%+** — founder-offer scarcity + genuine "it works" experience carry the close.

### The single biggest bottleneck

**Trial starts — the card-on-file gate.** Reach is plentiful, leads are gettable, cash isn't the limiter.
The pinch is a stranger's willingness to put a card down for a brand-new AI on day one. Every point of
leverage should aim at *this* transition: lead → card-trial.

### The highest-leverage lever

**Make the automated "call/hear the AI" demo the mandatory step before the trial ask.** A prospect who
has *heard* Grace book a job and quote a price trials at ~3–5× the rate of one who's only read copy — and
the demo runs with zero founder time. Concretely: no asset says "start your trial" first; every asset says
**"call this number, hear it, then start your trial."** Second-order lever: **outbound volume**, the only
channel fully in our control — but capped by the minimal-founder-time rule, so it must be templated and
lightly automated, never manual-at-scale.

### The scheduling truth (don't miss this)
A 7-day trial means a trial started on day 26 converts on day 33 — *outside the sprint*. **To bank 20
paid by day 30, ~80% of trials must start by day 21–23.** That compresses lead-gen into a ~3-week window
and is exactly why Week 1 leads with demo calls and Week 3 is the last heavy trial-start push; Week 4 is a
*conversion* week, not an acquisition week.

---

## 5. Compounding growth loops

Three loops, each engineered to make the *next* customer cheaper than the last. Trades owners cluster
(same suppliers, associations, towns, and FB groups) — every loop exploits that clustering.

### Loop 1 — "Call our AI" word-of-mouth virality (top-of-funnel, $0)
**Mechanic:** every asset ends with *"Call this number and hear it."* The public demo landing page has a
one-tap call, a 30-second recorded sample ("hear the AI answer a plumbing call"), and a **"text this to a
buddy who misses calls"** button. Owners who call and get wowed screenshot it, tag a friend, and drop the
clip in owner groups ("you gotta hear this thing").
**Why it compounds:** each new listener is a free top-of-funnel entry, and trades owners talk to each
other constantly and love showing off cool tech. More demo calls → more shares → more demo calls. It's
also the product demonstrating itself, so the "ad" and the product are identical — no trust gap.

### Loop 2 — Dogfood the review/SMS engine → auto-generated social proof (mid-funnel, $0)
**Mechanic:** we run our *own* business on Missed No More Pro — our demo/support line **is** Grace, so
every prospect who calls experiences the product. Then we point the product's **own** SMS + email + review
+ reputation engine at our trial users and customers: automated onboarding + *Test-my-AI* nudges lift
activation; after a customer goes live, the engine auto-requests a review; 4–5-star responses are published
on the landing page.
**Why it compounds:** more customers → more auto-collected 5-star reviews → higher landing-page trial
conversion → more customers, at no marginal effort. The product literally manufactures its own testimonials
and raises its own conversion rate.

### Loop 3 — Referral on top of the Founder Offer (bottom-funnel, $0)
**Mechanic:** the Founder Offer (first 10 paid get every add-on free for life) creates evangelists.
Bolt a simple referral on: on `payment.received`, the product auto-texts the new customer — *"Know another
owner drowning in missed calls? Share your link — you both get a month free."* Referrals tracked via the
product webhook → Make → CRM.
**Why it compounds:** trades owners cluster tightly, so one happy roofer reaches the HVAC guy and the
electrician. Even a **K-factor of ~0.3** (each activated customer brings 0.3 new paid) lowers CAC every
cycle and keeps the machine producing past day 30. The Founder scarcity ("only N slots left") also makes
*referred* prospects move faster.

> **B2B side-loop (LinkedIn, slower-burn):** integrators, trade associations, and agencies serving home
> services can refer/resell via the product's webhooks/Zapier layer. Not a 30-day driver, but seed 3–5
> partner conversations in Weeks 3–4 — it's the cheapest post-sprint growth channel.

---

## 6. Week-by-week 30-day execution timeline

Each week is tied to the one KPI it moves. Remember the scheduling truth: **acquisition front-loads into
Weeks 1–3; Week 4 is a conversion sprint.**

### WEEK 0 — Setup / prime the machine (KPI: infrastructure & tracking verified)
- Stand up the stack: Metricool, HubSpot Free CRM, MailerLite, PostHog on the site, Make.com; **connect
  the product's webhooks → Make → CRM + dashboard sheet.**
- Build the **"Hear the AI" demo landing page**: one-tap call, 30-sec sample clip, "text a buddy" button,
  optional email capture. Wire the PostHog funnel (page view → hear-it click → demo-call intent → trial
  start → activated).
- Batch-create and queue **20–30 posts** in Metricool; draft the pre-trial email sequence in MailerLite.
- Build the outbound engine: join target FB owner groups, compile a ~300–500 ICP list, load templates into
  TextBlaze, set up the Airtable/Notion outreach board.
- **Dogfood:** point our own business line at the product; turn on trial-onboarding + Test-my-AI + review
  automations.
- Stand up the one-screen weekly dashboard. Set the Founder-slots counter (10).
- **Exit gate:** stack live · demo page live and the call actually works · 20 posts queued · 300 outbound
  targets loaded · **end-to-end test lead flows source → CRM → dashboard.**

### WEEK 1 — Launch / seed demo calls (KPI: #2 Demo-AI calls)
- Publish daily; every post's CTA is **"call it and hear it."** Announce the **Founder Offer (10 slots)**.
- Start outbound: **~100 touches** (LinkedIn DMs + FB-group value replies), all funneling to the demo.
- Launch the Meta ad test (~$150 this week) straight to the demo landing page, tight home-services ICP.
- Watch which message/creative drives demo calls; double down on the winner.
- **Targets (W1):** reach ~12k · demo calls ~10 · leads ~35 · trials ~5–7 · activated ~4 · paying ~1–3.

### WEEK 2 — Optimize / find what converts (KPI: #4 Trial starts + #5 Activation)
- Kill losing ad creative, scale the winner (~$150). Double down on the outbound angle that produced calls.
- First trial cohort hits its 7-day decision → the product's own SMS/email pushes **activation + Test-my-AI**
  → convert. Publish the first auto-collected review to the landing page (Loop 2 starts paying).
- **Bottleneck check:** is leads or trial-starts pinching harder? Reallocate accordingly.
- **Targets (cumulative):** reach ~30k · demo calls ~26 · leads ~90 · trials ~14 · activated ~9 · paying ~5–7.

### WEEK 3 — Scale the winner / trigger referral (KPI: #8 Outbound volume + #3 Leads)
- Push outbound to **~120–150 touches** on the proven message. Spend remaining ad budget (~$100–150) on
  the single best creative → demo page.
- Seed demo-clip shares in FB owner groups (Loop 1). Fire the first **referral asks** to activated customers
  (Loop 3). **This is the last heavy trial-START week** — every trial started now still converts by day 30.
- **Targets (cumulative):** reach ~50–60k · demo calls ~45 · leads ~150 · trials ~24 · activated ~16 ·
  paying ~10–13. Founder slots visibly filling → amplify scarcity.

### WEEK 4 — Close / sprint the Founder Offer (KPI: #6 Trial→Paid + #7 Paying)
- **Conversion week, not acquisition.** Full-court press on active trials near their decision: activation
  nudges + Test-my-AI + **"last founder slots" scarcity** across every channel.
- Referral ask to every activated customer. Final ad dollars on **retargeting** site visitors and
  demo-callers who didn't trial. Seed 3–5 B2B partner conversations for post-sprint.
- **Targets (cumulative / day 30):** demo calls ~60–70 (base) / ~110 (stretch) · trials ~28 / ~45 ·
  activated ~18 / ~34 · **paying ~11–13 (base) / ~20–24 (stretch).**
- **Day-30 review:** base vs stretch, what to keep running. The machine persists past day 30 — the trials
  started on days 24–30 convert in early Week 5, so momentum carries.

---

## 7. Failure modes & the pre-wired fix

| If this stalls… | You'll see it as… | The fix (already in the plan) |
|---|---|---|
| Nobody calls the demo | Metric #2 flat | Make "hear it" the *only* first CTA; add the sample clip + "text a buddy"; move ad spend to the demo page, not the homepage. |
| Demo calls happen, no trials | #2 up, #4 flat | Tighten the demo→trial handoff (call ends → SMS with the trial link); lean on the Founder scarcity; retarget demo-callers. |
| Trials start, don't activate | #5 < 60% | Product's own onboarding SMS/email: shrink go-live to number+calendar; auto-fire "Test my AI." |
| Activated, don't pay | #6 < 40% | It has to *work* on their real calls — prioritize activation quality; surface auto-collected reviews; countdown the Founder slots. |
| Reach too low | #1 flat | Outbound is the controllable channel — raise touch volume (templated), and get value-comments into big FB owner groups. |

**Golden rule:** if you can only fix one thing this week, fix whatever is upstream-most in the funnel that's
off-target — a leak at demo calls makes every downstream optimization worthless.
