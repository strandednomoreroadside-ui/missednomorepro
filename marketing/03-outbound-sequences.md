# 03 — Outbound Sequences (LinkedIn + Facebook)

**Owner: Outbound lane. Source of truth: `00-campaign-foundation.md` (that doc wins on any conflict).**
_Last updated: July 24 2026._

This is the play for **manually-run, ToS-safe, low-touch outbound** on LinkedIn and Facebook. Everything
here drives to **one of two self-serve CTAs — never a booked sales call:**

1. **"Hear the AI — call it now"** → the live demo number (they have a real conversation with Grace).
2. **"Start your free trial"** → self-serve, card-on-file 7-day trial at the site.

---

## 0. Fill these in before you send a single message

Replace these tokens everywhere they appear (do a find-and-replace once, then the copy is ready to ship):

| Token | What it is | Example |
|---|---|---|
| `(440) 644-2423` | The public "call it and hear it" demo line | (440) 555-0199 |
| `https://missednomorepro.com/signup` | Self-serve trial signup | missednomorepro.com |
| `10` | Live Founder's Offer slots remaining (of 10) | 7 |
| `Josh` | The founder's / sender's real first name | — |

**Per-prospect personalization tokens** (filled from your prospect sheet, one row per person):
`{{first_name}}` · `{{trade}}` (plumber, HVAC, roofer…) · `{{city}}` · `{{company}}` ·
`{{signal_detail}}` (the specific reason you reached out) · `{{review_quote}}` (a real snippet, when used).

**Golden rule:** if you can't fill `{{signal_detail}}` with a real, specific reason you picked this person,
they don't go in the sequence. No reason to reach out = no message. That single rule is what keeps reply
rates in the 12–25% range instead of the 1–3% spray-and-pray gutter.

---

## 1. Tight ICP + buyer persona

### 1a. The account (who the business is)

| Filter | In | Out (disqualify) |
|---|---|---|
| **Trade** | Plumbing, HVAC, electrical, roofing, garage door, appliance repair, cleaning/maid, landscaping & lawn, pest control, pool, handyman, painting, junk removal, roadside/towing, water damage/restoration, locksmith, fencing, pressure washing | National franchises w/ a corporate call center already; pure-online/e-comm; anything with a staffed 9–5 front desk that never misses a call |
| **Size** | 1–15 employees; owner still answers or is one ring away from the phone | 25+ employees / dedicated answering department |
| **Phone reality** | Cell # is the business #, "text me," goes to voicemail after hours, one person juggling phone + field | Already runs a real receptionist team or a 24/7 human service they're happy with |
| **Money signal** | Spends on lead gen (Google/FB ads, Angi, Thumbtack, truck wraps) — they already *pay* for calls | Zero marketing, no web presence, clearly winding down |
| **Geo** | Nationwide US | — |

**Two audiences by channel** (per the foundation — owners live on Facebook; LinkedIn skews bigger/partner):

- **Facebook = the core buyer.** Solo owner-operators and 2–5 person crews. They're in trade groups
  swapping war stories and asking for tool recommendations.
- **LinkedIn = the bigger operators + referral partners.** Multi-truck / multi-location operators and
  franchisees (they have real call volume and buy fast), **plus** channel partners who can send us many
  customers at once: suppliers/distributors, trade associations, franchise networks, bookkeepers/coaches
  who serve the trades.

### 1b. The persona — "Mike, the owner-operator"

- Runs a 1–8 person {{trade}} shop. **He is the phone.** Answers from under a sink, on a roof, driving,
  or misses it entirely — and hates that he does.
- Not technical. Allergic to "corporate," jargon, and long sales calls. Decides in minutes when the ROI
  is obvious and he can *see it work himself.*
- Every missed call is personal — he knows it was probably a $400–$2,000 job that just called his
  competitor instead.
- Has been pitched a hundred "marketing" things and is skeptical. **He does not trust claims; he trusts
  hearing it.** That's why every message ends with "call it yourself," not "let me show you a demo."
