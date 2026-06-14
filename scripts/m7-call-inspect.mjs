// Inspect recent AI calls: transcript, tool calls, and contact matching.
// Run: node scripts/m7-call-inspect.mjs
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

const calls = await db
  .from("calls")
  .select("id, ai_handled, status, disposition, contact_id, from_number, started_at")
  .eq("provider", "retell")
  .order("started_at", { ascending: false })
  .limit(4);

for (const c of (calls.data ?? []).reverse()) {
  console.log("\n────────────────────────────────────────────────────");
  console.log(
    `Call ${new Date(c.started_at).toLocaleString()}  from=${c.from_number}  status=${c.status}  disp=${c.disposition ?? "—"}  contact_id=${c.contact_id ?? "NULL"}`
  );

  const t = await db
    .from("call_transcripts")
    .select("summary, redacted_text")
    .eq("call_id", c.id)
    .maybeSingle();
  if (t.data?.summary) console.log(`  summary: ${t.data.summary}`);
  if (t.data?.redacted_text)
    console.log(`  transcript:\n${t.data.redacted_text.slice(0, 700).replace(/^/gm, "    ")}`);

  const tc = await db
    .from("tool_calls")
    .select("tool_name, status, result, created_at")
    .eq("call_id", c.id)
    .order("created_at", { ascending: true });
  if ((tc.data ?? []).length) {
    console.log("  tools:");
    for (const x of tc.data) console.log(`    • ${x.tool_name} [${x.status}] → ${JSON.stringify(x.result)}`);
  } else {
    console.log("  tools: (none called)");
  }
}

// Does a contact exist for the most recent caller's number?
const fromNum = calls.data?.[0]?.from_number;
if (fromNum) {
  const ct = await db
    .from("contacts")
    .select("id, name, phone, created_at")
    .eq("phone", fromNum);
  console.log(`\n=== Contacts matching ${fromNum} ===`);
  for (const c of ct.data ?? [])
    console.log(`  • ${c.name}  ${c.phone}  (created ${new Date(c.created_at).toLocaleString()})`);
  if (!(ct.data ?? []).length) console.log("  (none — nothing for lookup_contact to find)");
}
console.log("");
