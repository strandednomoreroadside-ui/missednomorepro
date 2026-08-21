// Stand up the PUBLIC DEMO business — the "call this number and hear the AI"
// line that the whole marketing funnel points at (marketing/README.md).
//
// Why a separate org: a demo line is called by strangers. Isolating it means
// demo calls never touch the real business's CRM, usage, minutes, or billing,
// and it gets its own hard daily spend cap. The operator is added as owner so
// it's visible via the org switcher (their real org stays the default — the
// app falls back to the FIRST membership by created_at).
//
// Idempotent: re-running updates in place rather than duplicating. This file
// is the SOURCE OF TRUTH for the demo tenant, so a run overwrites anything
// hand-edited in the dashboard for it. Dry run by default, like
// redteam-cleanup.mjs:
//
//   node scripts/seed-demo-business.mjs             # show what would change
//   node scripts/seed-demo-business.mjs --confirm   # actually apply it
//
// Then: node scripts/demo-verify.mjs
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

// The catalog a demo caller can ask about. Summit is a full home-services
// shop — HVAC, plumbing, and electrical — so a prospect testing the line can
// ask about whatever trade they're actually in and still hear a real quote.
//
// Naming rules that matter (see matchService in voice/tools/handlers.ts): the
// caller's words are matched against these names, so each one is SHORT and
// canonical, and no name is a substring of another (a nested name like
// "Drain Cleaning" inside "Main Line Drain Cleaning" would silently match the
// cheaper row first).
const SERVICES = [
  // ── HVAC ──
  ["AC Repair", "Diagnose and repair air conditioning that isn't cooling, won't turn on, or is making noise."],
  ["Furnace Repair", "Diagnose and repair a furnace that won't start, short cycles, or won't hold temperature."],
  ["Heat Pump Repair", "Diagnose and repair heat pumps that aren't heating or cooling properly."],
  ["AC Tune Up", "Seasonal air-conditioning maintenance to keep the system efficient and catch problems early."],
  ["Furnace Tune Up", "Seasonal heating maintenance, including a safety and carbon-monoxide check."],
  ["Thermostat Installation", "Install and configure a new programmable or smart thermostat."],
  ["Duct Repair", "Seal and repair leaking, disconnected, or damaged ductwork."],
  // ── Plumbing ──
  ["Drain Cleaning", "Clear a slow or fully clogged sink, tub, shower, or floor drain."],
  ["Main Line Hydro Jetting", "High-pressure cleaning of a main sewer line for repeat clogs and root intrusion."],
  ["Water Heater Repair", "Repair for no hot water, leaks, pilot light, thermostat, and heating-element problems."],
  ["Toilet Repair", "Fix a running, clogged, or leaking toilet."],
  ["Faucet Installation", "Install a new kitchen, bathroom, or tub faucet."],
  ["Garbage Disposal Replacement", "Replace a jammed, humming, or leaking disposal using the existing connections."],
  ["Sump Pump Replacement", "Replace a failed or failing sump pump before the next heavy rain."],
  ["Leak Detection", "Locate a hidden water leak under a sink, behind a wall, or beneath a slab."],
  ["Pipe Repair", "Repair a burst, cracked, or frozen water line."],
  // ── Electrical ──
  ["Outlet Installation", "Install or replace an interior, exterior, or GFCI outlet."],
  ["Ceiling Fan Installation", "Mount and wire a new ceiling fan, including replacing an existing fixture."],
  ["Light Fixture Installation", "Install a new interior or exterior light fixture."],
  ["Circuit Breaker Replacement", "Replace a tripping, worn, or failed breaker in an existing panel."],
  ["Electrical Troubleshooting", "Track down dead outlets, flickering lights, and repeat breaker trips."],
];

