// Verifies the M3 billing loop end-to-end after a test checkout:
// plan_limits seeded, webhook events recorded, subscription synced,
// org plan flipped, audit logged. Run: node scripts/billing-check.mjs
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

const { data: limits } = await admin.from("plan_limits").select("plan").order("plan");
console.log(`plan_limits seeded: ${limits?.length ?? 0} plans (${(limits ?? []).map((l) => l.plan).join(", ")})`);

const { data: events } = await admin
  .from("stripe_webhook_events")
  .select("id, type, processed_at")
  .order("processed_at", { ascending: false })
  .limit(10);
console.log(`\nwebhook events recorded: ${events?.length ?? 0}`);
for (const e of events ?? []) console.log(`  ${e.type}  (${e.id})`);

const { data: subs } = await admin
  .from("subscriptions")
  .select("tenant_id, plan, billing_interval, status, current_period_end, stripe_customer_id, stripe_subscription_id");
console.log(`\nsubscriptions: ${subs?.length ?? 0}`);
for (const s of subs ?? [])
  console.log(
    `  plan=${s.plan} (${s.billing_interval ?? "?"}) status=${s.status} renews=${s.current_period_end?.slice(0, 10)} customer=${s.stripe_customer_id ? "yes" : "no"} sub=${s.stripe_subscription_id ? "yes" : "no"}`
  );

const { data: orgs } = await admin.from("organizations").select("name, plan, billing_customer_id");
console.log(`\norganizations:`);
for (const o of orgs ?? [])
  console.log(`  "${o.name}" plan=${o.plan} billing_customer=${o.billing_customer_id ? "linked" : "none"}`);

const { data: audits } = await admin
  .from("audit_logs")
  .select("action, created_at")
  .like("action", "billing.%")
  .order("created_at", { ascending: false })
  .limit(5);
console.log(`\nbilling audit entries: ${audits?.length ?? 0}`);
for (const a of audits ?? []) console.log(`  ${a.action}  ${a.created_at}`);
