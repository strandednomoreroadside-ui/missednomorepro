// Point the DEMO business's booking at a specific Google calendar.
//
// The OAuth callback always saves google_calendar_id = "primary", which is the
// right default for a real customer but wrong for the public demo line —
// strangers' test bookings would land on the owner's personal calendar. The
// stored token already grants access to EVERY calendar on the connected
// account, so switching calendars is just this column; no re-auth needed.
//
//   node scripts/set-demo-calendar.mjs                      # show current state
//   node scripts/set-demo-calendar.mjs <calendarId>         # point at a calendar
//
// Find <calendarId> in Google Calendar: hover the calendar in the left sidebar
// -> three dots -> Settings and sharing -> "Integrate calendar" -> Calendar ID.
// It looks like c_a1b2c3...@group.calendar.google.com (a secondary calendar) —
// if you connected a whole separate Google account instead, "primary" is
// already correct and you don't need this script.
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}

const BIZ_NAME = "Summit Home Services";
const target = process.argv[2] ?? null;

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const { data: biz } = await db
  .from("businesses")
  .select("id, tenant_id, name")
  .eq("name", BIZ_NAME)
  .maybeSingle();
if (!biz) {
  console.error(`✗ no business named "${BIZ_NAME}" — run scripts/seed-demo-business.mjs first.`);
  process.exit(1);
}

const { data: conn } = await db
  .from("calendar_connections")
  .select("id, google_account_email, google_calendar_id, status, last_error")
  .eq("business_id", biz.id)
  .maybeSingle();

if (!conn) {
  console.log(`\n✗ No calendar connected to "${BIZ_NAME}" yet.\n`);
  console.log("  In the dashboard: switch to the Summit Home Services (Demo) org,");
  console.log("  then Settings -> Calendar booking -> Connect Google.");
  console.log("  Connect it to the calendar you want demo bookings to land on.\n");
  process.exit(0);
}

console.log(`\n=== Demo calendar: ${BIZ_NAME} ===\n`);
console.log(`  account:  ${conn.google_account_email}`);
console.log(`  calendar: ${conn.google_calendar_id}`);
console.log(`  status:   ${conn.status}${conn.last_error ? ` (${conn.last_error})` : ""}`);

if (!target) {
  if (conn.google_calendar_id === "primary") {
    console.log(`\n  ! Bookings go to this account's PRIMARY calendar.`);
    console.log(`    If that's a dedicated demo account, you're all set.`);
    console.log(`    If it's your everyday account, pass a calendar ID:`);
    console.log(`      node scripts/set-demo-calendar.mjs c_xxx@group.calendar.google.com\n`);
  } else {
    console.log(`\n  ✓ Pointed at a dedicated calendar — your personal one is untouched.\n`);
  }
  process.exit(0);
}

const { error } = await db
  .from("calendar_connections")
  .update({ google_calendar_id: target })
  .eq("id", conn.id);
if (error) {
  console.error(`\n✗ update failed: ${error.message}\n`);
  process.exit(1);
}
console.log(`\n✓ Demo bookings now go to: ${target}`);
console.log(`  Book a test appointment on a call, then confirm it appears there.\n`);