// Flat, all-in labor pricing so a quote reads back as one clean number, which
// is what the FAQ ("flat, all-in rate quoted before we start") promises.
// Figures are mid-range against 2026 national cost guides, nudged slightly
// under the national average for the Cleveland market. Deliberately absent:
// full system replacements (AC, furnace, electrical panel), which the FAQ
// sends to a free in-home assessment — a real shop can't flat-rate those, and
// pretending to would make the demo LESS believable, not more.
//
// `variable_part` is for jobs where the fee is labor and the customer's chosen
// hardware is extra: the AI quotes the exact labor total and discloses "plus
// the cost of the {part}, confirmed before dispatch" — never guessing at it.
const PRICING = [
  // ── HVAC ── (repairs $150–$650; AC avg ~$319, furnace avg ~$268)
  { name: "AC Repair", service_fee: 249 },
  { name: "Furnace Repair", service_fee: 239 },
  { name: "Heat Pump Repair", service_fee: 269 },
  { name: "AC Tune Up", service_fee: 119 },          // guides: $89–$179
  { name: "Furnace Tune Up", service_fee: 119 },     // guides: $75–$200
  { name: "Thermostat Installation", service_fee: 129, variable_part: "thermostat" },
  { name: "Duct Repair", service_fee: 299 },
  // ── Plumbing ──
  { name: "Drain Cleaning", service_fee: 189 },      // guides: $150–$400
  { name: "Main Line Hydro Jetting", service_fee: 449 }, // guides: $350–$1,000
  { name: "Water Heater Repair", service_fee: 279 }, // guides: $150–$750
  { name: "Toilet Repair", service_fee: 179 },       // guides: $130–$310
  { name: "Faucet Installation", service_fee: 159, variable_part: "faucet" },
  { name: "Garbage Disposal Replacement", service_fee: 229, variable_part: "disposal" },
  { name: "Sump Pump Replacement", service_fee: 349, variable_part: "pump" },
  { name: "Leak Detection", service_fee: 199 },
  { name: "Pipe Repair", service_fee: 329 },
  // ── Electrical ──
  { name: "Outlet Installation", service_fee: 189 }, // guides: $100–$450
  { name: "Ceiling Fan Installation", service_fee: 229 }, // guides: $150–$500
  { name: "Light Fixture Installation", service_fee: 169 },
  { name: "Circuit Breaker Replacement", service_fee: 249 }, // guides: $100–$400
  { name: "Electrical Troubleshooting", service_fee: 179 },
];

// Distance-banded trip charge, on top of the flat service fee. This is what
// makes the demo undeniably LIVE rather than a memorized script: the same
// service quoted from Lakewood and from Akron comes back as two different
// totals, because the engine did a real driving-distance lookup. Zone 1 is
// free, which is how most shops treat their core service area.
const ZONES = [
  { zone_number: 1, min_miles: 0, max_miles: 20, dispatch_fee: 0 },
  { zone_number: 2, min_miles: 20, max_miles: 40, dispatch_fee: 29 },
  { zone_number: 3, min_miles: 40, max_miles: SERVICE_RADIUS_MILES, dispatch_fee: 59 },
];

