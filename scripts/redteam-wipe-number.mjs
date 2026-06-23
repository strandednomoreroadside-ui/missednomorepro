// Wipe one phone number's footprint from the LIVE tenant so it red-teams as a
// brand-new caller. Dry-run by default.
//   node scripts/redteam-wipe-number.mjs 2164151568
//   node scripts/redteam-wipe-number.mjs 2164151568 --confirm
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch { /* env may be set */ }

const args = process.argv.slice(2);
const CONFIRM = args.includes("--confirm");
const raw = args.find((a) => !a.startsWith("--"));
if (!raw) { console.error("Usage: node scripts/redteam-wipe-number.mjs <phone> [--confirm]"); process.exit(1); }
const digits = raw.replace(/\D/g, "");
const phone = digits.length === 11 && digits.startsWith("1") ? `+${digits}` : `+1${digits}`;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: live, error: bizErr } = await db
  .from("businesses").select("id, name, tenant_id").eq("status", "live");
if (bizErr || !live?.length) { console.error("No live business found:", bizErr?.message); process.exit(1); }
if (live.length > 1) { console.error("Multiple live businesses — not safe to auto-pick."); process.exit(1); }
const tenantId = live[0].tenant_id;

console.log(`Live business: "${live[0].name}"  tenant=${tenantId}`);
console.log(`Target number: ${phone}`);
console.log(`Mode: ${CONFIRM ? "DELETE (--confirm)" : "DRY RUN"}\n`);

// Find the contact(s) with this phone in this tenant.
const { data: contacts } = await db
  .from("contacts").select("id, name, phone, created_at").eq("tenant_id", tenantId).eq("phone", phone);
const contactIds = (contacts ?? []).map((c) => c.id);
console.log(`Contacts matching: ${contactIds.length}`);
for (const c of contacts ?? []) console.log(`   · ${c.name}  ${c.phone}  ${c.created_at}`);

// Calls/messages keyed by the raw number too (in case no contact was linked).
const { data: calls } = await db
  .from("calls").select("id").eq("tenant_id", tenantId)
  .or(`from_number.eq.${phone}${contactIds.length ? "," + contactIds.map((id) => `contact_id.eq.${id}`).join(",") : ""}`);
const callIds = (calls ?? []).map((c) => c.id);

async function count(table, col, vals) {
  if (!vals.length) return 0;
  const { count } = await db.from(table).select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).in(col, vals);
  return count ?? 0;
}
console.log(`\nWould remove:`);
console.log(`  calls                    ${callIds.length}`);
console.log(`  call_transcripts         ${await count("call_transcripts", "call_id", callIds)}`);
console.log(`  tool_calls               ${await count("tool_calls", "call_id", callIds)}`);
console.log(`  leads                    ${await count("leads", "contact_id", contactIds)}`);
console.log(`  jobs                     ${await count("jobs", "contact_id", contactIds)}`);
console.log(`  appointments             ${await count("appointments", "contact_id", contactIds)}`);
console.log(`  customer_timeline_events ${await count("customer_timeline_events", "contact_id", contactIds)}`);
const { count: msgCount } = await db.from("messages").select("id", { count: "exact", head: true })
  .eq("tenant_id", tenantId).or(`from_number.eq.${phone},to_number.eq.${phone}${contactIds.length ? "," + contactIds.map((id) => `contact_id.eq.${id}`).join(",") : ""}`);
console.log(`  messages                 ${msgCount ?? 0}`);
console.log(`  contacts                 ${contactIds.length}`);

if (!CONFIRM) { console.log("\nDry run only. Re-run with --confirm to delete."); process.exit(0); }

console.log("\nDeleting…");
const del = async (table, col, vals) => {
  if (!vals.length) return;
  const { count, error } = await db.from(table).delete({ count: "exact" }).eq("tenant_id", tenantId).in(col, vals);
  console.log(`  ${table.padEnd(26)} ${error ? "⚠️ " + error.message : "deleted " + (count ?? 0)}`);
};
// Order matters: tables whose composite FK is ON DELETE SET NULL would try to
// null a NOT-NULL tenant_id, so delete those children before their parents
// (jobs/appointments/follow_up_tasks before calls + contacts).
await del("tool_calls", "call_id", callIds);
await del("call_transcripts", "call_id", callIds);
await del("jobs", "contact_id", contactIds);
await del("appointments", "contact_id", contactIds);
await del("follow_up_tasks", "call_id", callIds);
await del("follow_up_tasks", "contact_id", contactIds);
await del("leads", "contact_id", contactIds);
await del("customer_timeline_events", "contact_id", contactIds);
await del("calls", "id", callIds);
{
  const { count, error } = await db.from("messages").delete({ count: "exact" })
    .eq("tenant_id", tenantId).or(`from_number.eq.${phone},to_number.eq.${phone}${contactIds.length ? "," + contactIds.map((id) => `contact_id.eq.${id}`).join(",") : ""}`);
  console.log(`  ${"messages".padEnd(26)} ${error ? "⚠️ " + error.message : "deleted " + (count ?? 0)}`);
}
await del("contacts", "id", contactIds);
console.log("\nDone. Re-run without --confirm to confirm it's clean.");
