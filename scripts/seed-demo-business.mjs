// Stand up the PUBLIC DEMO business — the "call this number and hear the AI"
// line that the whole marketing funnel points at (marketing/README.md).
//
// Why a separate org: a demo line is called by strangers. Isolating it means
// demo calls never touch the real business's CRM, usage, minutes, or billing,
// and it gets its own hard daily spend cap. The operator is added as owner so
// it's visible via the org switcher (their real org stays the default — the
// app falls back to the FIRST membership by created_at).
//
// Idempotent: re-running updates in place rather than duplicating.
// Run: node scripts/seed-demo-business.mjs
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

// ── Config ──────────────────────────────────────────────────────────
const ORG_NAME = "Summit Home Services (Demo)";
const BIZ_NAME = "Summit Home Services";
// Drives real prompt behavior (src/lib/voice/industry.ts): a non-vehicle
// trade, so the AI never asks a caller for their car's year/make/model.
const INDUSTRY = "HVAC";
const TIMEZONE = "America/New_York";
const DEMO_NUMBER = "+14406442423";
const OWNER_EMAIL = "strandednomorecle@gmail.com";
const STAFF_NAME = "Josh";
const STAFF_PHONE = "+12164151568";
const BASE_ADDRESS = "Cleveland, OH 44113";
const SERVICE_RADIUS_MILES = 75;
// Comped plan + a hard daily spend cap so a busy (or abused) demo line can
// never run up a bill. Monthly minutes are the real ceiling; the daily cap is
// the circuit breaker. Both enforced in src/lib/billing/cost-controls.ts.
const PLAN = "starter";
const DAILY_SPEND_CAP_CENTS = 300; // $3/day

const SERVICES = [
  ["AC Repair", "Diagnose and repair air conditioning that isn't cooling, won't turn on, or is making noise."],
  ["Furnace & Heating Repair", "Diagnose and repair furnaces and heating systems that won't start or won't hold temperature."],
  ["Heating & Cooling Tune-Up", "Seasonal maintenance to keep a system running efficiently and catch problems early."],
  ["Water Heater Repair", "Repair for no hot water, leaks, pilot light, and thermostat problems."],
  ["Drain Cleaning", "Clear slow or fully clogged sinks, tubs, showers, and main lines."],
  ["Leak Detection & Repair", "Find and fix hidden water leaks under sinks, behind walls, and at fixtures."],
  ["Toilet Repair", "Fix running, clogged, or leaking toilets."],
  ["Garbage Disposal Repair", "Repair or replace a jammed, humming, or leaking disposal."],
  ["Emergency After-Hours Service", "Urgent nights, weekends, and holiday service calls."],
];

// Flat, all-in pricing so a quote is a single clean number the AI reads back.
const PRICING = [
  { name: "AC Repair", service_fee: 189 },
  { name: "Furnace & Heating Repair", service_fee: 189 },
  { name: "Heating & Cooling Tune-Up", service_fee: 99 },
  { name: "Water Heater Repair", service_fee: 225 },
  { name: "Drain Cleaning", service_fee: 149 },
  { name: "Leak Detection & Repair", service_fee: 199 },
  { name: "Toilet Repair", service_fee: 159 },
  { name: "Garbage Disposal Repair", service_fee: 139 },
  { name: "Emergency After-Hours Service", service_fee: 289 },
];

const AREAS = ["Cleveland", "Parma", "Lakewood", "Strongsville", "Westlake", "Brook Park", "Independence", "Beachwood"];

// Mon-Fri 7-7, Sat 8-4, Sun closed. (0 = Sunday.)
const HOURS = [
  { day_of_week: 0, closed: true, opens_at: null, closes_at: null },
  { day_of_week: 1, closed: false, opens_at: "07:00", closes_at: "19:00" },
  { day_of_week: 2, closed: false, opens_at: "07:00", closes_at: "19:00" },
  { day_of_week: 3, closed: false, opens_at: "07:00", closes_at: "19:00" },
  { day_of_week: 4, closed: false, opens_at: "07:00", closes_at: "19:00" },
  { day_of_week: 5, closed: false, opens_at: "07:00", closes_at: "19:00" },
  { day_of_week: 6, closed: false, opens_at: "08:00", closes_at: "16:00" },
];

