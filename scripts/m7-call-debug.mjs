// Pull the exact reason the last AI call dropped, straight from Retell.
// Run: node scripts/m7-call-debug.mjs
import process from "node:process";
import { createClient } from "@supabase/supabase-js";
import Retell from "retell-sdk";

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
const retell = new Retell({ apiKey: process.env.RETELL_API_KEY });

console.log("\n=== Agents (provisioned in Retell?) ===");
const ag = await db
  .from("agents")
  .select("status, voice_id, provider_agent_id, provider_llm_id, last_synced_at")
  .order("created_at", { ascending: false });
for (const a of ag.data ?? []) {
  console.log(
    `  status=${a.status} voice=${a.voice_id} agent=${a.provider_agent_id} llm=${a.provider_llm_id} synced=${a.last_synced_at}`
  );
}

console.log("\n=== Recent calls (our DB) ===");
const calls = await db
  .from("calls")
  .select("provider, provider_call_id, ai_handled, status, disposition, from_number, started_at")
  .order("started_at", { ascending: false })
  .limit(6);
for (const c of calls.data ?? []) {
  console.log(
    `  ${new Date(c.started_at).toLocaleString()}  provider=${c.provider}  ai=${c.ai_handled}  status=${c.status}  retellId=${c.provider_call_id}`
  );
}

const latest = (calls.data ?? []).find((c) => c.provider === "retell");
if (!latest) {
  console.log("\nNo Retell call row yet — the AI path didn't register a call.");
  process.exit(0);
}

console.log(`\n=== Retell's record for call ${latest.provider_call_id} ===`);
try {
  const rc = await retell.call.retrieve(latest.provider_call_id);
  console.log(`  call_status:          ${rc.call_status}`);
  console.log(`  disconnection_reason: ${rc.disconnection_reason ?? "(none)"}`);
  console.log(`  agent_id:             ${rc.agent_id}`);
  console.log(`  duration_ms:          ${rc.duration_ms ?? "(none)"}`);
  console.log(`  start/end:            ${rc.start_timestamp ?? "-"} / ${rc.end_timestamp ?? "-"}`);
  console.log(`  transcript:           ${rc.transcript ? JSON.stringify(rc.transcript.slice(0, 200)) : "(none)"}`);
} catch (e) {
  console.log(`  Retrieve failed: ${e?.message ?? e}`);
}

console.log("\n=== Retell agent detail (voice check) ===");
const agentId = (ag.data ?? []).find((a) => a.provider_agent_id)?.provider_agent_id;
if (agentId) {
  try {
    const a = await retell.agent.retrieve(agentId);
    console.log(`  voice_id: ${a.voice_id}  language: ${a.language}  webhook_url: ${a.webhook_url}`);
  } catch (e) {
    console.log(`  agent retrieve failed: ${e?.message ?? e}`);
  }
}
console.log("");
