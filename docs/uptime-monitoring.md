# Uptime monitoring + readable crash reports

Two quick setups so you hear about problems before your customers do. Both are
**free** and take about 10 minutes total. The code is already deployed — these
are dashboard steps.

---

## 1. Uptime monitor  *(hear about an outage in ~1 minute)*

The app now answers a health check at:

```
https://missednomorepro.com/api/health
```

It returns `200 OK` when the app **and** the database are healthy, and `503`
if the database is unreachable — so a monitor pointed at it catches real
outages, not just "the page loads."

**Set up a free monitor (UptimeRobot example — BetterStack/Pingdom work the same):**

1. Make a free account at <https://uptimerobot.com>.
2. **Add New Monitor**:
   - Monitor Type: **HTTP(s)**
   - Friendly Name: `Missed No More Pro`
   - URL: `https://missednomorepro.com/api/health`
   - Monitoring Interval: **1 minute** (or 5 on the free plan)
3. Under **Alert Contacts**, add your email and/or phone so you get pinged if it
   goes down.
4. Save. That's it — you'll get an alert the moment the site or DB stops
   responding, and an "it's back" alert when it recovers.

Optional: turn on UptimeRobot's free **status page** to share live uptime with
customers.

> Tip: if you ever want to see it yourself, open the URL in a browser — you'll
> get a small JSON like `{"status":"ok","db":"ok","ms":42,...}`.

---

## 2. Readable crash reports (Sentry source maps)  *(optional, 2 minutes)*

Error tracking (Sentry) is already live. By default, production crash reports
show **minified** code, which is hard to read. Uploading "source maps" during
each deploy turns those into readable file names and line numbers.

The app is already configured to upload them — it just needs one secret:

1. In **Sentry** → Settings → **Auth Tokens**, create a token with the
   `project:releases` (and `org:read`) scopes. Copy it.
2. In **Vercel** → your project → **Settings → Environment Variables**, add:
   - Name: `SENTRY_AUTH_TOKEN`
   - Value: *(the token you copied)*
   - Environment: **Production** (Preview too if you like)
3. **Redeploy.** From then on, every deploy uploads source maps and your crash
   reports show real code.

If you skip this, nothing breaks — crashes are still captured, just harder to
read.
