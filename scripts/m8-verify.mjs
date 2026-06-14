// Verify the M8 data side: messages logged + suppression list.
// Run: node scripts/m8-verify.mjs
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

console.log("\n========== MESSAGES (newest first) ==========");
const msgs = await db
  .from("messages")
  .select("direction, kind, status, from_number, to_number, body_redacted, created_at")
  .order("created_at", { ascending: false })
  .limit(25);
if (msgs.error) {
  console.log("  ERROR:", msgs.error.message, "(migration applied?)");
} else if (!msgs.data.length) {
  console.log("  (no messages logged yet)");
} else {
  for (const m of msgs.data) {
    const who = m.direction === "inbound" ? `from ${m.from_number}` : `to ${m.to_number}`;
    const body = (m.body_redacted ?? "").slice(0, 60).replace(/\n/g, " ");
    console.log(
      `  ${new Date(m.created_at).toLocaleTimeString()}  ${m.direction.padEnd(8)} ${String(m.kind).padEnd(12)} ${String(m.status).padEnd(9)} ${who}  "${body}"`
    );
  }
  const byKind = {};
  const byDir = {};
  for (const m of msgs.data) {
    byKind[m.kind] = (byKind[m.kind] ?? 0) + 1;
    byDir[m.direction] = (byDir[m.direction] ?? 0) + 1;
  }
  console.log(`\n  direction: ${JSON.stringify(byDir)}`);
  console.log(`  kinds: ${JSON.stringify(byKind)}`);
}

console.log("\n========== SMS SUPPRESSIONS (STOP list) ==========");
const supp = await db
  .from("sms_suppressions")
  .select("phone, reason, created_at")
  .order("created_at", { ascending: false });
if (supp.error) console.log("  ERROR:", supp.error.message);
else if (!supp.data.length) console.log("  (empty — no STOP recorded on our side)");
else for (const s of supp.data) console.log(`  ${s.phone}  (${s.reason})  ${new Date(s.created_at).toLocaleString()}`);
console.log("");
