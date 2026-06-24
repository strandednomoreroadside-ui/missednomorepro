// Read-only: dump where the AI's "service area" answer comes from for every
// business — pricing_settings radius/base, service_areas list, and any FAQ
// that mentions miles/radius/area. Run: node scripts/check-service-area.mjs
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

const { data: businesses } = await db
  .from("businesses")
  .select("id, tenant_id, name");

for (const b of businesses ?? []) {
  console.log(`\n========== ${b.name} (${b.id}) ==========`);

  const { data: ps } = await db
    .from("pricing_settings")
    .select("base_address, base_lat, base_lng, max_service_miles, approved_at")
    .eq("business_id", b.id)
    .maybeSingle();
  console.log("pricing_settings:", ps ?? "(none)");

  const { data: areas } = await db
    .from("service_areas")
    .select("type, zip_code, city, state, active")
    .eq("business_id", b.id);
  console.log(`service_areas (${areas?.length ?? 0}):`, areas ?? []);

  const { data: faqs } = await db
    .from("faqs")
    .select("question, answer, active")
    .eq("business_id", b.id);
  const areaFaqs = (faqs ?? []).filter((f) =>
    /mile|radius|area|serve|cover|zone|distance/i.test(`${f.question} ${f.answer}`)
  );
  console.log(`area-related FAQs (${areaFaqs.length} of ${faqs?.length ?? 0} total):`);
  for (const f of areaFaqs) {
    console.log(`  - [${f.active ? "active" : "OFF"}] Q: ${f.question}`);
    console.log(`        A: ${f.answer}`);
  }
}
console.log("");