// auto_time surcharges are added by the engine when the call lands in the
// window; conditional ones are only MENTIONED ("may add"), never added.
// The after-hours fee replaces the old "Emergency After-Hours Service" line
// item — as a surcharge it applies to whatever the caller actually needs,
// instead of being a separate service that would double-charge if quoted
// alongside the real one. Call the demo line after 7 PM and you hear it.
const SURCHARGES = [
  { name: "After-hours service", amount: 99, apply_type: "auto_time", window_start: "19:00", window_end: "07:00" },
  { name: "Crawl space or attic access", amount: 45, apply_type: "conditional", window_start: null, window_end: null },
  { name: "A city permit if one is required", amount: 95, apply_type: "conditional", window_start: null, window_end: null },
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
//
// ORDER MATTERS. prompt.ts inlines only the first MAX_INLINE_FAQS (20) into
// the system prompt and leaves the rest to search_knowledge_base, and it takes
// them in created_at order — which a bulk insert would make a coin flip, since
// every row lands on the same now(). The insert below stamps created_at from
// this array's index so the ordering is deterministic and the 20 that matter
// most on a demo call are always the ones the AI knows by heart.
const FAQS = [
  ["What kind of work do you do?", "We're a full home-services company covering three trades: heating and cooling, plumbing, and electrical. That means one call for an AC or furnace repair, a clogged drain or water heater, or an outlet, ceiling fan, or breaker problem."],
  // The honesty answer, kept high in the list so it is always inlined. See
  // DEMO_AI_NOTES below for the proactive side of this.
  ["Is this a real company? Can I actually hire you?", "I should be straight with you: Summit Home Services is a sample company we use to demonstrate Missed No More Pro, an A I receptionist for home service businesses. Everything you're hearing is the real product running live, including the prices, but there's no technician for me to send. If you need actual service today, please call a licensed contractor in your area. And if you run a home service business and you'd like this answering your phones, take a look at missed no more pro dot com."],
  ["Are you licensed and insured?", "Yes. We're fully licensed, bonded, and insured, and every technician is background-checked before they ever come to your home."],
  ["How soon can someone come out?", "In most cases we can get a technician out same day or next day. If it's an emergency, we'll get someone moving right away and the team will confirm your arrival window by text."],
  ["Do you offer emergency service?", "Yes, we offer emergency service around the clock, including nights, weekends, and holidays. Calls outside normal hours include an after-hours fee, and that's already built into the exact total we quote you, so there's no surprise on the invoice."],
  ["Do you charge for estimates or a service call?", "Our repair pricing is a flat, all-in rate quoted before we start, so there are no surprise add-ons. There's no trip charge inside our core Cleveland-area service zone; farther out, a small travel fee is included in the total we quote you. For a full system replacement, the in-home assessment and written quote are free."],
  ["What areas do you serve?", "We serve the greater Cleveland area and surrounding communities within about 75 miles, including Parma, Lakewood, Strongsville, Westlake, Brook Park, Independence, and Beachwood."],
  ["Do you do electrical work?", "Yes. We have licensed electricians on staff for outlets, ceiling fans, light fixtures, breakers, and troubleshooting things like flickering lights or a breaker that keeps tripping. Full panel replacements are quoted after a free in-home assessment."],
  ["What brands do you work on?", "We service all major residential heating, cooling, plumbing, and electrical brands, including Carrier, Trane, Lennox, Goodman, Rheem, Bradford White, A.O. Smith, Square D, and Eaton."],
  ["Do you warranty your work?", "Yes. Our workmanship is guaranteed for one year, and any parts we install carry the manufacturer's warranty on top of that."],
  ["How long does a typical repair take?", "Most standard repairs are finished in about one to two hours. If a part has to be ordered, we'll tell you up front and schedule the return visit before we leave."],
  ["Do I need to be home for the appointment?", "Yes, we need an adult on site to let the technician in, approve the work, and go over what was found when the job is done."],
  ["What payment methods do you accept?", "We accept all major credit cards, debit, check, and cash. Payment is collected by the technician after the work is complete, never over the phone."],
  ["How much does a new AC or furnace cost?", "A full system replacement is quoted after a free in-home assessment, because the price depends on the size and efficiency of the system you choose. We'll put an exact number in writing before any work starts."],
  ["Do you offer maintenance plans?", "Yes. Our maintenance plan covers two seasonal tune-ups a year, priority scheduling, and a discount on repairs. The team can go over the details with you."],
  ["How often should I service my furnace or AC?", "We recommend a tune-up twice a year, heating in the fall and cooling in the spring. Regular maintenance is the cheapest way to avoid a breakdown in the middle of a heat wave or a cold snap."],
  ["My AC is blowing warm air. What's wrong?", "That's usually a refrigerant issue, a dirty coil, or a failing compressor, but it needs eyes on it to know for sure. Try setting the thermostat to cool and checking that the outdoor unit is running, and we'll get a technician out to diagnose it properly."],
  ["What should I do if I smell gas?", "Leave the house right away and take everyone with you. Don't flip any light switches, don't use your phone inside, and don't try to find the leak yourself. Once you're safely outside, call 911 or your gas utility's emergency line first, then call us and we'll get a technician out."],
  ["Do you work weekends?", "Yes. We're open Saturdays, and we take emergency calls seven days a week, including Sundays and holidays."],
  ["Do you offer financing?", "Yes, we offer financing on system replacements and larger repairs, with several term options. The team will walk you through what you qualify for."],
  // ── Past the inline cap: still answered, via search_knowledge_base. ──
  ["How long have you been in business?", "We've been serving homeowners in the Cleveland area for over fifteen years."],
  ["Can I get a same-day appointment?", "Often, yes, especially if you call early in the day. Tell us what's going on and we'll find you the soonest opening we have."],
  ["Do you offer senior or military discounts?", "Yes, we offer a discount for seniors, active military, and veterans. Just mention it when the technician arrives."],
];

// Free-text prompt context (businesses.ai_notes, migration
// 20260725090000_business_ai_notes.sql). The FAQ above covers a caller who
// ASKS whether this is real; this covers the caller who never thinks to ask
// and simply starts behaving like a customer. Stay in character for the
// prospects — that's the whole point of the demo — but never let a real
// person walk away believing a technician is coming.
const DEMO_AI_NOTES = `This phone number is a public demonstration line for Missed No More Pro, an A I receptionist product. Summit Home Services is a realistic sample company, not a real business, and there are no technicians to send.

Almost every caller is a business owner trying the product out, so stay fully in character and give them the real experience: quote exact prices, capture their details, and handle the call the way you would for a real customer.

But never let anyone believe help is actually on the way. If a caller seems to genuinely need service rather than testing the product — they describe a real emergency, they ask when someone will arrive, they try to confirm an appointment, or they ask whether this is real — tell them warmly and plainly that this is a demonstration line, that Summit Home Services is a sample company, and that they should call a licensed local contractor for real help. Say that before the call ends.

Never say a technician is on the way, never give an arrival time, and never promise that a real person will call them back.`;

// ── Helpers ─────────────────────────────────────────────────────────
// This script REPLACES the demo business's services, pricing, zones,
// surcharges, hours, areas and FAQs — it is the source of truth for that
// tenant, so anything hand-edited in /dashboard/pricing or /dashboard/faqs is
// discarded on a run. That is correct for a seeded demo and disastrous by
// accident, so it follows the same convention as redteam-cleanup.mjs: dry run
// by default, and nothing is written without --confirm.
const CONFIRM = process.argv.includes("--confirm");

function die(step, error) {
  console.error(`\n✗ ${step}: ${error?.message ?? error}`);
  process.exit(1);
}

const plan = (msg) => console.log(`  · would ${msg}`);
const done = (msg) => console.log(`  ✓ ${msg}`);

/** Replace every row this seed owns for the business (delete + insert). */
async function replaceAll(table, rows, label) {
  const { count } = await db
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId);
  const existing = count ?? 0;
  if (!CONFIRM) {
    plan(
      `replace ${existing} existing ${label} with the ${rows.length} in this file` +
        (existing > rows.length ? "  ← net loss of rows, check this is intended" : "")
    );
    return;
  }
  const { error: delErr } = await db.from(table).delete().eq("business_id", businessId);
  if (delErr) die(`clear ${label}`, delErr);
  const { error } = await db.from(table).insert(rows);
  if (error) die(`insert ${label}`, error);
  done(`${rows.length} ${label} (replaced ${existing})`);
}

