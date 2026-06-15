// Seed Stranded No More's real pricing into the engine tables.
// Idempotent: clears + reinserts this business's zones/services/surcharges.
// Leaves approved_at NULL on purpose — the owner approves in Settings to
// turn quoting on. Run: node scripts/seed-pricing.mjs
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

const BASE_ADDRESS = "6466 Haviland Dr, Brook Park, OH 44142";

const ZONES = [
  { zone_number: 1, min_miles: 0.1, max_miles: 8, dispatch_fee: 65 },
  { zone_number: 2, min_miles: 8.1, max_miles: 16, dispatch_fee: 75 },
  { zone_number: 3, min_miles: 16.1, max_miles: 25, dispatch_fee: 85 },
];

const SERVICES = [
  { name: "Jump Start", pricing_type: "flat", service_fee: 45 },
  { name: "Vehicle Lockout", pricing_type: "flat", service_fee: 55 },
  { name: "Flat Tire Change With Spare", pricing_type: "flat", service_fee: 65 },
  {
    name: "Flat Tire Change Without Spare",
    pricing_type: "flat",
    service_fee: 85,
    variable_part: "tire",
    available_start: "09:00",
    available_end: "16:00",
  },
  { name: "Battery Testing / Replacement", pricing_type: "flat", service_fee: 55, variable_part: "battery" },
  { name: "Emergency Fuel Delivery", pricing_type: "flat", service_fee: 45, variable_part: "fuel" },
  { name: "Local Towing", pricing_type: "tow", service_fee: 0, hook_fee: 65, per_mile_rate: 2.5 },
];

const SURCHARGES = [
  { name: "Late Night", amount: 20, apply_type: "auto_time", window_start: "21:00", window_end: "05:00" },
  { name: "Dangerous Roadway", amount: 15, apply_type: "conditional" },
  { name: "Severe Weather", amount: 15, apply_type: "conditional" },
  { name: "Downtown / Parking Garage", amount: 10, apply_type: "conditional" },
];

async function geocode(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK" || !json.results?.length) {
    console.log(`  geocode failed: ${json.status}`);
    return null;
  }
  return json.results[0].geometry.location; // { lat, lng }
}

// Find the business (the live "Stranded No More" one).
const { data: biz, error: bizErr } = await db
  .from("businesses")
  .select("id, tenant_id, name, status")
  .ilike("name", "%stranded%")
  .order("created_at", { ascending: true });
if (bizErr) throw new Error(bizErr.message);
if (!biz?.length) throw new Error("No 'Stranded' business found — is the account set up?");
const business = biz.find((b) => b.status === "live") ?? biz[0];
console.log(`Business: ${business.name} (${business.id})  status=${business.status}`);

// Geocode the home base if the maps key is set.
const coords = await geocode(BASE_ADDRESS);
console.log(coords ? `Base geocoded: ${coords.lat}, ${coords.lng}` : "Base NOT geocoded (set GOOGLE_MAPS_API_KEY, then rerun or approve in Settings).");

// Upsert settings (keep approved_at as-is; do not auto-approve).
const { error: setErr } = await db.from("pricing_settings").upsert(
  {
    tenant_id: business.tenant_id,
    business_id: business.id,
    base_address: BASE_ADDRESS,
    base_lat: coords?.lat ?? null,
    base_lng: coords?.lng ?? null,
    max_service_miles: 25,
    currency: "usd",
  },
  { onConflict: "business_id" }
);
if (setErr) throw new Error(`settings: ${setErr.message}`);

// Reseed zones/services/surcharges (idempotent).
for (const table of ["pricing_zones", "service_pricing", "pricing_surcharges"]) {
  await db.from(table).delete().eq("business_id", business.id);
}
const withIds = (rows) =>
  rows.map((r) => ({ tenant_id: business.tenant_id, business_id: business.id, ...r }));

const z = await db.from("pricing_zones").insert(withIds(ZONES));
if (z.error) throw new Error(`zones: ${z.error.message}`);
const s = await db.from("service_pricing").insert(withIds(SERVICES));
if (s.error) throw new Error(`services: ${s.error.message}`);
const sc = await db.from("pricing_surcharges").insert(withIds(SURCHARGES));
if (sc.error) throw new Error(`surcharges: ${sc.error.message}`);

console.log(`\nSeeded ${ZONES.length} zones, ${SERVICES.length} services, ${SURCHARGES.length} surcharges.`);
console.log("approved_at left NULL — review the pricing in Settings → Pricing and click Approve to turn AI quoting on.");
