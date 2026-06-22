// Read-only pre-launch readiness probe. Verifies that every later-phase
// migration's columns/tables actually exist in prod (the "silently broken
// feature because a migration was never applied" risk), checks the re-tiered
// plan rows, and reports which integration env vars are present locally.
// Run: node scripts/prelaunch-check.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let fails = 0;
const ok = (label, good, detail = "") => {
  console.log(`${good ? "ok  " : "MISS"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!good) fails++;
};

// (table, columns, which migration added them)
const COLS = [
  ["service_pricing", "free_miles", "tow_free_miles"],
  ["sms_settings", "reminder_enabled, reminder_lead_hours, reminder_template", "reminders"],
  ["appointments", "reminder_sent_at", "reminders"],
  ["sms_settings", "web_chat_enabled, widget_key, two_way_sms_ai_enabled, web_greeting", "omnichannel_chat"],
  ["appointments", "assigned_to", "dispatch_team"],
  ["jobs", "assigned_to", "dispatch_team"],
  ["sms_settings", "reputation_enabled, review_request_template, review_facebook_url", "addons_suite"],
  ["businesses", "gbp_url", "addons_suite"],
  ["businesses", "ai_enabled, forward_number", "m10_hardening"],
  ["plan_limits", "overage_per_minute_cents, overage_per_sms_cents", "plan_retier"],
];
console.log("── migration columns ─────────────────────────");
for (const [table, cols, mig] of COLS) {
  const { error } = await admin.from(table).select(cols).limit(1);
  ok(`${table}.{${cols}}  [${mig}]`, !error, error?.message);
}

console.log("\n── phase tables ──────────────────────────────");
const TABLES = [
  ["tenant_addons", "addons"],
  ["conversations", "omnichannel_chat"],
  ["conversation_messages", "omnichannel_chat"],
  ["payments", "payments"],
  ["reviews", "addons_suite"],
  ["insight_reports", "addons_suite"],
  ["media_attachments", "mms_media"],
  ["invitations", "dispatch_team"],
  ["automations", "outbound_engine"],
  ["outbound_queue", "outbound_engine"],
  ["knowledge_documents", "knowledge_documents"],
  ["knowledge_suggestions", "knowledge_documents"],
];
for (const [table, mig] of TABLES) {
  const { error } = await admin.from(table).select("*").limit(1);
  ok(`${table}  [${mig}]`, !error, error?.message);
}

console.log("\n── re-tiered plan rows (plan_retier) ─────────");
{
  const { data, error } = await admin.from("plan_limits").select("plan, monthly_minutes");
  if (error) ok("plan_limits readable", false, error.message);
  else {
    const have = new Set((data ?? []).map((r) => r.plan));
    for (const p of ["starter", "growth", "professional", "elite", "enterprise"]) {
      ok(`plan '${p}' seeded`, have.has(p));
    }
  }
}

console.log("\n── local env (proxy for Vercel; confirm in Vercel too) ──");
const NEED = [
  "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET", "TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "OPENAI_API_KEY",
  "RETELL_API_KEY", "INTERNAL_API_SECRET", "TRANSCRIPT_ENCRYPTION_KEY",
  "GOOGLE_OAUTH_CREDENTIALS", "GOOGLE_MAPS_API_KEY", "RESEND_API_KEY", "RESEND_FROM",
  "CRON_SECRET", "ADMIN_EMAILS",
];
for (const k of NEED) console.log(`${env[k] ? "set " : "----"}  ${k}`);
const stripeMode = (env.STRIPE_SECRET_KEY || "").startsWith("sk_live") ? "LIVE" : "TEST";
console.log(`\nStripe key mode (local): ${stripeMode}`);

console.log(fails ? `\n${fails} MISSING — investigate before launch.` : "\nAll schema checks passed.");
process.exit(fails ? 1 : 0);
