# Marketing System — 30-Day Customer Sprint

Goal: land the first paying customers for Missed No More Pro in 30 days.
Channels: LinkedIn and Facebook. Budget: $0 to $500 ad spend. Founder time: minimal.

This folder is a complete, ready-to-run marketing system. Every file is copy-paste ready.
Read this page first. It is your control panel.

---

## The honest goal

The Growth plan modeled the funnel end to end. Here is the truth, not hype.

- Base case, most likely: about 11 to 13 paying customers in 30 days.
- Stretch case, 20 plus: possible, but four things must break right at once. See `05` section 4.
- The bottleneck is trial starts, the moment a stranger puts a card down. Not reach, not leads, not cash.
- The single biggest lever: make every prospect HEAR the AI before you ask for the trial. A prospect
  who has heard it converts 3 to 5 times better, at zero founder time.

Twenty in 30 days is the target. Eleven to 13 is a win that keeps compounding after day 30.

---

## Launch status: unblocked

All three original blockers are cleared. Every asset in this folder has the real values filled in.

| Item | Value | Status |
|---|---|---|
| Demo line ("hear the AI") | **(440) 644-2423** | Live. Answers as Summit Home Services. |
| Trial link | https://missednomorepro.com/signup | Live |
| Founder slots left | **10 of 10** | None claimed yet |
| Founder name | Josh Millsaps | Filled in |

### The demo line

(440) 644-2423 is a dedicated sandbox business, **Summit Home Services**, an HVAC and plumbing shop
in the Cleveland area. It is deliberately a separate tenant from the real roadside business, so demo
calls never touch real customer data, real usage, or real billing. It is comped a plan with a hard
$3/day spend cap.

It answers 24/7, holds a natural conversation, quotes exact prices from a real price sheet, captures
the lead, and texts a missed-call follow-up. It cannot book a real job or dispatch anyone.

Rebuild or change it any time with:

```bash
node scripts/seed-demo-business.mjs
```

Check that it is healthy with:

```bash
node scripts/demo-verify.mjs
```

**One number to maintain:** as founder slots get claimed, the "10 slots left" copy in these docs goes
stale. Check the Founder column in `/admin` and update the number before a big push.

### How to tell prospects to use it

Give people a scenario. A cold caller who does not know what to say gets a worse demo than one with a
prompt. The line that works best:

> "Call (440) 644-2423 and pretend you're a homeowner whose AC just quit. Ask it anything, including
> the price. Try to trip it up."

That sends them down the strongest path: natural conversation, an exact quote, a captured lead, and a
clean hangup. Two things worth knowing:

- **It quotes real prices** because the demo shop has a real price sheet. Those numbers are computed
  by the server, never invented by the AI. That is the point to highlight.
- **It serves the Cleveland area, 75 miles.** A prospect who gives an address in another state gets a
  polite "you may be just outside our area, but let me take your details." That is correct behavior
  and still a good demo, but the "homeowner with a broken AC" framing avoids it entirely.
- **If a caller asks for a human, your cell rings** (216-415-1568). That is the warm-transfer feature
  working, and a demo caller asking for a person is a hot lead. Turn it off by clearing the
  notify-on-lead staff contact if it becomes noisy.

### The money facts

Confirmed against the live catalog, July 2026:
- Every plan already includes 4 AI add-ons free: Omnichannel Chat, Business Assistant, Reputation
  Manager, Call Intelligence. About $116/mo of value, standard on every plan.
- The only remaining paid add-on is the AI Outbound Assistant at $49/mo.
- Founder's Offer: the first 10 businesses to go paid get that $49/mo add-on, plus any future paid
  add-on, free for life while subscribed.
- Plans: Starter $99, Growth $199, Professional $349, Elite $599. Annual is cheaper.
- Trial: 7 days, card required, about 30 minutes of talk time. Hard cap, no surprise overage.

Safe value line to publish: "a $49/mo add-on free for life, on top of the ~$116/mo of AI tools every
plan already includes."

---

## What each file is

| File | What it is | Use it for |
|---|---|---|
| `00-campaign-foundation.md` | Source of truth: ICP, pain, offer, pricing, guardrails | Read once. It wins any conflict. |
| `01-messaging-and-offer.md` | The offer stated 3 ways, lead magnets, founder-offer copy, CTA ladder | Headlines, hooks, landing copy, DM openers |
| `02-linkedin-playbook.md` | Profile, pillars, 30-day calendar, 13 written posts | LinkedIn organic, reaching operators and partners |
| `03-outbound-sequences.md` | ICP targeting, LinkedIn and Facebook DM sequences, cadence | Daily outreach, all ToS-safe manual |
| `04-facebook-and-ads.md` | Owner-group play, page posts, the $500 ad test | Facebook, the main channel for this ICP |
| `05-automation-funnel-metrics.md` | Funnel, tool stack, KPIs, honest math, growth loops | The machine. Your metrics live here. |
| `06-objections-and-nurture.md` | 12-objection battlecard, trial-to-paid nurture | Answering doubts, converting trials |
| `07-30-day-execution-calendar.md` | Day-by-day checklist tying it all together | What to do each day |

---

## Success metrics, quick reference

North star: paying customers. Base 11 to 13, stretch 20.

Watch this one metric daily: demo-AI calls, the count of people who called and heard it. It leads
paying customers by about 7 days. If demo calls are on pace, sales follow. If they stall, fix that
before touching anything else.

Full KPI table and the one-screen weekly dashboard are in `05` section 3. Nine metrics, base and
stretch targets, and where each number comes from.

---

## The tool stack, all free tier

Only money that moves is the $500 ad test. Everything else runs on $0.

- Scheduling and reach: Metricool, covers LinkedIn and Facebook in one place.
- Pre-trial CRM and email: HubSpot Free plus MailerLite.
- Outbound tracking: Airtable or Notion board plus TextBlaze snippets. No LinkedIn bots, they get you banned.
- Analytics: PostHog plus Vercel Web Analytics. UTM tags on every link.
- Glue: Make.com free tier, wired to the product's own webhooks.
- Post-trial nurture: the product itself. Dogfood the SMS, email, and review engine on your trials.

Wiring diagram is in `05` section 2.

---

## Your minimal-time weekly rhythm

The system is built so you spend about 30 to 45 minutes a day, plus one batch day in Week 0.

- Week 0: build once. Stand up the demo number, wire the stack, batch and schedule 20 to 30 posts,
  load your outreach list. Full checklist in `07`.
- Weeks 1 to 3: acquisition. Publish on schedule, send outreach daily, run the ad test. Front-load,
  because a 7-day trial started after day 23 does not convert inside the sprint.
- Week 4: conversion sprint. Push active trials to activate and convert. Amplify the founder-slot scarcity.

Everything downstream of "hear the AI" is automated by the product. Your daily job is feeding the top
of the funnel and letting the demo do the selling.
