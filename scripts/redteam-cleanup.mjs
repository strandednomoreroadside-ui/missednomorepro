// Red-team cleanup — removes the fake CRM rows created while running RED_TEAM.md
// against the LIVE tenant. Dry-run by default; never deletes without --confirm.
//
//   node scripts/redteam-cleanup.mjs                 # dry run (today's rows)
//   node scripts/redteam-cleanup.mjs --since 2026-06-23T14:00:00Z
//   node scripts/redteam-cleanup.mjs --tenant <uuid> # if more than one live org
//   node scripts/redteam-cleanup.mjs --confirm       # actually delete
//
// Scope: one tenant, rows with created_at >= --since (default: midnight UTC
// today). REVIEW the dry-run output before --confirm — this hits the real CRM,
// so anything genuinely created in the window (e.g. a real customer call mid-test)
// would also be removed. Run your red-team in a focused window to keep it clean.
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set (e.g. CI) */
}

const args = process.argv.slice(2);
const has = (f) => args.includes(f);
const val = (f) => {
  const i = args.indexOf(f);
  return i >= 0 ? args[i + 1] : undefined;
};

const CONFIRM = has("--confirm");
const since = val("--since") ?? new Date(new Date().toISOString().slice(0, 10)).toISOString();
let tenantId = val("--tenant");

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

// ── Resolve the live tenant ──────────────────────────────────────────────
if (!tenantId) {
  const { data: live, error } = await db
    .from("businesses")
    .select("id, name, tenant_id, status")
    .eq("status", "live");
  if (error) {
    console.error("Could not list businesses:", error.message);
    process.exit(1);
  }
  if (!live || live.length === 0) {
    console.error("No business with status='live'. Pass --tenant <uuid> explicitly.");
    process.exit(1);
  }
  if (live.length > 1) {
    console.error("Multiple live businesses — pass --tenant <uuid>:");
    for (const b of live) console.error(`  ${b.tenant_id}  ${b.name}`);
    process.exit(1);
  }
  tenantId = live[0].tenant_id;
  console.log(`Live business: "${live[0].name}"  tenant=${tenantId}`);
}

console.log(`\nMode:   ${CONFIRM ? "DELETE (--confirm)" : "DRY RUN (no deletes)"}`);
console.log(`Tenant: ${tenantId}`);
console.log(`Since:  ${since}\n`);

// Child-first order so FK constraints are never violated. (Most cascade, but
// appointments/jobs/messages are ON DELETE SET NULL from contacts, so we delete
// them explicitly rather than relying on a cascade.)
const TABLES = [
  "tool_calls",
  "call_transcripts",
  "messages",
  "jobs",
  "appointments",
  "follow_up_tasks",
  "leads",
  "customer_timeline_events",
  "calls",
  "contacts",
];

// Friendly preview columns per table (best-effort; missing cols are ignored).
const PREVIEW = {
  contacts: "name, phone, created_at",
  calls: "from_number, disposition, started_at",
  leads: "service_needed, status, created_at",
  jobs: "title, status, created_at",
  appointments: "title, starts_at, status",
  messages: "direction, kind, created_at",
  call_transcripts: "summary, created_at",
  follow_up_tasks: "title, status, created_at",
  tool_calls: "tool_name, status, created_at",
  customer_timeline_events: "event_type, summary, created_at",
};

let grand = 0;
for (const table of TABLES) {
  const { data, count, error } = await db
    .from(table)
    .select(PREVIEW[table] ?? "id", { count: "exact" })
    .eq("tenant_id", tenantId)
    .gte("created_at", since)
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) {
    console.log(`  ${table.padEnd(26)} ⚠️  ${error.message}`);
    continue;
  }
  grand += count ?? 0;
  console.log(`  ${table.padEnd(26)} ${count ?? 0} row(s)`);
  if (!CONFIRM && data && data.length) {
    for (const r of data.slice(0, 5)) {
      console.log(`      · ${Object.values(r).map((v) => (v == null ? "—" : String(v))).join("  ")}`);
    }
    if (data.length > 5) console.log(`      … and ${(count ?? 0) - 5} more`);
  }
}

console.log(`\nTotal in window: ${grand} row(s).`);

if (!CONFIRM) {
  console.log("\nDry run only. Review the above, then re-run with --confirm to delete.");
  process.exit(0);
}

if (grand === 0) {
  console.log("Nothing to delete.");
  process.exit(0);
}

console.log("\nDeleting…");
for (const table of TABLES) {
  const { error, count } = await db
    .from(table)
    .delete({ count: "exact" })
    .eq("tenant_id", tenantId)
    .gte("created_at", since);
  if (error) console.log(`  ${table.padEnd(26)} ⚠️  ${error.message}`);
  else console.log(`  ${table.padEnd(26)} deleted ${count ?? 0}`);
}
console.log("\nDone. Re-run without --confirm to confirm the window is empty.");
