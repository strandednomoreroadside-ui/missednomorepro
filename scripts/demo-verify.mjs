// Read-only health check for the PUBLIC DEMO line (+14406442423).
// Walks the exact path an inbound call takes, then — once a first call has
// provisioned the Retell agent — pulls the LIVE prompt back from Retell so we
// can prove what the AI was actually told.
// Run: node scripts/demo-verify.mjs
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}

const DEMO_NUMBER = "+14406442423";
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const ok = (m) => console.log(`  ✓ ${m}`);
const bad = (m) => console.log(`  ✗ ${m}`);
const warn = (m) => console.log(`  ! ${m}`);

console.log(`\n=== Demo line check: ${DEMO_NUMBER} ===\n`);

// 1) Number → business (what the Twilio voice route resolves first).
const { data: num } = await db
  .from("phone_numbers")
  .select("tenant_id, business_id, voice_enabled, twilio_sid")
  .eq("phone_number", DEMO_NUMBER)
  .maybeSingle();
if (!num) { bad("no phone_numbers row — callers hear 'unconfigured'"); process.exit(1); }
num.voice_enabled ? ok("number row present, voice enabled") : bad("voice_enabled is false");

const { data: biz } = await db
  .from("businesses")
  .select("id, name, industry, status, ai_enabled, timezone, tenant_id")
  .eq("id", num.business_id)
  .maybeSingle();
if (!biz) { bad("number points at no business"); process.exit(1); }
console.log(`  business: ${biz.name} (${biz.industry})`);
biz.status === "live" ? ok("status = live") : bad(`status = ${biz.status} — AI will NOT answer`);
biz.ai_enabled ? ok("ai_enabled = true") : bad("ai_enabled = false — calls forward instead");

// Isolation: the demo must not share a tenant with a real business.
const { data: siblings } = await db
  .from("businesses")
  .select("name")
  .eq("tenant_id", biz.tenant_id)
  .neq("id", biz.id);
(siblings ?? []).length === 0
  ? ok("isolated tenant — demo calls can't touch a real business")
  : warn(`tenant also holds: ${siblings.map((s) => s.name).join(", ")}`);

// 2) Cost controls.
const { data: sub } = await db
  .from("subscriptions")
  .select("plan, status, daily_spend_cap_cents, overage_enabled")
  .eq("tenant_id", biz.tenant_id)
  .maybeSingle();
if (!sub) bad("no subscription — voiceAllowed would treat this as plan 'none'");
else {
  const { data: limits } = await db
    .from("plan_limits").select("monthly_minutes").eq("plan", sub.plan).maybeSingle();
  ok(`plan ${sub.plan} (${sub.status}), ${limits?.monthly_minutes ?? "?"} min/mo`);
  sub.status === "trialing"
    ? warn("status 'trialing' forces the 30-min trial cap — use 'active' for a demo")
    : ok("not on the trial cap");
  const cap = sub.daily_spend_cap_cents;
  cap > 0 ? ok(`daily spend cap $${(cap / 100).toFixed(2)}`) : warn("no daily spend cap set");
}
const since = new Date(); since.setUTCHours(0, 0, 0, 0);
const { data: today } = await db
  .from("calls").select("cost_estimate").eq("tenant_id", biz.tenant_id).gte("created_at", since.toISOString());
const spent = (today ?? []).reduce((s, r) => s + Number(r.cost_estimate ?? 0), 0);
console.log(`  spent today: $${spent.toFixed(2)} across ${(today ?? []).length} calls`);

// 3) Knowledge the AI speaks from.
for (const [table, label] of [["services", "services"], ["faqs", "FAQs"], ["service_areas", "service areas"]]) {
  const { count } = await db
    .from(table).select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("active", true);
  (count ?? 0) > 0 ? ok(`${count} active ${label}`) : bad(`no active ${label}`);
}
const { data: staff } = await db
  .from("staff_contacts").select("name, phone").eq("business_id", biz.id).eq("notify_on_lead", true);
(staff ?? []).length
  ? ok(`lead alerts → ${staff.map((s) => s.phone).join(", ")} (also the warm-transfer target)`)
  : warn("no notify_on_lead staff — no lead texts, no human transfer");

// 4) Quoting (exact prices, computed server-side — never by the model).
const { data: ps } = await db
  .from("pricing_settings")
  .select("approved_at, base_lat, base_lng, max_service_miles")
  .eq("business_id", biz.id).maybeSingle();
const { count: zones } = await db
  .from("pricing_zones").select("id", { count: "exact", head: true }).eq("business_id", biz.id);
const { count: priced } = await db
  .from("service_pricing").select("id", { count: "exact", head: true }).eq("business_id", biz.id).eq("active", true);
const quoting = Boolean(ps?.approved_at && ps.base_lat && zones && priced);
quoting
  ? ok(`quoting ON — ${priced} priced services, ${zones} zone(s), ${ps.max_service_miles}mi radius`)
  : warn("quoting OFF — AI will say the owner texts a quote");

// 5) Booking (needs a connected Google Calendar).
const { data: cal } = await db
  .from("calendar_connections").select("id").eq("business_id", biz.id).maybeSingle();
cal ? ok("calendar connected — AI can book") : warn("no calendar — AI takes details instead of booking");

// 6) The live prompt, straight from Retell (proves what the AI was told).
const { data: agent } = await db
  .from("agents").select("provider_agent_id, provider_llm_id, voice_id, last_synced_at")
  .eq("business_id", biz.id).maybeSingle();
if (!agent?.provider_llm_id) {
  warn("agent not provisioned yet — place the first call, then re-run this");
} else {
  ok(`agent synced ${agent.last_synced_at ?? ""} · voice ${agent.voice_id}`);
  const key = process.env.RETELL_API_KEY;
  if (!key) { warn("RETELL_API_KEY not set locally — skipping prompt pull"); }
  else {
    const res = await fetch(`https://api.retellai.com/get-retell-llm/${agent.provider_llm_id}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (!res.ok) warn(`Retell fetch failed HTTP ${res.status}`);
    else {
      const llm = await res.json();
      const prompt = llm.general_prompt ?? "";
      console.log(`\n  --- live prompt checks (${prompt.length} chars) ---`);
      /year, make, and model/i.test(prompt)
        ? bad("prompt STILL asks for vehicle year/make/model — wrong for a home trade")
        : ok("no vehicle question (correct for a home trade)");
      /tow/i.test(prompt) ? warn("prompt mentions towing") : ok("no towing language");
      prompt.includes(biz.name) ? ok(`introduces itself as "${biz.name}"`) : bad("business name missing");
      /calculate_quote/.test(prompt) === quoting
        ? ok(`quoting instructions match quoting=${quoting}`)
        : warn("quoting instructions disagree with the pricing config");
      const tools = (llm.general_tools ?? []).map((t) => t.name);
      ok(`${tools.length} tools wired: ${tools.join(", ")}`);
    }
  }
}

console.log(`\nCall ${DEMO_NUMBER} to test. Re-run this after the call for the prompt checks.\n`);
