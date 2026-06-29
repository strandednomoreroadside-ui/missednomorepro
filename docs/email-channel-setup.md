# Email channel — setup guide

The AI receptionist can answer **email** too, as a third channel of the
Omnichannel add-on (alongside website chat and two-way SMS). A customer emails
the business; their mail is forwarded to us; the AI replies from the business's
name; everything lands in the unified **Inbox** and the owner can take over any
thread.

This guide is the **one-time platform setup** (done once by you, the operator)
plus the **per-customer step** (each business turns it on + forwards their
inbox). The app code is already built and deployed.

---

## How it works (plain English)

1. A customer emails the business, e.g. `info@joesplumbing.com`.
2. The business has an auto-forward rule that sends a copy to a unique address
   we give them: `joesTOKEN@inbound.missednomorepro.com`.
3. Cloudflare catches mail to `inbound.missednomorepro.com` and hands it to a
   tiny **Email Worker**, which forwards the raw email to our app
   (`/api/email/inbound`).
4. Our app figures out which business it's for (from the token in the address —
   never from the email body), runs the same AI brain as voice/SMS/chat, and
   **emails the customer back** from the business's name. Replies route back
   through the same address, so it's a real back-and-forth.

We use the **`inbound.missednomorepro.com` subdomain** on purpose: your real
business mail (`support@missednomorepro.com`, on Zoho) lives on the root domain
and is **never touched** by any of this.

---

## Part A — one-time platform setup (you do this once)

### 1. Pick the inbound secret
Generate a random secret (this links Cloudflare → our app):

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Add it in **Vercel → Project → Settings → Environment Variables** (Production):

| Variable | Value |
|---|---|
| `EMAIL_INBOUND_SECRET` | the random string above |
| `EMAIL_INBOUND_DOMAIN` | `inbound.missednomorepro.com` |
| `EMAIL_REPLY_FROM` | `replies@missednomorepro.com` (any address on the verified domain) |

Redeploy after adding them.

> `EMAIL_REPLY_FROM` just needs to be on a Resend-verified sending domain. The
> root `missednomorepro.com` is already verified, so `replies@missednomorepro.com`
> works with no extra DNS.

### 2. Apply the migration
Paste `supabase/migrations/20260704090000_email_channel.sql` into the Supabase
SQL editor and run it (same flow as every other migration). It adds the email
columns and back-fills a forward token for every business.

### 3. Set up Cloudflare to receive the subdomain mail

You're already on Cloudflare for DNS, so this stays free.

1. **Deploy the Worker** (from this repo):
   ```bash
   cd cloudflare
   npx wrangler deploy
   npx wrangler secret put MNM_INBOUND_SECRET   # paste the EMAIL_INBOUND_SECRET from step 1
   ```
2. In the Cloudflare dashboard → **Email → Email Routing**:
   - Enable Email Routing for `missednomorepro.com` if it isn't already.
     ⚠️ **Do not let it change the *root* MX records** — those belong to Zoho
     (`mx.zoho.com`) and run `support@`. We only want the **subdomain**.
   - Add the route for the subdomain catch-all
     `*@inbound.missednomorepro.com` → **send to the Worker** `mnm-email-inbound`.

   > Cloudflare's catch-all UI is oriented around the root domain. If the
   > dashboard won't let you add a subdomain catch-all directly, add the
   > subdomain MX records manually (DNS tab):
   > `inbound  MX  10  route1.mx.cloudflare.net`,
   > `inbound  MX  20  route2.mx.cloudflare.net`,
   > `inbound  MX  30  route3.mx.cloudflare.net`,
   > plus the SPF TXT Cloudflare shows, then point the Worker at it. **This is
   > the one step to verify hands-on — ping me and I'll walk it with you.**

3. **Test it:** send any email to `test@inbound.missednomorepro.com`. Check the
   Worker's logs (Cloudflare → Workers → mnm-email-inbound → Logs) — you should
   see a `200` from our app.

---

## Part B — per customer (the owner does this, in-app)

1. **Billing:** the Omnichannel AI Chat add-on (+$29/mo) must be on.
2. **Settings → AI Email:** flip *Answer emails with AI* on. The page shows
   their unique **forward-to address** (`…@inbound.missednomorepro.com`) and an
   optional signature.
3. **In their email account** (Gmail, Outlook, Zoho, etc.) they set up
   **auto-forwarding** from their business inbox to that address.
   - Gmail: Settings → Forwarding and POP/IMAP → Add a forwarding address →
     paste it → confirm → "Forward a copy of incoming mail to…".
   - Most providers also let them forward only mail matching a filter.

That's it. New customer emails now get answered, show up in the **Inbox**, and
the owner can hit *Take over* on any thread to reply by hand.

---

## Safety + cost notes

- **Spam / loops:** the app ignores newsletters, mailing lists, out-of-office
  and other auto-replies, no-reply senders, and its own mail looping back — so
  the AI only answers real people. (Guards live in `src/lib/email/inbound.ts`.)
- **§5.1 holds:** email uses the exact same tool brain as voice — it never
  invents a price (quotes are still computed) or books outside the rules.
- **Identity:** replies are DKIM-signed from `missednomorepro.com` but show the
  **business's name**; the Reply-To is the business's inbound address so replies
  come back to us. (Fully-branded "from your own domain" is a later upgrade.)
- **Cost:** $0 — Cloudflare Email Routing/Workers are free, and outbound replies
  ride the existing Resend account.
- **Idempotent:** every inbound is de-duplicated on its Message-ID, so a retry
  never double-replies.