- Buys tools that pay for themselves in one saved job. $99/mo is a rounding error if it catches even one
  call a month — and that's the whole pitch.

---

## 2. Trigger signals — how to spot a HOT prospect (ranked)

Untriggered cold outreach converts at 1–3%. Signal-based outreach with a real, specific reason converts
**4–8× that.** Only work prospects who throw off at least one of these. All of these are findable **free**
or with one cheap tool.

### Tier 1 — Active, high-intent (work these first)
1. **Running paid ads = they pay for leads and can't afford to miss them.**
   - **Facebook Ad Library** (`facebook.com/ads/library`, 100% free, public): search a trade + city,
     see who's running **active** ads. An owner buying clicks who then sends callers to voicemail is the
     single best prospect we have. `{{signal_detail}}` = "saw you're running ads for {{trade}} in {{city}}."
   - **Google**: search "{{trade}} {{city}}" and note who shows up as a **Google/LSA ad**.
2. **Reviews that literally describe our product's job.** Google/Facebook reviews containing
   *"never answers," "couldn't reach anyone," "went to voicemail," "never called me back,"
   "left three messages."* Screenshot-worthy, undeniable pain. `{{review_quote}}` = a real snippet.

### Tier 2 — Organizational / growth
3. **Hiring.** A post for a **dispatcher / office admin / CSR / "answer phones"** = phone pain they're
   about to spend $35k/yr on. A post for **more techs** = growing call volume. (Indeed, FB job posts,
   LinkedIn "hiring" frames.)
4. **New or fast-growing shop.** Recently launched page, "now serving {{city}}," "under new ownership,"
   "adding a second truck." Scaling pain is real pain.
5. **Seasonal surge.** HVAC in a heat wave, roofers after a storm, plumbers in a freeze, landscapers in
   spring. They are drowning in calls *right now.*

### Tier 3 — Behavioral / self-identified (warmest of all)
6. **They said it themselves.** An owner posts in a group: *"missing calls while I'm on jobs — what do you
   guys do?"* / *"need a cheap answering service"* / *"how do you handle the phone solo?"* This is a raised
   hand. Respond helpfully in-thread, then DM. Highest conversion of anything here.
7. **"24/7 service" they can't staff.** A solo owner whose website/ad promises "24/7" or "we answer every
   call" — they physically can't, and they know it. Gentle, not gotcha.

> **Speed matters.** A group post asking for help is stale within a day and gone within three — a
> competitor (or another owner) will have answered. Work Tier-3 signals same-day.

---

## 3. Where to find them at scale

### 3a. LinkedIn — Sales Navigator filter sets (by trade)

Sales Navigator ($99/mo, month-to-month — cancel after the sprint; comfortably inside the $0–500 budget)
is worth it **for list-building and filtering only.** Reading and filtering data is fine; the ban risk is
in *automating actions* (see §6). You still send every message by hand.

**Base filter set — direct buyer (bigger operators):**
- **Job title (current):** `Owner OR President OR "General Manager" OR Founder OR "Operations Manager" OR CEO`
- **Company headcount:** `2–10` **and** `11–50` (this is where multi-truck operators live)
- **Industry:** `Construction`, `Consumer Services`, `Facilities Services`, `Environmental Services`
  (trades scatter across these — the keyword field does the real trade-targeting)
- **Keywords (company/title):** run one trade at a time —
  `plumbing` · `HVAC OR "heating and cooling" OR "air conditioning"` · `electrical OR electrician` ·
  `roofing` · `"garage door"` · `"appliance repair"` · `"pest control"` · `landscaping OR "lawn care"` ·
  `"pool service"` · `handyman` · `painting` · `"junk removal"` · `towing OR roadside` · `restoration OR "water damage"`