/** Update the one matching row, or create it. */
async function upsertOne(table, filter, row, label) {
  let q = db.from(table).select("id");
  for (const [col, val] of Object.entries(filter)) q = q.eq(col, val);
  const { data: existing } = await q.maybeSingle();
  if (!CONFIRM) {
    plan(`${existing ? "update" : "create"} ${label}`);
    return;
  }
  const { error } = existing
    ? await db.from(table).update(row).eq("id", existing.id)
    : await db.from(table).insert(row);
  if (error) die(label, error);
  done(`${label} ${existing ? "updated" : "created"}`);
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

console.log(
  CONFIRM
    ? "=== Seeding the public demo business (APPLYING CHANGES) ===\n"
    : "=== Seeding the public demo business — DRY RUN ===\n" +
        "    Nothing is written. Re-run with --confirm to apply.\n"
);

// ── 1. Organization ─────────────────────────────────────────────────
let { data: org } = await db.from("organizations").select("id").eq("name", ORG_NAME).maybeSingle();
if (!org) {
  if (!CONFIRM) {
    console.log(`  · would create the "${ORG_NAME}" organization and everything under it.`);
    console.log("\nThe demo tenant doesn't exist yet, so there's nothing else to compare against.");
    console.log("Re-run with --confirm to build it.\n");
    process.exit(0);
  }
  const { data, error } = await db
    .from("organizations")
    // founder_excluded: a demo tenant must never consume a real founder slot.
    .insert({ name: ORG_NAME, plan: PLAN, status: "active", founder_excluded: true })
    .select("id")
    .single();
  if (error) die("create organization", error);
  org = data;
  done(`organization created (${org.id})`);
} else {
  if (CONFIRM) {
    await db.from("organizations").update({ plan: PLAN, founder_excluded: true }).eq("id", org.id);
  }
  done(`organization exists (${org.id})`);
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
  if (!CONFIRM) plan(`add ${OWNER_EMAIL} as owner`);
  else {
    const { error } = await db
      .from("organization_members")
      .insert({ organization_id: tenantId, user_id: owner.id, role: "owner" });
    if (error) die("add owner membership", error);
    done(`owner membership (${OWNER_EMAIL})`);
  }
} else {
  done(`owner membership (${OWNER_EMAIL})`);
}

// ── 3. Business ─────────────────────────────────────────────────────
let { data: biz } = await db
  .from("businesses")
  .select("id, status")
  .eq("tenant_id", tenantId)
  .eq("name", BIZ_NAME)
  .maybeSingle();
if (!biz) {
  if (!CONFIRM) {
    console.log(`  · would create the "${BIZ_NAME}" business and everything under it.`);
    console.log("\nRe-run with --confirm to build it.\n");
    process.exit(0);
  }
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
  done(`business created (${biz.id})`);
} else {
  done(`business exists (${biz.id})`);
}
const businessId = biz.id;
const scope = { tenant_id: tenantId, business_id: businessId };

// Business-level flags, applied together:
//  * transfer OFF — this is a public line, so a stranger asking "can I talk to
//    a person?" must not ring the owner's cell. The AI takes a detailed
//    message and the staff alert text still fires, so no lead is lost.
//    (migration 20260724090000_transfer_target.sql)
//  * ai_notes — the demo-honesty instruction, see DEMO_AI_NOTES above.
//    (migration 20260725090000_business_ai_notes.sql)
if (!CONFIRM) {
  plan("set industry/phone/address/timezone, AI on, live transfer OFF, and the demo-honesty AI notes");
} else {
  const patch = {
    industry: INDUSTRY,
    phone: DEMO_NUMBER,
    address: BASE_ADDRESS,
    timezone: TIMEZONE,
    ai_enabled: true,
    transfer_enabled: false,
    ai_notes: DEMO_AI_NOTES,
  };
  const { error } = await db.from("businesses").update(patch).eq("id", businessId);
  if (error) {
    // Both flags come from recent migrations; say which one is missing rather
    // than failing the whole seed over a column that isn't there yet.
    console.log(`  ! business flags not fully applied (${error.message})`);
    console.log("    apply 20260724090000_transfer_target.sql + 20260725090000_business_ai_notes.sql");
  } else {
    done("live transfer OFF, demo-honesty AI notes set (lead alert texts unaffected)");
  }
}

// ── 4. Services / hours / areas / staff / SMS ───────────────────────
await replaceAll(
  "services",
  SERVICES.map(([name, description]) => ({ ...scope, name, description, active: true })),
  "services"
);
await replaceAll("business_hours", HOURS.map((h) => ({ ...scope, ...h })), "business-hour rows");
await replaceAll(
  "service_areas",
  AREAS.map((city) => ({ ...scope, type: "city", city, state: "OH", active: true })),
  "service-area cities"
);
await replaceAll(
  "staff_contacts",
  [{ ...scope, name: STAFF_NAME, phone: STAFF_PHONE, notify_on_lead: true }],
  `staff contacts (lead alerts → ${STAFF_PHONE})`
);

await upsertOne(
  "sms_settings",
  { business_id: businessId },
  {
    ...scope,
    ask_consent_on_call: true,
    consent_script:
      "Is it okay if we text you updates about your service request? Reply STOP anytime to opt out.",
    transactional_only: false,
    text_back_enabled: true,
    // In character, but it names itself as a demo — a prospect who hangs up
    // gets to SEE the missed-call text-back fire (one of the best moments in
    // the whole demo) without a real homeowner being left expecting a call.
    text_back_template:
      "Thanks for calling Summit Home Services! Sorry we missed you — reply here and we'll help. " +
      "Heads up: Summit is a demo company for Missed No More Pro, so this is a sample of the text your business would send.",
    // OFF, and this one matters. notify_staff with high/emergency urgency fires
    // dispatchEtaToCustomer, which opens a job and texts the caller "we're on
    // the way, arriving in about 60 minutes". On a public demo line that is a
    // promise to a stranger that nobody will keep. The AI still captures the
    // lead and still alerts staff — only the false arrival promise is gone.
    dispatch_confirmation_enabled: false,
  },
  "SMS settings (text-back on, dispatch ETA OFF)"
);

// ── 5. FAQ knowledge base ───────────────────────────────────────────
// created_at is stamped from the array index so prompt.ts's "first 20 inline"
// cut is deterministic — see the note on FAQS above.
const faqBase = Date.now();
await replaceAll(
  "faqs",
  FAQS.map(([question, answer], i) => ({
    ...scope,
    question,
    answer,
    active: true,
    created_at: new Date(faqBase + i).toISOString(),
  })),
  "FAQs"
);

// ── 6. Pricing engine (exact quotes, computed server-side) ──────────
const base = await geocode(BASE_ADDRESS);
await upsertOne(
  "pricing_settings",
  { business_id: businessId },
  {
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
  },
  `pricing settings (base ${base ? `geocoded ${base.lat.toFixed(3)}, ${base.lng.toFixed(3)}` : "NOT geocoded — quoting stays off"})`
);

await replaceAll("pricing_zones", ZONES.map((z) => ({ ...scope, ...z, active: true })), "pricing zones");
// NOTE: a PostgREST bulk insert unions the keys across all rows and sends null
// for any a given row is missing, so every column a row might set has to be
// either present on every row or safe as null. `free_miles` is pinned here for
// that reason; `variable_part` is absent on most rows, where null is right.
await replaceAll(
  "service_pricing",
  PRICING.map((p) => ({ ...scope, pricing_type: "flat", free_miles: 0, active: true, ...p })),
  "priced services"
);
await replaceAll(
  "pricing_surcharges",
  SURCHARGES.map((x) => ({ ...scope, ...x, active: true })),
  "surcharges"
);

// ── 7. Setup approvals (the launch gate reads these) ────────────────
{
  const now = new Date().toISOString();
  await upsertOne(
    "setup_states",
    { business_id: businessId },
    { ...scope, hours_approved_at: now, area_approved_at: now, current_step: "launch" },
    "setup approvals"
  );
}

// ── 8. Comped subscription with a hard daily spend cap ──────────────
await upsertOne(
  "subscriptions",
  { tenant_id: tenantId },
  {
    tenant_id: tenantId,
    plan: PLAN,
    status: "active", // NOT "trialing" — that would force the 30-min trial cap.
    billing_interval: "month",
    overage_enabled: false,
    daily_spend_cap_cents: DAILY_SPEND_CAP_CENTS,
  },
  `comped ${PLAN} plan, $${(DAILY_SPEND_CAP_CENTS / 100).toFixed(2)}/day hard cap`
);

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
    // This one writes to Twilio, so it waits for --confirm like everything else.
    if (twilioSid && mgSid) {
      if (!CONFIRM) {
        plan("attach the number to the approved A2P messaging service");
      } else {
        const att = await fetch(`https://messaging.twilio.com/v1/Services/${mgSid}/PhoneNumbers`, {
          method: "POST",
          headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ PhoneNumberSid: twilioSid }),
        });
        // 409 = already attached, which is success for our purposes.
        a2pAttached = att.ok || att.status === 409;
        console.log(
          `  a2p messaging service: ${a2pAttached ? "attached" : `FAILED (HTTP ${att.status}) — texts will be dropped`}`
        );
      }
    }
  }
  await upsertOne(
    "phone_numbers",
    { phone_number: DEMO_NUMBER },
    {
      ...scope,
      phone_number: DEMO_NUMBER,
      twilio_sid: twilioSid,
      type: "local",
      a2p_status: a2pAttached ? "approved" : "pending",
      voice_enabled: true,
      sms_enabled: true,
    },
    `${DEMO_NUMBER} attached${twilioSid ? ` (${twilioSid})` : " (twilio sid not found)"}`
  );
}

// ── 10. Launch (the DB trigger re-validates the whole setup) ────────
if (!CONFIRM) {
  plan("mark the business LIVE (the DB setup gate re-validates everything)");
} else {
  const { error } = await db.from("businesses").update({ status: "live" }).eq("id", businessId);
  if (error) die("launch business (setup gate rejected it)", error);
  done("business is LIVE");
}

if (!CONFIRM) {
  console.log("\nDry run only — nothing was written.");
  console.log("Review the list above, then re-run with --confirm to apply.\n");
} else {
  console.log(`\n✅ Demo ready. Call ${DEMO_NUMBER} — the AI should answer as "${BIZ_NAME}".`);
  console.log("   First call provisions the Retell agent, so give it a few extra seconds.");
  console.log("   Then: node scripts/demo-verify.mjs\n");
}
