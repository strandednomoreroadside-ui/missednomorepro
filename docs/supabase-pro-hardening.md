# Supabase Pro — security hardening checklist

Plain-English steps to do in the **Supabase dashboard** now that you're on Pro.
Most of this is clicking toggles; none of it changes how the app or your
customers' sign-in works. Do them top-to-bottom — they're ordered by payoff.

> **Already handled in code (you don't need to do anything):**
> - **Every database function is locked down.** All 23 of our security-sensitive
>   DB functions already pin an empty `search_path`, which is the #1 thing
>   Supabase's Security Advisor checks for. So that warning should not appear.
> - **Row-Level Security** is on every tenant table with explicit grants; our
>   automated leak test passes 48/48 (run `node scripts/leak-test.mjs` anytime).
> - **App security headers** (HSTS, anti-clickjacking, no MIME-sniffing,
>   referrer + permissions policy) were just added in `next.config.ts` and ship
>   on the next deploy.

---

## 1. Turn on Point-in-Time Recovery / backups  *(data safety — do first)*

Project → **Database → Backups**.
- Pro includes **daily backups** (kept ~7 days) automatically — confirm they're
  listed.
- For roll-back-to-any-second protection, enable **Point-in-Time Recovery
  (PITR)** (a small paid add-on). Recommended once you have paying customers.

## 2. Leaked-password protection  *(free win, 30 seconds)*

Project → **Authentication → Policies / Passwords** (the "Password security"
section).
- Turn ON **"Check passwords against HaveIBeenPwned"** — blocks customers from
  choosing a password that's known to be breached.
- Set **Minimum password length** to **10+** and require at least
  lower+upper+number (or "letters and digits"). This only affects new sign-ups;
  no existing customer is locked out.

## 3. Enforce SSL on database connections

Project → **Settings → Database → SSL Configuration**.
- Turn ON **"Enforce SSL on incoming connections."** Our app already talks to
  Supabase over HTTPS, so nothing breaks — this just blocks any plaintext
  attempt.

## 4. Network restrictions  *(lock the database's front door)*

Project → **Settings → Database → Network Restrictions**.
- Our app reaches Supabase through the **API** (HTTPS), not a direct database
  connection, and we don't run anything that connects directly to Postgres
  (`SUPABASE_DB_PASSWORD` is intentionally blank). So you can safely restrict
  **direct database connections** to just your own IP (for the rare manual
  query), leaving everything else to the API.
- ⚠️ Do **not** confuse this with the API — restricting the API would break the
  app. This setting is only about raw Postgres connections.

## 5. Run the Security Advisor + Performance Advisor  *(catch anything new)*

Project → **Advisors → Security Advisor** (and **Performance Advisor**).
- Click **Run / Refresh** and skim the list. Given the code-side notes above it
  should be clean or near-clean. If anything is flagged (e.g. a table missing
  RLS, an exposed view), send me the exact item name and I'll fix it in a
  migration — don't change schema by hand.

## 6. Set a spend cap  *(avoid surprise Supabase bills)*

Organization → **Billing → Cost Control / Spend Cap**.
- Turn the **spend cap ON** so usage can't silently blow past the plan. Matches
  our "no surprise bills" stance everywhere else.

## 7. Review auth rate limits  *(abuse protection)*

Project → **Authentication → Rate Limits**.
- Confirm sensible limits on sign-up, sign-in, OTP, and password-reset emails.
  The defaults are usually fine; just confirm sign-up isn't wide open.

---

## Deferred on purpose (tell me when you want them)

- **Two-factor sign-in (MFA/TOTP) for operators.** Adds a code-from-an-app step
  at login. Worth it for the admin/owner account; it's an app-code change, so
  it's a separate task when you want it (you chose to skip it for now).
- **Content-Security-Policy header.** The strongest anti-XSS header, but a strict
  CSP needs careful testing against Next.js + Sentry so it doesn't break the
  dashboard. Separate, tested change when you want maximum lock-down.
- **Captcha on sign-up/login.** Stops bot sign-ups but adds a step to the form;
  enable if you ever see spam sign-ups.

When you've done 1–7, re-run `node scripts/leak-test.mjs` once to confirm
tenant isolation still passes, and you're hardened.
