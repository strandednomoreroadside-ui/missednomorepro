// Verify the M10 integrations that live as secrets: Resend (email) + the
// Vercel Cron secret. Reads .env.local, so add the SAME values you put in
// Vercel to .env.local first (it's git-ignored). Run:
//   node scripts/verify-integrations.mjs            (sends a test email to the
//                                                     project's admin address)
//   node scripts/verify-integrations.mjs you@x.com  (override the recipient)
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be present */
}

// The cron secret lives in PRODUCTION (Vercel), so the cron test must hit the
// deployed app — NOT NEXT_PUBLIC_APP_URL, which is localhost in .env.local.
const PROD_URL = (process.env.PROD_URL || "https://missednomorepro.com").replace(/\/$/, "");
const recipient =
  process.argv[2] ||
  (process.env.ADMIN_EMAILS || "").split(",")[0].trim() ||
  null;

let fails = 0;
const pass = (m) => console.log(`✅ ${m}`);
const fail = (m) => {
  console.log(`❌ ${m}`);
  fails++;
};

// ── 1. Resend: key valid? sending domain verified? test send? ──────
console.log("── Resend (email) ───────────────────────────");
const RESEND_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM;
if (!RESEND_KEY) {
  fail("RESEND_API_KEY not in .env.local — add it (same value as Vercel) to test.");
} else {
  console.log(`key ${RESEND_KEY.slice(0, 4)}…${RESEND_KEY.slice(-4)} · from: ${RESEND_FROM || "(unset → onboarding@resend.dev)"}`);
  // 1a. Validate the key + list verified domains.
  const dRes = await fetch("https://api.resend.com/domains", {
    headers: { Authorization: `Bearer ${RESEND_KEY}` },
  });
  const dJson = await dRes.json().catch(() => ({}));
  if (dRes.status === 401) {
    console.log("   ℹ️  Key can't list domains (401) — likely a 'Sending access' key. Fine for the app; the send test below is the real check.");
  } else if (!dRes.ok) {
    fail(`Resend /domains failed: HTTP ${dRes.status} ${dJson?.message ?? ""}`);
  } else {
    pass("Resend key is valid.");
    const domains = dJson.data ?? [];
    for (const d of domains) {
      const good = d.status === "verified";
      console.log(`   ${good ? "✅" : "⚠️ "} domain ${d.name} — ${d.status}`);
    }
    // Cross-check the FROM domain is among the verified ones.
    const fromDomain = (RESEND_FROM || "").match(/@([^>\s]+)/)?.[1]?.toLowerCase();
    if (fromDomain) {
      const v = domains.find((d) => d.name?.toLowerCase() === fromDomain && d.status === "verified");
      if (v) pass(`RESEND_FROM domain (${fromDomain}) is verified.`);
      else fail(`RESEND_FROM domain (${fromDomain}) is NOT verified — emails will be rejected.`);
    }
  }
  // 1b. Real end-to-end test send (to the operator's own inbox).
  if (recipient) {
    const sRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: RESEND_FROM || "Missed No More Pro <onboarding@resend.dev>",
        to: [recipient],
        subject: "Missed No More Pro — email test ✅",
        html: "<p>This is a test from <strong>verify-integrations.mjs</strong>. If you got this, Resend is wired correctly.</p>",
      }),
    });
    const sJson = await sRes.json().catch(() => ({}));
    if (sRes.ok && sJson.id) pass(`Test email sent to ${recipient} (id ${sJson.id}) — check the inbox.`);
    else {
      fail(`Test email failed: HTTP ${sRes.status} ${sJson?.message ?? sJson?.name ?? ""}`);
      if (sRes.status === 403) {
        console.log("   → Verify the sending domain in Resend: dashboard → Domains → add missednomorepro.com →");
        console.log("     add the DNS records it shows at your registrar → wait for 'Verified'. Sends are blocked until then.");
      }
    }
  } else {
    console.log("   ⏭  No recipient (set ADMIN_EMAILS or pass an address) — skipped test send.");
  }
}

// ── 2. Cron secret: does the deployed endpoint accept it? ──────────
console.log("\n── Vercel Cron secret ───────────────────────");
const CRON = process.env.CRON_SECRET;
if (!CRON) {
  fail("CRON_SECRET not in .env.local — add it (same value as Vercel) to test.");
} else {
  console.log(`secret ${CRON.slice(0, 3)}…${CRON.slice(-3)} · target ${PROD_URL}`);
  // 2a. No-auth must be rejected.
  const noAuth = await fetch(`${PROD_URL}/api/cron/reminders`);
  noAuth.status === 401 ? pass("Endpoint rejects unauthenticated calls (401).") : fail(`Expected 401 unauth, got ${noAuth.status}.`);

  // 2b. Safe live test: only trigger when nothing is due (clean no-op), so we
  // never fire a real reminder text just to test auth.
  let dueCount = null;
  try {
    const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const horizon = new Date(Date.now() + 8 * 24 * 3600_000).toISOString();
    const { count } = await admin
      .from("appointments")
      .select("id", { count: "exact", head: true })
      .eq("status", "confirmed")
      .is("reminder_sent_at", null)
      .gt("starts_at", new Date().toISOString())
      .lte("starts_at", horizon);
    dueCount = count ?? 0;
  } catch (e) {
    console.log(`   (couldn't pre-count due reminders: ${e.message})`);
  }

  if (dueCount === 0) {
    const authed = await fetch(`${PROD_URL}/api/cron/reminders`, {
      headers: { Authorization: `Bearer ${CRON}` },
    });
    const body = await authed.json().catch(() => ({}));
    if (authed.status === 200) pass(`Correct secret accepted (200) — Vercel secret matches. Result: ${JSON.stringify(body)}`);
    else fail(`Correct secret rejected (${authed.status}) — value in .env.local ≠ Vercel? ${JSON.stringify(body)}`);
  } else {
    console.log(`   ⏭  ${dueCount} reminder(s) currently due — skipping the live trigger so we don't send real texts.`);
    console.log("      The 401 checks above + a matching value in Vercel mean the daily cron will authenticate.");
    console.log("      (Vercel → your project → Cron Jobs shows each run's status to confirm.)");
  }
}

console.log(fails ? `\n❌ ${fails} check(s) failed — see above.` : "\n✅ All integration checks passed.");
process.exit(fails ? 1 : 0);