// The knowledge base. Prospects WILL try to trip the AI up on a demo call, so
// this covers the business basics, the "gotcha" questions, and the safety
// answer that matters most. Anything not here → search_knowledge_base, then
// "the team will follow up" (never a guess — master plan §5.1).
const FAQS = [
  ["Are you licensed and insured?", "Yes. We're fully licensed, bonded, and insured, and every technician is background-checked before they ever come to your home."],
  ["How soon can someone come out?", "In most cases we can get a technician out same day or next day. If it's an emergency, we'll get someone moving right away and the team will confirm your arrival window by text."],
  ["Do you offer emergency service?", "Yes, we offer emergency service around the clock, including nights, weekends, and holidays. After-hours calls are billed at our emergency rate."],
  ["Do you charge for estimates or a service call?", "Our repair pricing is a flat, all-in rate quoted before we start, so there are no surprise add-ons. For a full system replacement, the in-home assessment and written quote are free."],
  ["What areas do you serve?", "We serve the greater Cleveland area and surrounding communities within about 75 miles, including Parma, Lakewood, Strongsville, Westlake, Brook Park, Independence, and Beachwood."],
  ["What brands do you work on?", "We service all major residential heating, cooling, and plumbing brands, including Carrier, Trane, Lennox, Goodman, Rheem, Bradford White, and A.O. Smith."],
  ["Do you offer financing?", "Yes, we offer financing on system replacements and larger repairs, with several term options. The team will walk you through what you qualify for."],
  ["Do you warranty your work?", "Yes. Our workmanship is guaranteed for one year, and any parts we install carry the manufacturer's warranty on top of that."],
  ["How long does a typical repair take?", "Most standard repairs are finished in about one to two hours. If a part has to be ordered, we'll tell you up front and schedule the return visit before we leave."],
  ["Do I need to be home for the appointment?", "Yes, we need an adult on site to let the technician in, approve the work, and go over what was found when the job is done."],
  ["What payment methods do you accept?", "We accept all major credit cards, debit, check, and cash. Payment is collected by the technician after the work is complete, never over the phone."],
  ["How much does a new AC or furnace cost?", "A full system replacement is quoted after a free in-home assessment, because the price depends on the size and efficiency of the system you choose. We'll put an exact number in writing before any work starts."],
  ["Do you offer maintenance plans?", "Yes. Our maintenance plan covers two seasonal tune-ups a year, priority scheduling, and a discount on repairs. The team can go over the details with you."],
  ["How often should I service my furnace or AC?", "We recommend a tune-up twice a year, heating in the fall and cooling in the spring. Regular maintenance is the cheapest way to avoid a breakdown in the middle of a heat wave or a cold snap."],
  ["My AC is blowing warm air. What's wrong?", "That's usually a refrigerant issue, a dirty coil, or a failing compressor, but it needs eyes on it to know for sure. Try setting the thermostat to cool and checking that the outdoor unit is running, and we'll get a technician out to diagnose it properly."],
  ["Do you work weekends?", "Yes. We're open Saturdays, and we take emergency calls seven days a week, including Sundays and holidays."],
  ["How long have you been in business?", "We've been serving homeowners in the Cleveland area for over fifteen years."],
  ["Can I get a same-day appointment?", "Often, yes, especially if you call early in the day. Tell us what's going on and we'll find you the soonest opening we have."],
  ["Do you offer senior or military discounts?", "Yes, we offer a discount for seniors, active military, and veterans. Just mention it when the technician arrives."],
  ["What should I do if I smell gas?", "Leave the house right away and take everyone with you. Don't flip any light switches, don't use your phone inside, and don't try to find the leak yourself. Once you're safely outside, call 911 or your gas utility's emergency line first, then call us and we'll get a technician out."],
];

