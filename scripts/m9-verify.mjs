// Verify the M9 data side: calendar connection, appointments, jobs, and a
// self-check of the booking timezone math. Run: node scripts/m9-verify.mjs
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

// ── Timezone math self-check (same algorithm as src/lib/calendar) ──
function tzOffsetMs(tz, date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
  const m = {};
  for (const p of dtf.formatToParts(date)) if (p.type !== "literal") m[p.type] = Number(p.value);
  const h = m.hour === 24 ? 0 : m.hour;
  return Date.UTC(m.year, m.month - 1, m.day, h, m.minute, m.second) - date.getTime();
}
function zonedTimeToUtc(y, mo, d, h, mi, tz) {
  const g = Date.UTC(y, mo - 1, d, h, mi, 0);
  const o = tzOffsetMs(tz, new Date(g));
  let u = g - o;
  const r = tzOffsetMs(tz, new Date(u));
  if (r !== o) u = g - r;
  return new Date(u);
}

console.log("\n========== TIMEZONE MATH (booking correctness) ==========");
const cases = [
  ["America/New_York", 2026, 7, 7, 9, 0, "2026-07-07T13:00:00.000Z", "EDT summer"],
  ["America/New_York", 2026, 1, 7, 9, 0, "2026-01-07T14:00:00.000Z", "EST winter"],
  ["America/Chicago", 2026, 7, 7, 9, 0, "2026-07-07T14:00:00.000Z", "CDT summer"],
  ["America/Phoenix", 2026, 7, 7, 9, 0, "2026-07-07T16:00:00.000Z", "no-DST"],
];
let tzFails = 0;
for (const [tz, y, mo, d, h, mi, expect, label] of cases) {
  const got = zonedTimeToUtc(y, mo, d, h, mi, tz).toISOString();
  const ok = got === expect;
  if (!ok) tzFails++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(10)} ${tz} 9:00 -> ${got}`);
}
console.log(tzFails === 0 ? "  all timezone cases correct" : `  ${tzFails} TIMEZONE CASE(S) WRONG`);

// ── Calendar connections ──────────────────────────────────────
console.log("\n========== CALENDAR CONNECTIONS ==========");
const conns = await db
  .from("calendar_connections")
  .select("business_id, provider, google_account_email, google_calendar_id, status, last_error, connected_at, last_synced_at")
  .order("connected_at", { ascending: false });
if (conns.error) {
  console.log("  ERROR:", conns.error.message, "(migration applied?)");
} else if (!conns.data.length) {
  console.log("  (none connected yet — connect Google Calendar in Settings)");
} else {
  for (const c of conns.data) {
    console.log(
      `  ${String(c.status).padEnd(10)} ${c.provider}  ${c.google_account_email ?? "?"}  cal=${c.google_calendar_id}` +
        (c.last_error ? `  ERR: ${c.last_error}` : "")
    );
  }
}

// ── Appointments ──────────────────────────────────────────────
console.log("\n========== APPOINTMENTS (newest first) ==========");
const appts = await db
  .from("appointments")
  .select("title, starts_at, ends_at, status, source, sync_status, google_event_id, created_at")
  .order("starts_at", { ascending: false })
  .limit(25);
if (appts.error) console.log("  ERROR:", appts.error.message);
else if (!appts.data.length) console.log("  (no appointments booked yet)");
else
  for (const a of appts.data)
    console.log(
      `  ${new Date(a.starts_at).toLocaleString()}  ${String(a.status).padEnd(9)} sync=${String(a.sync_status).padEnd(7)} ${a.google_event_id ? "gcal✓" : "gcal—"}  "${(a.title ?? "").slice(0, 40)}"`
    );

// ── Jobs ──────────────────────────────────────────────────────
console.log("\n========== JOBS (newest first) ==========");
const jobs = await db
  .from("jobs")
  .select("title, status, scheduled_for, source, created_at")
  .order("created_at", { ascending: false })
  .limit(25);
if (jobs.error) console.log("  ERROR:", jobs.error.message);
else if (!jobs.data.length) console.log("  (no jobs yet)");
else
  for (const j of jobs.data)
    console.log(
      `  ${String(j.status).padEnd(11)} ${j.scheduled_for ? new Date(j.scheduled_for).toLocaleString() : "unscheduled"}  (${j.source})  "${(j.title ?? "").slice(0, 40)}"`
    );

console.log("");
process.exit(tzFails === 0 ? 0 : 1);
