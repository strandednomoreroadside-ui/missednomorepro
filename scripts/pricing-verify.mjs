// Verify the pricing engine: golden-value math checks (mirroring
// src/lib/pricing/engine.ts) + a dump of the seeded config.
// Run: node scripts/pricing-verify.mjs
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set */
}

// ── Math self-check (mirrors engine.ts) ───────────────────────
function inWindow(min, start, end) {
  if (start === end) return false;
  return start < end ? min >= start && min < end : min >= start || min < end;
}
function resolveZone(zones, miles) {
  const s = [...zones].sort((a, b) => a.max - b.max);
  for (const z of s) if (miles <= z.max) return z;
  return null;
}
const ZONES = [
  { n: 1, max: 8, fee: 55 },
  { n: 2, max: 16, fee: 65 },
  { n: 3, max: 25, fee: 75 },
];
const LATE = [21 * 60, 5 * 60]; // 9 PM–5 AM
function quote({ service, miles, towMiles, timeMin, maxMiles = 25 }) {
  if (miles > maxMiles) return { ok: false, reason: "out_of_area" };
  if (service.availStart != null && !inWindow(timeMin, service.availStart, service.availEnd)) {
    return { ok: false, reason: "service_unavailable" };
  }
  const z = resolveZone(ZONES, miles);
  if (!z) return { ok: false, reason: "no_zone" };
  let total = z.fee;
  if (service.type === "tow") {
    total += service.hook + service.rate * Math.max(0, towMiles - (service.free ?? 0));
  } else total += service.fee;
  if (inWindow(timeMin, LATE[0], LATE[1])) total += 20; // auto late-night
  return { ok: true, total: Math.round(total * 100) / 100 };
}

// Mirrors calculateQuote's multi-service path: ONE dispatch fee for the
// whole visit no matter how many services are quoted together.
function quoteMulti({ services, miles, towMiles, timeMin, maxMiles = 25 }) {
  if (miles > maxMiles) return { ok: false, reason: "out_of_area" };
  for (const service of services) {
    if (service.availStart != null && !inWindow(timeMin, service.availStart, service.availEnd)) {
      return { ok: false, reason: "service_unavailable" };
    }
  }
  const z = resolveZone(ZONES, miles);
  if (!z) return { ok: false, reason: "no_zone" };
  let total = z.fee; // charged once, not once per service
  for (const service of services) {
    if (service.type === "tow") {
      total += service.hook + service.rate * Math.max(0, towMiles - (service.free ?? 0));
    } else total += service.fee;
  }
  if (inWindow(timeMin, LATE[0], LATE[1])) total += 20;
  return { ok: true, total: Math.round(total * 100) / 100 };
}

const JUMP = { type: "flat", fee: 40 };
const LOCK = { type: "flat", fee: 50 };
const NOSPARE = { type: "flat", fee: 80, availStart: 9 * 60, availEnd: 16 * 60 };
const TOW = { type: "tow", hook: 60, rate: 2.5, free: 5 };

const cases = [
  ["Jump, Zone1 (5mi), 10AM", quote({ service: JUMP, miles: 5, timeMin: 600 }), { ok: true, total: 95 }],
  ["Jump, Zone2 (12mi), 11PM late", quote({ service: JUMP, miles: 12, timeMin: 1380 }), { ok: true, total: 125 }],
  ["Lockout, Zone3 (20mi), 2PM", quote({ service: LOCK, miles: 20, timeMin: 840 }), { ok: true, total: 125 }],
  ["Tow, Zone1 (5mi) + 10 tow mi, 5 free, 2PM", quote({ service: TOW, miles: 5, towMiles: 10, timeMin: 840 }), { ok: true, total: 127.5 }],
  ["Out of area (30mi)", quote({ service: JUMP, miles: 30, timeMin: 840 }), { ok: false, reason: "out_of_area" }],
  ["No-spare tire at 6PM (closed)", quote({ service: NOSPARE, miles: 5, timeMin: 1080 }), { ok: false, reason: "service_unavailable" }],
  [
    "Jump + Lockout together, Zone1 (5mi), 10AM — ONE dispatch fee",
    quoteMulti({ services: [JUMP, LOCK], miles: 5, timeMin: 600 }),
    { ok: true, total: 145 },
  ],
];

console.log("========== PRICING MATH ==========");
let fails = 0;
for (const [label, got, want] of cases) {
  const ok = got.ok === want.ok && (want.ok ? got.total === want.total : got.reason === want.reason);
  if (!ok) fails++;
  const detail = got.ok ? `$${got.total}` : got.reason;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(40)} -> ${detail}`);
}
console.log(fails === 0 ? "  all pricing cases correct" : `  ${fails} CASE(S) WRONG`);

// ── DB config dump ────────────────────────────────────────────
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

console.log("\n========== PRICING SETTINGS ==========");
const settings = await db
  .from("pricing_settings")
  .select("base_address, base_lat, base_lng, max_service_miles, currency, approved_at");
if (settings.error) console.log("  ERROR:", settings.error.message, "(migration applied?)");
else if (!settings.data.length) console.log("  (none — run scripts/seed-pricing.mjs)");
else
  for (const s of settings.data)
    console.log(
      `  base="${s.base_address}" geocoded=${s.base_lat != null ? "yes" : "NO"} max=${s.max_service_miles}mi approved=${s.approved_at ? "YES" : "no (quoting off)"}`
    );

console.log("\n========== ZONES / SERVICES / SURCHARGES ==========");
const [zones, svcs, surs] = await Promise.all([
  db.from("pricing_zones").select("zone_number, min_miles, max_miles, dispatch_fee").order("zone_number"),
  db.from("service_pricing").select("name, pricing_type, service_fee, hook_fee, per_mile_rate, variable_part, available_start, available_end"),
  db.from("pricing_surcharges").select("name, amount, apply_type, window_start, window_end"),
]);
for (const z of zones.data ?? [])
  console.log(`  Zone ${z.zone_number}: ${z.min_miles}-${z.max_miles}mi -> $${z.dispatch_fee}`);
for (const s of svcs.data ?? [])
  console.log(
    `  ${s.name}: ${s.pricing_type === "tow" ? `$${s.hook_fee} hook + $${s.per_mile_rate}/mi` : `$${s.service_fee}`}` +
      (s.variable_part ? ` (+${s.variable_part})` : "") +
      (s.available_start ? ` [${s.available_start}-${s.available_end}]` : "")
  );
for (const s of surs.data ?? [])
  console.log(`  surcharge ${s.name}: $${s.amount} (${s.apply_type}${s.window_start ? ` ${s.window_start}-${s.window_end}` : ""})`);

console.log("");
process.exit(fails === 0 ? 0 : 1);
