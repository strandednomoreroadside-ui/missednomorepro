# Google OAuth verification — operator walkthrough

**Goal:** get the Google sign-in your customers see when they connect their
calendar to (1) stop the scary **"Google hasn't verified this app"** screen and
(2) stop calendars **silently disconnecting after 7 days**.

**Good news:** the app only uses **sensitive** Calendar scopes, not *restricted*
ones — so you do **NOT** need the expensive third-party security assessment
(that's only for Gmail/Drive-type scopes). This is the lighter review.

There are **two separate things**, and you can do the first one in 10 minutes
today:

| Step | Fixes | Effort | When it takes effect |
|---|---|---|---|
| **A. Publish to Production** | The 7-day silent disconnect | ~10 min | Immediately |
| **B. Submit for verification** | The "unverified app" warning screen | ~30 min + a demo video | Days–weeks (Google reviews) |

> **Do Step A now even if you're not ready for B.** Publishing alone stops the
> 7-day refresh-token expiry, which is the part that actually breaks customers'
> bookings. The warning screen (fixed by B) is cosmetic — users can still click
> through "Advanced → Go to Missed No More Pro."

---

## Before you start — what you'll need

- The Google account that owns the Cloud project `missed-no-more-pro`.
- These URLs (already live on your site):
  - Homepage: `https://missednomorepro.com`
  - Privacy policy: `https://missednomorepro.com/privacy`
  - Terms of service: `https://missednomorepro.com/terms`
- Support email: `support@missednomorepro.com`
- A square logo PNG (120×120 px recommended) — optional but it makes the
  consent screen look legit and speeds up review. Your brand logo works.

---

## Step A — Publish the app to Production (fixes the 7-day disconnect)

1. Go to **console.cloud.google.com** and make sure the project picker (top
   left) shows **missed-no-more-pro**.
2. Left menu → **APIs & Services → OAuth consent screen**
   *(newer console calls this **Google Auth Platform → Audience**).*
3. Fill in / confirm **Branding**:
   - **App name:** `Missed No More Pro`
   - **User support email:** pick **`strandednomorecle@gmail.com`** from the
     dropdown. ⚠️ This field is a **dropdown limited to the Google account(s)
     that own the project** (or a Google Group you manage) — it will **not**
     accept a typed address like `support@missednomorepro.com` (that's a Zoho
     mailbox, not a Google account). Using your Gmail here is fine; it's only the
     contact Google shows for the app and has no effect on approval.
   - **App logo:** upload your square PNG (optional but recommended)
   - **Application home page:** `https://missednomorepro.com`
   - **Application privacy policy link:** `https://missednomorepro.com/privacy`
   - **Application terms of service link:** `https://missednomorepro.com/terms`
   - **Authorized domains:** add `missednomorepro.com`
   - **Developer contact information:** this field *is* free-text — put
     `support@missednomorepro.com` (and/or your own email) here.
   - Save.
4. Find **Publishing status** (it currently says **"Testing"**). Click
   **PUBLISH APP** → confirm **"Push to production."**
5. That's it for Step A. Refresh tokens no longer expire after 7 days, so a
   customer who connects their calendar stays connected.

> Until Step B is approved, new users will still see the "unverified app"
> warning and must click **Advanced → Go to Missed No More Pro (unsafe)** to
> continue. That's expected and safe — it's your own app.

---

## Step B — Submit for verification (removes the warning screen)

After publishing, the console shows a **"Prepare for verification"** /
**"Submit for verification"** prompt. Click it and complete the form:

### B1. Confirm your scopes and justify them

The app requests these (the reviewer will see them):

| Scope | Why we need it (you can paste this) |
|---|---|
| `.../auth/calendar.events` | "Create, update, and cancel appointment events on the business owner's Google Calendar when our AI receptionist books or reschedules a job for them." |
| `.../auth/calendar.readonly` | "Read the owner's calendar busy/free times so the AI only offers genuinely open appointment slots and never double-books." |
| `openid`, `email` | "Identify which Google account the owner connected, shown back to them in settings." |

### B2. Record a short demo video (the part most people get stuck on)

Google requires a screen recording (upload to YouTube, can be **Unlisted**) that
shows **all** of:

1. The browser URL bar showing **`missednomorepro.com`** (proves you own the
   domain that's asking for access).
2. A user clicking **Connect Google Calendar** in **Settings → Calendar booking**.
3. The **Google consent screen** appearing, clearly showing the app name
   **Missed No More Pro** and the calendar permissions being requested.
4. After approving, the app using it — e.g. a booking creating a real calendar
   event (you can narrate: "the AI checks free/busy and writes the appointment").

Keep it 1–3 minutes. No editing needed. Paste the YouTube link into the form.

### B3. Submit

- Confirm the privacy-policy URL is reachable and explains that you use Google
  Calendar data only to manage the user's bookings (your `/privacy` page should
  say this — see the note below).
- Submit. Google emails you a case number; reviews typically take a few days to
  a few weeks. They may reply asking for clarification — answer promptly and it
  moves fast.

---

## One thing to check on your privacy page

Google's reviewers look for a line that describes **how you use Google user
data**. Make sure `/privacy` says something like:

> "When you connect Google Calendar, we access your calendar's busy/free times
> and create or update appointment events solely to schedule and manage your
> bookings. We do not sell this data or use it for advertising, and our use
> complies with the Google API Services User Data Policy, including the Limited
> Use requirements."

(If it's not there yet, tell me and I'll add it to the privacy page — it's a
small edit and it's a verification requirement.)

---

## TL;DR

1. **Today:** APIs & Services → OAuth consent screen → fill branding →
   **Publish app**. Disconnect-after-7-days is fixed.
2. **This week:** click **Submit for verification**, justify the 2 calendar
   scopes, upload a 1–3 min demo video, submit. Warning screen goes away once
   approved.
3. Customers' calendars stay connected the whole time.
