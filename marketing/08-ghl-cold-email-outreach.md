# 08 — Cold Email Outreach for a Purchased/Built List (GoHighLevel)

**Owner: Outbound lane. Source of truth: `00-campaign-foundation.md` (that doc wins on any conflict).**
_Last updated: July 25 2026._

This is a **different channel** from `03-outbound-sequences.md`. That file is manual, ToS-safe LinkedIn/
Facebook DMs to people you've identified one at a time. This file is for **a list of local service
businesses you don't have a relationship with, blasted through a GoHighLevel email campaign.**

**Email only — no cold SMS.** Here's why, in one paragraph: cold **email** in the US is governed by
CAN-SPAM, which is *opt-out* — you can email a stranger as long as you identify yourself honestly, give a
working unsubscribe, and honor it. Cold **text** is governed by the TCPA, which is *opt-in* — you need the
recipient's prior express consent *before* you text them, full stop, and statutory damages run
$500–$1,500 **per text** in a successful suit. There is no legitimate way to cold-SMS a purchased or
scraped list. It would also be directly hypocritical: this product's whole pitch to prospects is that we
handle SMS consent (STOP/HELP, opt-in) more carefully than anyone else in the category. Don't undercut
that by blasting texts to people who never asked to hear from us. If you want a warm-network text/email
to people you actually know, that's a different, easy, zero-risk motion — ask me for it separately.

---

## 0. Fill these in once (same tokens as `03-outbound-sequences.md`)

| Token | What it is | Value |
|---|---|---|
| `(440) 644-2423` | The public "call it and hear it" demo line | — |
| `https://missednomorepro.com/signup` | Self-serve trial signup | — |
| `10` | Live Founder's Offer slots remaining (of 10) — check `/admin` before a big send | — |
| `Josh` | Sender's real first name | — |

**Per-contact fields**, mapped from whatever your imported list actually has —
GoHighLevel's own merge syntax, e.g. `{{contact.first_name}}`, `{{contact.company_name}}`, or a custom
field `{{contact.custom_field_key}}` if you added one (e.g. `trade`, `city`). Swap the placeholder tokens
below (`{{first_name}}`, `{{company}}`, `{{trade}}`, `{{city}}`) for GHL's real merge tags once the list is
imported — GHL will show you the exact tag names from your contact fields when you build the email.

**Same golden rule as the DM playbook applies here, arguably more strongly:** a byte-identical blast with
no real reason to reach this specific business reads as spam and drags down your sending domain's
reputation for every email after it (including your product's own transactional texts/emails, if you ever
share sending infrastructure — see §3). If you can attach one real, specific reason per contact (running
ads, bad reviews about missed calls, hiring a dispatcher, a seasonal surge), do it. If you truly can't, at
minimum segment by trade and city so the email reads as *relevant*, not random.

---

## 1. Where a cold email list for this ICP actually comes from

Harder than LinkedIn/Facebook — small trades businesses often don't publish an email prominently. Realistic
sources, roughly in order of list quality:

1. **Google Business Profile listings** — many have a public "message business" email or a website link
   with a contact page. Slower to build than LinkedIn, but higher trust (they published it themselves).
2. **The business's own website contact page** — `info@`, `office@`, or a named owner's email.
3. **State contractor/trade license lookups** — many states publish licensee name + business + sometimes
   email in a public license-search database (varies by state and trade — HVAC, electrical, and plumbing
   are the most commonly licensed).
4. **Hunter.io or Apollo.io free tiers** — find/verify a business email from its domain. Free tiers cap
   at a small number of lookups/month; fine for a first batch, not for thousands.
5. **Do NOT** buy a generic "small business email list" from a data broker — quality is usually terrible
   (dead addresses, wrong trade, wrong size), and a high bounce rate on your first-ever send is exactly
   what burns a brand-new sending domain's reputation before it has a chance to build one.

