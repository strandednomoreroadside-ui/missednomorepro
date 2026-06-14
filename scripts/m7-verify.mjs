// Verify the data side of the 10-call test: dispositions, transcripts,
// follow-up tasks, consent, and usage metering. Run: node scripts/m7-verify.mjs
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set */
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log("\n========== AI CALLS (newest first) ==========");
const calls = await db
  .from("calls")
  .select("id, status, disposition, duration_seconds, ai_handled, contact_id, from_number, started_at")
  .eq("provider", "retell")
  .order("started_at", { ascending: false })
  .limit(15);
let withTranscript = 0;
const dispCount = {};
for (const c of calls.data ?? []) {
  const t = await db.from("call_transcripts").select("summary").eq("call_id", c.id).maybeSingle();
  if (t.data?.summary) withTranscript++;
  dispCount[c.disposition ?? "—"] = (dispCount[c.disposition ?? "—"] ?? 0) + 1;
  console.log(
    `  ${new Date(c.started_at).toLocaleTimeString()}  ${String(c.disposition ?? "—").padEnd(11)}  ${String(c.status).padEnd(11)}  ${String(c.duration_seconds ?? "—").padStart(3)}s  summary=${t.data?.summary ? "yes" : "NO"}  from=${c.from_number}`
  );
}
console.log(`\n  disposition spread: ${JSON.stringify(dispCount)}`);
console.log(`  calls with a stored summary/transcript: ${withTranscript}/${(calls.data ?? []).length}`);

console.log("\n========== FOLLOW-UP TASKS ==========");
const tasks = await db
  .from("follow_up_tasks")
  .select("type, title, priority, status, created_at")
  .order("created_at", { ascending: false })
  .limit(15);
for (const t of tasks.data ?? [])
  console.log(`  [${t.type}] (${t.priority}/${t.status}) ${t.title}`);
if (!(tasks.data ?? []).length) console.log("  (none)");

console.log("\n========== CONTACTS + SMS CONSENT ==========");
const contacts = await db
  .from("contacts")
  .select("name, phone, consent_sms, consent_source")
  .order("created_at", { ascending: false })
  .limit(8);
for (const c of contacts.data ?? [])
  console.log(`  ${String(c.name).padEnd(14)} ${c.phone}  consent_sms=${c.consent_sms}  (${c.consent_source ?? "—"})`);

console.log("\n========== USAGE METERING (voice_minutes) ==========");
const usage = await db
  .from("usage_events")
  .select("quantity, unit, provider, created_at")
  .eq("event_type", "voice_minutes")
  .order("created_at", { ascending: false })
  .limit(20);
const totalMin = (usage.data ?? []).reduce((s, u) => s + Number(u.quantity), 0);
console.log(`  ${(usage.data ?? []).length} events, ${totalMin} total minutes metered`);

console.log("\n========== AI TOOL USAGE (counts) ==========");
const tc = await db.from("tool_calls").select("tool_name, status");
const toolCount = {};
for (const x of tc.data ?? []) {
  const k = `${x.tool_name}${x.status === "ok" ? "" : ":" + x.status}`;
  toolCount[k] = (toolCount[k] ?? 0) + 1;
}
console.log(`  ${JSON.stringify(toolCount, null, 0)}`);
console.log("");
