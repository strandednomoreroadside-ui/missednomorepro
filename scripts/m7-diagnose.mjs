// M7 readiness probe — read-only checks against the (prod) Supabase the
// Twilio webhook uses. Tells us which precondition makes the AI path fall
// back to the M6 greeting. Run: node scripts/m7-diagnose.mjs
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set */
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });
const NUMBER = "+14406442423";
const ok = (b, label, extra = "") =>
  console.log(`${b ? "✓" : "✗"} ${label}${extra ? "  —  " + extra : ""}`);

console.log("\n=== M7 readiness probe (against your live database) ===\n");

// 1) Migration applied?
const fut = await db.from("follow_up_tasks").select("id").limit(1);
const migApplied = !(fut.error && /does not exist|schema cache/i.test(fut.error.message));
ok(migApplied, "M7 migration applied (follow_up_tasks table exists)", migApplied ? "" : fut.error?.message ?? "");

const callCols = await db.from("calls").select("id, business_id, ai_handled").limit(1);
ok(!callCols.error, "calls table has M7 columns", callCols.error?.message ?? "");

const agentCols = await db.from("agents").select("id, provider_agent_id").limit(1);
const agentColsOk = !agentCols.error;
ok(agentColsOk, "agents table has M7 columns", agentCols.error?.message ?? "");

// 2) A live business?
const biz = await db
  .from("businesses")
  .select("id, name, status")
  .order("created_at", { ascending: true });
if (biz.error) ok(false, "businesses query", biz.error.message);
else {
  console.log(`\n  Businesses (${biz.data.length}):`);
  for (const b of biz.data) console.log(`    • ${b.name}  —  status=${b.status}`);
  const live = biz.data.filter((b) => b.status === "live");
  ok(live.length > 0, "At least one business is LIVE", live.length ? live.map((b) => b.name).join(", ") : "none launched yet");
}

// 3) Number assigned to a business?
const num = await db
  .from("phone_numbers")
  .select("phone_number, business_id, voice_enabled")
  .eq("phone_number", NUMBER)
  .maybeSingle();
if (num.error) ok(false, "phone_numbers query", num.error.message);
else if (!num.data) ok(false, `Number ${NUMBER} present`, "not found");
else {
  ok(true, `Number ${NUMBER} present`, `voice_enabled=${num.data.voice_enabled}`);
  ok(!!num.data.business_id, "Number assigned to a business", num.data.business_id ? "" : "business_id is NULL");
}

// 4) Agent provisioned yet? (only meaningful once columns exist)
if (agentColsOk) {
  const ag = await db.from("agents").select("id").not("provider_agent_id", "is", null);
  ok((ag.data?.length ?? 0) > 0, "A Retell agent has been provisioned", ag.data?.length ? `${ag.data.length}` : "none yet (auto-provisions on the first AI call)");
}

// 5) Recent calls — which path handled them?
const cols = callCols.error ? "provider, status, from_number, disposition, started_at" : "provider, ai_handled, status, from_number, disposition, started_at";
const calls = await db.from("calls").select(cols).order("started_at", { ascending: false }).limit(5);
if (!calls.error) {
  console.log(`\n  Last ${calls.data.length} call(s):`);
  for (const c of calls.data) {
    console.log(
      `    • ${new Date(c.started_at).toLocaleString()}  provider=${c.provider}  ai=${c.ai_handled ?? "—"}  status=${c.status}  disp=${c.disposition ?? "—"}  from=${c.from_number}`
    );
  }
}
console.log("");