Build the list in a spreadsheet first (name, company, trade, city, email, `signal_detail` if you have one),
verify emails with a free checker (Hunter/NeverBounce/ZeroBounce all offer a small free tier) to strip dead
addresses, **then** import to GHL. A clean list of 200 beats a dirty list of 2,000.

---

## 2. GoHighLevel sending setup — do this before your first send

Skipping this step is the single most common way a first cold-email campaign lands entirely in spam and
never recovers:

1. **Connect and verify a sending domain** (Settings → Email Services in GHL) with SPF, DKIM, and DMARC
   records added at your DNS host. Don't send cold volume from a brand-new, unverified domain.
2. **Don't send from `missednomorepro.com` itself** if it's also carrying transactional mail (billing
   receipts, trial confirmations, password resets) — a spam-complaint spike on a cold campaign can drag
   down deliverability for those emails too. Use a **separate subdomain** (e.g.
   `outreach.missednomorepro.com`) with its own SPF/DKIM, so a cold-email deliverability problem can't
   touch the product's real transactional email.
3. **CAN-SPAM checklist** (GHL handles most of this automatically for marketing emails, confirm it's on):
   accurate "From" name and a real reply-to inbox you actually read; a working one-click unsubscribe;
   your real business mailing address in the footer; honor opt-outs within 10 business days (GHL does
   this immediately when the built-in unsubscribe link is used).
4. **Warm up volume.** Day 1–3: 20–30 sends/day. Ramp over two weeks toward your full list. A new domain
   blasting 1,000 emails on day one gets flagged by spam filters regardless of content quality.
5. **Avoid spam-trigger patterns**: no ALL-CAPS subject lines, no excessive exclamation points, don't
   over-use "free" (a couple of natural mentions of "free trial" is fine), keep an HTML-to-plain-text
   ratio that leans toward plain text, keep image count low.

---

## 3. The sequence (4 emails, ~10 days — same throughline as the DM playbook)

Every email closes on one of the two self-serve CTAs — **never** "book a call with our team":
**hear the AI** (`(440) 644-2423`) or **start the free trial** (`https://missednomorepro.com/signup`).

### Email 1 — Day 0: the pain, lead with "just call it"

**Subject line variants (rotate/A-B test):**
- `Quick question about missed calls at {{company}}`
- `{{first_name}} — who answers when you're on a job?`
- `The phone problem every {{trade}} shop has`

**Body:**

> Hi {{first_name}},
>
> Quick question — when you're under a sink, on a roof, or driving between jobs, who answers the phone at
> {{company}}? For most owner-operators I talk to, the honest answer is "nobody, it goes to voicemail" —
> and about 80% of callers won't leave one. They just call the next {{trade}} company in {{city}}.
>
> I built an AI receptionist that answers every call 24/7, quotes your exact prices, and books the job
> straight to your calendar. Rather than describe it, the fastest way to judge it is to just **call it
> and talk to it like a customer**: (440) 644-2423. Takes about a minute.
>
> — {{Josh}}
>
> P.S. If this isn't relevant to you or {{company}}, no hard feelings — one click below and you won't
> hear from me again.

### Email 2 — Day 3: the ROI math (if no open/click on Email 1)

**Subject line variants:**
- `The math on one missed call at {{company}}`
- `Still handling calls solo, {{first_name}}?`

**Body:**

> {{first_name}} — following up once with the number that actually matters.
>
> At a typical {{trade}} job (call it $300–$1,500), catching **one extra missed call a month** more than
> covers the cost of an AI receptionist running 24/7. Most owners are missing a lot more than one.
>
> Same offer as before, zero pressure: call (440) 644-2423 and have a real conversation with it — ask it
> your own prices, try to trip it up. It's answering live right now.
>
> — Josh

### Email 3 — Day 6: founder scarcity + the trial (if still no engagement)

**Subject line variants:**
- `10 spots left — free add-ons for life`
- `Last thing on this, {{first_name}} (founder deal inside)`

**Body:**

> {{first_name}} — one more from me, then I'll leave it alone.
>
> We're running a **founder's offer right now: the first 10 businesses to come on as paying customers get
> every current and future paid add-on free, for as long as they stay subscribed.** {{10}} spots left.
>
> Two ways in, both self-serve, no call required:
> - **Hear it first:** call (440) 644-2423 and talk to it like a customer.
> - **Try it on your own line:** 7-day free trial, connects to your number and calendar —
>   https://missednomorepro.com/signup
>
> Either way, no pressure from here.
>
> — Josh

### Email 4 — Day 10: the breakup (short, leaves the door open)

**Subject line variants:**
- `Closing the loop, {{first_name}}`
- `Last one from me`

**Body:**

> I'll stop filling your inbox, {{first_name}} — I know running {{company}} keeps you busy enough. If the
> missed-call thing ever becomes a real problem, the demo line's always live: (440) 644-2423. Good luck
> with the season.
>
> — Josh

---

## 4. Reply-handling bank (email replies — same answers as the DM playbook, §5 of `03`)

| They reply | You send |
|---|---|
| "How much?" | "Starts at $99/mo flat, hard cap, no surprise per-minute charges. There's a free 7-day trial: https://missednomorepro.com/signup — or hear it first: (440) 644-2423." |
| "Is this a bot / does it sound robotic?" | "That's exactly why I'd rather you just call it — (440) 644-2423 — and judge for yourself. Takes a minute." |
| "We already have an answering service." | "Makes sense — the real difference is a service takes a message; this books the job into your calendar and texts the caller back in seconds, 24/7, no per-call fee. Worth a 60-second listen to compare: (440) 644-2423." |
| "Not interested." | "Totally fair, {{first_name}} — I'll take you off the list. Appreciate you saying so." *(then suppress/unsubscribe them in GHL immediately, don't wait for the unsubscribe link)* |
| "Remove me / stop emailing me." | Honor immediately — don't rely on them finding the unsubscribe link if they've replied directly asking. |

---

## 5. Building this as a GHL workflow

1. **Import the verified list** into a GHL contact list/tag (e.g. `cold-outreach-batch-1`) with whatever
   custom fields you have (`trade`, `city`, `signal_detail`).
2. **Workflow trigger:** contact added to that tag.
3. **Action:** send Email 1 → **Wait 3 days** → **If/else: has the contact opened/clicked/replied?**
   - No → send Email 2 → **Wait 3 days** → same branch check → Email 3 → **Wait 4 days** → check → Email 4.
   - Yes (opened/clicked the demo number or trial link) → stop the automated sequence and add a task/
     notification for you to personally follow up — a warm reply deserves a human, not the next
     scheduled blast.
4. **Suppression:** anyone who unsubscribes, marks spam, or replies "stop/not interested" gets removed
   from the workflow and tagged `do-not-contact` — GHL should do the unsubscribe part automatically; the
   reply-based ones you do by hand from §4.

---

## 6. Metrics to watch (check weekly, same rhythm as `03` §7e)

| Metric | Rough healthy target | What a bad number means |
|---|---|---|
| Delivery rate | 95%+ | Below this → list quality problem (dead emails), fix before sending more |
| Open rate | 15–25%+ | Low → subject lines weak, or you're landing in spam (check domain auth) |
| Click rate (to demo line mention / trial link) | 2–5%+ | Low → offer/copy isn't landing, tighten the "why you" reason per segment |
| **Demo-call rate** | as high as possible | Same leading indicator as `03` — this is the number that predicts trials 7 days out |
| Unsubscribe / spam-complaint rate | under 0.3–0.5% | Above this → **stop the campaign**, it's actively damaging domain reputation |

If unsubscribe/spam-complaint rate spikes, the fix is never "send different copy to the same list faster"
— it's smaller batches, better list quality, and a real reason to reach out per contact.