// ── Helpers ─────────────────────────────────────────────────────────
function die(step, error) {
  console.error(`\n✗ ${step}: ${error?.message ?? error}`);
  process.exit(1);
}

async function geocode(address) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${key}`;
  const res = await fetch(url);
  const json = await res.json();
  if (json.status !== "OK" || !json.results?.length) {
    console.log(`  ! geocode failed (${json.status}) — quoting will stay off`);
    return null;
  }
  const loc = json.results[0].geometry.location;
  return { lat: loc.lat, lng: loc.lng };
}

console.log("=== Seeding the public demo business ===\n");

// ── 1. Organization ─────────────────────────────────────────────────
let { data: org } = await db.from("organizations").select("id").eq("name", ORG_NAME).maybeSingle();
if (!org) {
  const { data, error } = await db
    .from("organizations")
    // founder_excluded: a demo tenant must never consume a real founder slot.
    .insert({ name: ORG_NAME, plan: PLAN, status: "active", founder_excluded: true })
    .select("id")
    .single();
  if (error) die("create organization", error);
  org = data;
  console.log(`✓ organization created (${org.id})`);
} else {
  await db.from("organizations").update({ plan: PLAN, founder_excluded: true }).eq("id", org.id);
  console.log(`✓ organization exists (${org.id})`);
}
const tenantId = org.id;

// ── 2. Owner membership (so it shows in the org switcher) ───────────
const { data: userList } = await db.auth.admin.listUsers();
const owner = userList.users.find((u) => u.email === OWNER_EMAIL);
if (!owner) die("find owner user", `no auth user with email ${OWNER_EMAIL}`);
const { data: member } = await db
  .from("organization_members")
  .select("id")
  .eq("organization_id", tenantId)
  .eq("user_id", owner.id)
  .maybeSingle();
if (!member) {
  const { error } = await db
    .from("organization_members")
    .insert({ organization_id: tenantId, user_id: owner.id, role: "owner" });
  if (error) die("add owner membership", error);
}
console.log(`✓ owner membership (${OWNER_EMAIL})`);

// ── 3. Business ─────────────────────────────────────────────────────
let { data: biz } = await db
  .from("businesses")
  .select("id, status")
  .eq("tenant_id", tenantId)
  .eq("name", BIZ_NAME)
  .maybeSingle();
if (!biz) {
  const { data, error } = await db
    .from("businesses")
    .insert({
      organization_id: tenantId,
      tenant_id: tenantId,
      name: BIZ_NAME,
      industry: INDUSTRY,
      phone: DEMO_NUMBER,
      address: BASE_ADDRESS,
      timezone: TIMEZONE,
      status: "setup",
      ai_enabled: true,
    })
    .select("id, status")
    .single();
  if (error) die("create business", error);
  biz = data;
  console.log(`✓ business created (${biz.id})`);
} else {
  await db
    .from("businesses")
    .update({ industry: INDUSTRY, phone: DEMO_NUMBER, address: BASE_ADDRESS, timezone: TIMEZONE, ai_enabled: true })
    .eq("id", biz.id);
  console.log(`✓ business exists (${biz.id})`);
}
const businessId = biz.id;
const scope = { tenant_id: tenantId, business_id: businessId };

// Live transfer OFF: this is a public line, so a stranger asking "can I talk to
// a person?" must not ring the owner's cell. The AI takes a detailed message
// and the staff alert text still fires, so no lead is lost. Requires migration
// 20260724090000_transfer_target.sql.
{
  const { error } = await db
    .from("businesses")
    .update({ transfer_enabled: false })
    .eq("id", businessId);
  if (error) {
    console.log(`  ! live transfer not disabled — apply 20260724090000_transfer_target.sql (${error.message})`);
  } else {
    console.log("✓ live transfer OFF (lead alert texts unaffected)");
  }
}

// ── 4. Services / hours / areas / staff / SMS ───────────────────────
await db.from("services").delete().eq("business_id", businessId);
{
  const { error } = await db
    .from("services")
    .insert(SERVICES.map(([name, description]) => ({ ...scope, name, description, active: true })));
  if (error) die("insert services", error);
}
console.log(`✓ ${SERVICES.length} services`);

await db.from("business_hours").delete().eq("business_id", businessId);
{
  const { error } = await db.from("business_hours").insert(HOURS.map((h) => ({ ...scope, ...h })));
  if (error) die("insert hours", error);
}
console.log("✓ business hours (7 days)");

await db.from("service_areas").delete().eq("business_id", businessId);
{
  const { error } = await db
    .from("service_areas")
    .insert(AREAS.map((city) => ({ ...scope, type: "city", city, state: "OH", active: true })));
  if (error) die("insert service areas", error);
}
console.log(`✓ ${AREAS.length} service-area cities`);

await db.from("staff_contacts").delete().eq("business_id", businessId);
{
  const { error } = await db
    .from("staff_contacts")
    .insert({ ...scope, name: STAFF_NAME, phone: STAFF_PHONE, notify_on_lead: true });
  if (error) die("insert staff contact", error);
}
console.log(`✓ lead alerts → ${STAFF_PHONE}`);

{
  const { data: existing } = await db.from("sms_settings").select("id").eq("business_id", businessId).maybeSingle();
  const row = {
    ...scope,
    ask_consent_on_call: true,
    consent_script: "Is it okay if we text you updates about your service request? Reply STOP anytime to opt out.",
    transactional_only: false,
    text_back_enabled: true,
    text_back_template:
      "Thanks for calling Summit Home Services! Sorry we missed you — reply here and we'll get you taken care of.",
  };
  const { error } = existing
    ? await db.from("sms_settings").update(row).eq("id", existing.id)
    : await db.from("sms_settings").insert(row);
  if (error) die("sms settings", error);
}
console.log("✓ SMS settings + missed-call text-back");

// ── 5. FAQ knowledge base ───────────────────────────────────────────
await db.from("faqs").delete().eq("business_id", businessId);
{
  const { error } = await db
    .from("faqs")
    .insert(FAQS.map(([question, answer]) => ({ ...scope, question, answer, active: true })));
  if (error) die("insert faqs", error);
}
console.log(`✓ ${FAQS.length} FAQs`);

// ── 6. Pricing engine (exact quotes, computed server-side) ──────────
const base = await geocode(BASE_ADDRESS);
{
  const { data: existing } = await db.from("pricing_settings").select("id").eq("business_id", businessId).maybeSingle();
  const row = {
    ...scope,
    base_address: BASE_ADDRESS,
    base_lat: base?.lat ?? null,
    base_lng: base?.lng ?? null,
    max_service_miles: SERVICE_RADIUS_MILES,
    currency: "usd",
    active: true,
    // Quoting turns on only with a geocoded base — otherwise the AI correctly
    // falls back to "the owner will text you an exact quote".
    approved_at: base ? new Date().toISOString() : null,
  };
  const { error } = existing
    ? await db.from("pricing_settings").update(row).eq("id", existing.id)
    : await db.from("pricing_settings").insert(row);
  if (error) die("pricing settings", error);
}
console.log(`✓ pricing base ${base ? `geocoded (${base.lat.toFixed(3)}, ${base.lng.toFixed(3)})` : "NOT geocoded"}`);

await db.from("pricing_zones").delete().eq("business_id", businessId);
{
  // One flat zone covering the whole radius: dispatch is baked into the
  // all-in service price, so a quote reads back as one clean number.
  const { error } = await db
    .from("pricing_zones")
    .insert({ ...scope, zone_number: 1, min_miles: 0, max_miles: SERVICE_RADIUS_MILES, dispatch_fee: 0 });
  if (error) die("insert pricing zone", error);
}
await db.from("service_pricing").delete().eq("business_id", businessId);
{
  const { error } = await db
    .from("service_pricing")
    .insert(PRICING.map((p) => ({ ...scope, pricing_type: "flat", free_miles: 0, active: true, ...p })));
  if (error) die("insert service pricing", error);
}
console.log(`✓ ${PRICING.length} priced services (1 zone, ${SERVICE_RADIUS_MILES}mi)`);

// ── 7. Setup approvals (the launch gate reads these) ────────────────
{
  const now = new Date().toISOString();
  const { data: existing } = await db.from("setup_states").select("id").eq("business_id", businessId).maybeSingle();
  const row = { hours_approved_at: now, area_approved_at: now, current_step: "launch" };
  const { error } = existing
    ? await db.from("setup_states").update(row).eq("id", existing.id)
    : await db.from("setup_states").insert({ ...scope, ...row });
  if (error) die("setup state", error);
}
console.log("✓ setup approvals stamped");

// ── 8. Comped subscription with a hard daily spend cap ──────────────
{
  const { data: existing } = await db.from("subscriptions").select("id").eq("tenant_id", tenantId).maybeSingle();
  const row = {
    tenant_id: tenantId,
    plan: PLAN,
    status: "active", // NOT "trialing" — that would force the 30-min trial cap.
    billing_interval: "month",
    overage_enabled: false,
    daily_spend_cap_cents: DAILY_SPEND_CAP_CENTS,
  };
  const { error } = existing
    ? await db.from("subscriptions").update(row).eq("id", existing.id)
    : await db.from("subscriptions").insert(row);
  if (error) die("subscription", error);
}
console.log(`✓ comped ${PLAN} plan, $${(DAILY_SPEND_CAP_CENTS / 100).toFixed(2)}/day hard cap`);

// ── 9. Attach the demo phone number ─────────────────────────────────
{
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const mgSid = process.env.TWILIO_MESSAGING_SERVICE_SID;
  let twilioSid = null;
  let a2pAttached = false;
  if (sid && token) {
    const auth = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(DEMO_NUMBER)}`,
      { headers: { Authorization: auth } }
    );
    const json = await res.json();
    twilioSid = json.incoming_phone_numbers?.[0]?.sid ?? null;

    // Attach to the approved A2P 10DLC Messaging Service. Skipping this is
    // NOT cosmetic: Twilio still accepts the message and reports "sent", but
    // US carriers silently drop it with error 30034 (unregistered sender), so
    // every confirmation/alert text vanishes with no error in our logs.
    if (twilioSid && mgSid) {
      const att = await fetch(`https://messaging.twilio.com/v1/Services/${mgSid}/PhoneNumbers`, {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ PhoneNumberSid: twilioSid }),
      });
      // 409 = already attached, which is success for our purposes.
      a2pAttached = att.ok || att.status === 409;
      console.log(`  a2p messaging service: ${a2pAttached ? "attached" : `FAILED (HTTP ${att.status}) — texts will be dropped`}`);
    }
  }
  const { data: existing } = await db
    .from("phone_numbers")
    .select("id")
    .eq("phone_number", DEMO_NUMBER)
    .maybeSingle();
  const row = {
    ...scope,
    phone_number: DEMO_NUMBER,
    twilio_sid: twilioSid,
    type: "local",
    a2p_status: a2pAttached ? "approved" : "pending",
    voice_enabled: true,
    sms_enabled: true,
  };
  const { error } = existing
    ? await db.from("phone_numbers").update(row).eq("id", existing.id)
    : await db.from("phone_numbers").insert(row);
  if (error) die("attach phone number", error);
  console.log(`✓ ${DEMO_NUMBER} attached${twilioSid ? ` (${twilioSid})` : " (twilio sid not found)"}`);
}

// ── 10. Launch (the DB trigger re-validates the whole setup) ────────
{
  const { error } = await db.from("businesses").update({ status: "live" }).eq("id", businessId);
  if (error) die("launch business (setup gate rejected it)", error);
}
console.log("✓ business is LIVE");

console.log(`\n✅ Demo ready. Call ${DEMO_NUMBER} — the AI should answer as "${BIZ_NAME}".`);
console.log("   First call provisions the Retell agent, so give it a few extra seconds.\n");