- **Geography:** `United States` (or spotlight a metro when you want to name a `{{city}}`)
- **Posted content keywords / "Recently posted on LinkedIn":** use to catch owners actively posting
  (they're reachable and responsive).
- **Spotlights:** `Changed jobs in last 90 days` and `Company headcount growth` = Tier-2 growth signal
  baked into the filter.

**Free-LinkedIn fallback (no Sales Nav):** use the normal search bar with
`("owner" OR "president") AND (plumbing OR HVAC OR roofing…) {{city}}`, filter by **People**, **2nd-degree**
first (higher accept rate), and **Location.** Slower, but $0.

**Partner / referral list (sends us many customers at once):**
- Titles: `Owner`/`Sales` at **HVAC/plumbing/electrical supply & distribution**, `"Executive Director"` at
  **state/regional trade associations** (e.g., state HVAC/roofing/PHCC chapters), `Franchise Development` /
  `Franchisee` at home-service franchise brands, and **bookkeepers/coaches/consultants who serve the trades.**
- These get a different, partnership-framed sequence (§4c).

### 3b. Facebook — where owners actually congregate

Owners gather in **trade groups** (peer advice) and **local business groups.** How to find and qualify:

**How to find the groups:**
- Search Facebook for: `{{trade}} business owners`, `{{trade}} contractors`, `HVAC business owners`,
  `plumbers of [region]`, `contractor business growth`, `home service business owners`,
  `[your state] contractors`, `field service business owners`, `blue collar business owners`,
  `six figure contractors`, `service business marketing`.
- Also: `{{city}} small business network`, `{{city}} entrepreneurs`, and local BNI/chamber groups.

**Group types & how to qualify one before investing time:**

| Group type | Why it's good | Qualify it by |
|---|---|---|
| **National trade-owner groups** (e.g., "HVAC Business Owners," "Plumbers Success Network") | Dense with exact ICP; people ask for tool recs constantly | 5k+ members, posts from the **last 24–48h**, owners (not just techs) posting business questions |
| **Contractor/home-service growth & marketing groups** | Owners there are already in "improve my business" mode | Active mods, real discussion (not a link-dump wall), members answering each other |
| **Local business / chamber / networking groups** | Warm, same-city trust; good for `{{city}}` personalization | Real local owners, low spam, occasional "recommend a…" threads |
| **Brand/franchise owner groups** | Concentrated, high call volume | Franchisee-only, active |

**Qualify individual owners inside a group:** they post/comment as an **owner** (not an employee tech),
their profile or a pinned post shows a **{{trade}} business**, and ideally they've shown a **Tier-1/2/3
signal** (runs ads, complains about the phone, asks for tools, "hiring"). Note them in your sheet.

**Read the rules first.** Most good groups **ban promotion/link-dropping** and will remove you or ban you
for it. That's fine — our safe play (§4b) is *value first, DMs second*, which respects those rules and
actually works better.

---

## 4. The sequences (finished copy — pick a variant, personalize, send)

> Two hard content rules that keep you out of spam jail and lift replies:
> **(1)** No link in a first touch — LinkedIn and Facebook both suppress/flag cold messages with links.
> Give the demo **phone number** (a number is friendly, a link is a red flag), or say "I'll send it if
> you want it." **(2)** Rotate between the variants below so you're never sending byte-identical copy at
> volume (identical mass-copy is the #1 spam-filter trigger).

### 4a. LinkedIn — direct buyer sequence (5 touches over ~18 days)

**Touch 1 — Connection request note** (no link; keep under ~200 characters; personalize `{{signal_detail}}`)

> _Variant A (ad signal):_
> "Hi {{first_name}} — saw {{company}} is running ads for {{trade}} work around {{city}}. I help owners
> like you stop those hard-won calls going to voicemail. Would like to connect."

> _Variant B (peer/neutral):_
> "Hi {{first_name}} — I work with {{trade}} owners on the missed-call problem (calls coming in while
> you're on the job). {{company}} looks like exactly the kind of crew I learn from. Open to connecting?"

> _Variant C (growth signal):_
> "Hi {{first_name}} — noticed {{company}} is growing ({{signal_detail}}). More calls than hands to
> answer them is a good problem I help {{trade}} owners solve. Let's connect."

**Touch 2 — DM #1, immediately after they accept** (lead with pain + the "hear it yourself" CTA; still no link)

> _Variant A:_
> "Thanks for connecting, {{first_name}}. Quick reason I reached out — most {{trade}} owners I talk to
> miss 25–40% of their calls (under a sink, driving, after hours), and ~80% of those callers never leave
> a voicemail. They just dial the next guy.
>
> I built an AI receptionist that answers 24/7, books the job, and texts back any call you miss. Honestly
> the fastest way to get it is to just **hear it** — call (440) 644-2423 and talk to it like a customer
> would. Takes 60 seconds. Curious what you think."

> _Variant B (shorter):_
> "Appreciate the connect, {{first_name}}. I'll keep this short — how many calls a week do you figure
> {{company}} misses while you're on a job? For most owners it's more than they'd like, and those callers
> rarely leave a voicemail.
>
> I made an AI that answers every call 24/7 and books the job. Don't take my word for it — **call
> (440) 644-2423 and hear it yourself** (talk to it like you're a customer). Worth 60 seconds?"

**Touch 3 — DM #2, +3 days if no reply** (new angle: the money, not the tech)

> "Not trying to pester you, {{first_name}} — one number and I'll leave you be: at, say, a $400 average
> job, catching just **one** extra missed call a month more than pays for the whole thing. Most owners
> miss way more than one.
>
> If you'd rather just hear it than read me talk about it: (440) 644-2423. Real conversation, no signup."

**Touch 4 — DM #3, +5 days if no reply** (social proof + trial + the scarcity hook; a link is OK now that there's a thread)

> "Last thing from me on this, {{first_name}} — figured you'd want to know we're running a **founder deal:
> the first 10 shops to come on get every paid add-on free for life. 10 slots left.**
>
> There's a **7-day free trial** (self-serve, no call with me required) — you connect your number and hear
> your *own* AI answer for {{company}}: https://missednomorepro.com/signup. Or just call the demo first: (440) 644-2423. Either
> way, no pressure."

**Touch 5 — DM #4, +7 days, the breakup** (honest, short, leaves the door open)

> "I'll stop cluttering your inbox, {{first_name}} — I know you're slammed running {{company}}. If the
> missed-call thing ever gets on your nerves, the demo line's always on: (440) 644-2423. Wishing you a
> big season. — Josh"

### 4b. Facebook — owner sequence (value-first; DM second; never spammy)

Facebook flags cold, salesy Messenger DMs *fast* — especially with links to strangers you're not friends
with. So the FB play is **earn the conversation in the group, then move to DM warm.** Three motions:

**Motion 1 — Answer raised hands (Tier-3 signal; highest conversion).**
When an owner posts *"how do you all handle the phone while on jobs?"* / *"missing calls, losing money"* /
*"need a cheap answering service,"* reply **in the thread, genuinely, no link:**

> "This was killing me too. Voicemail's basically dead — something like 80% of callers won't leave one,
> they just call the next company. What finally worked for me was an AI that answers 24/7 and books the
> job + texts the caller back if I miss it. Happy to point you to the one I use if it's helpful — didn't
> want to drop a link uninvited in {{group_name}}."

Then, if they reply "yeah what is it?" (or react/comment), **DM warm:**

> "Hey {{first_name}} — you asked about the phone thing in {{group_name}}. The one I use is an AI
> receptionist that answers every call 24/7, books the job, and texts back anyone you miss. Coolest part:
> you can **just call it and hear it** before doing anything — (440) 644-2423. Talk to it like a
> customer. If you like it there's a free 7-day trial where it answers as *your* shop. Want the link?"

**Motion 2 — Value post (2–3×/week; pulls DMs to you, respects no-promo rules).**
Post *your own* helpful content (not a pitch) in groups that allow discussion. It surfaces the pain and
lets interested owners come to you:

> **Post:**
> "Owner-operators: quick gut check. Do the math on missed calls this month — figure 25–40% of your
> inbound goes to voicemail while you're on a job, and ~4 out of 5 of those never leave a message. At your
> average ticket, what's that adding up to?
>
> I got tired of eating that number, so I've been running an AI that answers 24/7 and books the job while
> I'm working. Not here to spam a link — if you want to just *hear* what it sounds like, drop a 👋 or
> comment and I'll shoot you the demo number so you can call it yourself and judge."

Then DM everyone who comments/reacts with the warm Motion-1 DM.

**Motion 3 — Warm DM to a qualified owner you've interacted with** (never a cold blast; only after a
like/comment/mutual-group exchange):

> "Hey {{first_name}} — saw we're both in {{group_name}}, and noticed {{signal_detail}}. Not pitching you
> cold, promise — I just build a thing that solves the exact missed-call headache most {{trade}} owners
> have, and figured you might want to kick the tires. You can literally **call it and hear it**:
> (440) 644-2423. That's it — if it's not for you, no worries at all."

**FB follow-up (ONE, +4 days, only if the first DM was opened/left on read — never repeat-blast):**

> "No worries if it's not your thing, {{first_name}} — leaving the demo line here in case you're ever
> curious: (440) 644-2423. Have a good one 👍"

### 4c. LinkedIn — partner / referral sequence (for suppliers, associations, franchise networks, coaches)

These people don't buy one seat — they can send us **many** customers. Different frame: partnership, not
pitch.

**Connection note:**
> "Hi {{first_name}} — you work with a lot of {{trade}} owners through {{company}}. I built an AI
> receptionist that stops them losing jobs to voicemail, and I'm looking for a couple of partners whose
> members would genuinely benefit. Worth connecting?"

**DM #1 (after accept):**
> "Thanks {{first_name}}. Quick version: the owners you serve miss 25–40% of their calls, and it costs
> them real jobs every month. I built an AI that answers 24/7 + books the work, self-serve, from $99/mo
> with a free trial. I'd love to make your members look good — a referral arrangement, a group deal, or
> just a demo number they can call and hear for themselves ((440) 644-2423). Open to a quick back-and-forth
> here on what would actually be useful to your folks?"

**DM #2 (+5 days):**
> "Following up once, {{first_name}} — even the simplest version (I give your members a demo line + a
> founder deal, you look like the person who found it for them) tends to go over well. Happy to shape it
> however fits {{company}}. Want me to send the details you could forward?"

---

## 5. Objection / reply handling (bank — keep replies short & human)

| They say | You reply |
|---|---|
| "How much?" | "Starts at $99/mo, flat — and it's a **hard cap**, no surprise per-minute bills ever. There's a free 7-day trial so you can test it on your own line first: https://missednomorepro.com/signup. Want to hear it before anything? (440) 644-2423." |
| "Does it sound like a robot?" | "That's exactly why I don't try to describe it — just call (440) 644-2423 and talk to it like a customer. Takes a minute. Tell me if it passes." |
| "I already have an answering service / voicemail." | "Fair — quick difference: a service takes a *message*; this **books the job** into your calendar and **texts the caller back** in seconds so they don't dial the next guy. And it's 24/7 with no per-call fee. Worth a 60-sec listen to compare: (440) 644-2423." |
| "Not interested." | "All good, {{first_name}} — appreciate you saying so. Demo line's there if it ever comes up: (440) 644-2423. Good luck this season." |
| "Send me the info." | "You got it: https://missednomorepro.com/signup has everything + the free trial. But honestly the fastest read is calling it: (440) 644-2423. And heads up — first 10 shops get every paid add-on free for life, 10 slots left." |
| "Is there a card required for the trial?" | "Yep, card on file for the 7-day trial (with a ~30-min voice cap during the trial), so you can go fully live and hear it answer real calls as your shop. Cancel anytime before day 7." |

---

## 6. ToS & automation-risk callouts — READ THIS BEFORE ANYTHING

This is the part that saves the account. **Automated outreach tools are the fastest way to get banned,
and a banned personal profile can't be recovered — and it takes your whole pipeline with it.** We run
**manual + human-VA only.** No exceptions.

### The safe approach (what we DO)
- **Send everything by hand** (founder or a human VA logged into the real profile from a consistent
  device/IP). This is 100% within ToS and is what all the copy above is built for.
- **Stay well under the platform limits** so we never even approach a flag:
  - **LinkedIn:** ~**40–50 connection requests/week max** (LinkedIn's own weekly invite ceiling is around
    100–200 and they throttle aggressively; staying near half of it is safe). If the account is **new or
    dormant, warm it up** — start at 5–10 invites/day and ramp over 2–3 weeks. Personalize every note.
  - **Facebook:** no more than a handful of **warm** DMs/day, only to people you've genuinely interacted
    with; join **2–3 groups/week, not 20 in a day**; participate for a few days before you ever DM anyone.
- **Personalize + rotate copy** (that's why §4 has variants). Byte-identical mass messages are the clearest
  spam signal there is.
- **Value before ask** on Facebook — respect each group's promo rules; let people raise their hand.
- **Use tools only for the parts that are allowed:** building lists, tracking, and research (see below).

### Low-cost, low-risk tools that fit the $0–500 budget
| Tool | Cost | Use | Risk |
|---|---|---|---|
| **Facebook Ad Library** | Free | Find owners running ads (Tier-1 signal) | None — public data |
| **LinkedIn Sales Navigator** | ~$99/mo (cancel after sprint) | Filter & build prospect lists | Safe — *reading/filtering* is fine; never bolt automation onto it |
| **Google Sheets / Notion** | Free | Prospect tracker + cadence board (see §7d) | None |
| **Bitly** (free) | Free | One tracked link to measure trial clicks | None |
| **A human VA** (OnlineJobs.ph / Upwork) | ~$4–7/hr, ~$300–450/mo part-time | Runs the manual cadence & list-building from the SOP | Safe **if** it's a real human on the real account, sending personalized copy — *not* a bot |

**A human VA is our "automation."** It's ToS-safe, it's inside budget, and it's what "maximum automation,
minimal founder time" means here without risking the account.

### What we DO NOT do (bannable — do not touch, even "just to test")
- ❌ **No LinkedIn auto-tools:** Dux-Soup, LinkedIn Helper, Expandi, PhantomBuster, Meet Alfred, We-Connect,
  Waalaxy, Octopus, Zopto, and similar auto-connect/auto-DM/auto-scrape tools. All violate LinkedIn's User
  Agreement §8.2 (no bots/automation/scraping) and routinely get accounts restricted or permanently banned.
- ❌ **No Facebook/Messenger auto-DM or auto-post bots**, no auto-join-groups tools, no ManyChat-style
  blasting to people who never opted in (ManyChat is fine only for *your own page's* opted-in contacts —
  not cold outreach).
- ❌ **No fake, purchased, or multiple duplicate accounts**, and no "warming" services.
- ❌ **No scraping** contact data via automation against ToS.
- ❌ **No identical copy-paste at volume**, and **no links in first-touch** cold messages.
- ❌ **No link-dumping in groups** that ban promotion. You'll get removed and lose the channel.

---

## 7. Cadence — under ~30 min/day for one founder (or hand to a VA)

### 7a. Daily (Mon–Fri, ~25–30 min)
| Block | Time | What |
|---|---|---|
| **LinkedIn** | ~12 min | Send **8–10 personalized connection requests** from this week's list. Send any **due follow-ups** (Touches 3–5) to accepted connections. Reply to every DM. |
| **Facebook** | ~12 min | Scan 3–5 groups for **raised hands** (Tier-3) → answer 1–2 genuinely. Send **2–3 warm DMs** to people who engaged/self-identified. Reply to comments on your value posts. |
| **Log** | ~3 min | Update the tracker (§7d): who was contacted, what stage, any replies. |

### 7b. 2–3×/week (baked into the daily FB block)
- Post **1 value post** in a couple of the best groups (Motion 2, §4b). Rotate groups so you're not
  repetitive in any one place.

### 7c. Weekly list-build (one 60–90 min batch, ideal VA task)
- **LinkedIn:** build next week's list of **~50 prospects** in Sales Navigator (one trade at a time),
  drop into the tracker with a real `{{signal_detail}}` for each.
- **Facebook Ad Library sweep:** pull **20–30 owners running ads** (hot Tier-1), note their page/name.
- **Review-mining:** find **10–15 businesses** with "never answers / voicemail / no callback" reviews →
  best Facebook/LinkedIn targets.
- **Group hygiene:** join **1–2 new qualified groups**; leave any dead/spam ones.

### 7d. Weekly volume targets & the tracker

**Targets (safe volumes):** ~45 LinkedIn connects · ~15–20 genuine FB group interactions · ~12–15 warm
FB DMs · 2–3 value posts. That's the ceiling — quality over quantity always wins here.

**Tracker columns (Google Sheet, one row per prospect):**
`Name · Company · Trade · City · Channel · Signal (why them) · Signal detail · Status
(To-contact / Requested / Connected / DM1 / DM2 / DM3 / Replied / Called-demo / Trial-started / Won / Dead)
· Last touch date · Next touch date · Notes`

### 7e. Metrics that matter (review weekly — everything else is vanity)
| Metric | What it tells you | Rough target |
|---|---|---|
| LinkedIn accept rate | Is the connection note landing | 30–40%+ |
| Reply rate (of those messaged) | Message relevance | 12–25% (signal-based) |
| **Demo-call rate** | Our real leading indicator — did they *hear it* | as high as possible |
| Trial starts | Bottom of funnel | tie to the 20-customer goal |
| Positive-reply → trial | Where the funnel leaks | watch weekly |

If reply rate sags, the problem is almost always **weak signals** (you reached out with no real reason) —
fix targeting before you touch the copy. Change **one variable at a time** so you actually learn.

---

## 8. VA hand-off SOP (so a $5/hr human can run this ToS-safely)

1. **Log in as the real profile** (founder's), same device/browser each day. Never a bot, never a second
   fake account.
2. **Morning (LinkedIn, ~12 min):** open the tracker → send today's 8–10 connection requests using a
   §4a variant with the row's `{{tokens}}` filled → send any due follow-ups → reply to DMs → mark statuses.
3. **Midday (Facebook, ~12 min):** open the 5 assigned groups → find raised hands → answer genuinely
   (Motion 1, no link) → send warm DMs to yesterday's engagers → post the value post on scheduled days.
4. **Rules the VA must never break:** personalize every message (never paste identical text), never put a
   link in a first message, never use any automation tool/extension, stay under the daily caps, respect
   group promo rules, and **always end with the demo number or trial — never "book a call."**
5. **Escalate to the founder** only when someone replies with a real question the bank (§5) doesn't cover.
6. **Friday:** run the weekly list-build (§7c) and refill the tracker.

---

## 9. The through-line (every message obeys this)

- Reason to reach out is **real and specific** (a Tier-1/2/3 signal), or we don't send.
- Lead with **their** pain (missed calls = lost jobs), in plain trades language.
- **No first-touch link;** give the **demo number** — "call it and hear it" beats any pitch.
- Close on **self-serve**: hear the AI (`(440) 644-2423`) → start the free trial (`https://missednomorepro.com/signup`).
  **Never** "book a call with our team."
- Use the **Founder's Offer scarcity** (`10` of 10) once there's a live thread — never in a
  cold first touch.
- **Manual + human only.** No automation tools, ever. The account is the asset.
```
