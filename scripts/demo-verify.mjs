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

// 2b) A2P 10DLC. Twilio reports "sent" for an unregistered sender and the
// carrier drops it (error 30034), so our own logs look perfectly healthy while
// every confirmation text vanishes. Check the registration itself, and the
// real delivery status of what we've actually sent.
{
  const tw = process.env.TWILIO_ACCOUNT_SID;
  const tok = process.env.TWILIO_AUTH_TOKEN;
  const mg = process.env.TWILIO_MESSAGING_SERVICE_SID;
  if (!tw || !tok || !mg) warn("Twilio env not set locally — skipping A2P check");
  else {
    const auth = "Basic " + Buffer.from(`${tw}:${tok}`).toString("base64");
    const r = await fetch(`https://messaging.twilio.com/v1/Services/${mg}/PhoneNumbers?PageSize=50`, {
      headers: { Authorization: auth },
    });
    const nums = r.ok ? ((await r.json()).phone_numbers ?? []) : [];
    nums.some((p) => p.phone_number === DEMO_NUMBER)
      ? ok("on the approved A2P messaging service — texts can deliver")
      : bad("NOT on the A2P messaging service — every text will be dropped (error 30034)");

    const m = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${tw}/Messages.json?From=${encodeURIComponent(DEMO_NUMBER)}&PageSize=5`,
      { headers: { Authorization: auth } }
    );
    const sent = m.ok ? ((await m.json()).messages ?? []) : [];
    if (sent.length) {
      const dropped = sent.filter((x) => x.status === "undelivered" || x.status === "failed");
      dropped.length
        ? bad(`${dropped.length}/${sent.length} recent texts undelivered (err ${dropped[0].error_code})`)
        : ok(`last ${sent.length} texts delivered`);
    }
  }
}

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
const { data: pricedRows } = await db
  .from("service_pricing").select("name").eq("business_id", biz.id).eq("active", true);
const priced = pricedRows?.length ?? 0;
const quoting = Boolean(ps?.approved_at && ps.base_lat && zones && priced);
quoting
  ? ok(`quoting ON — ${priced} priced services, ${zones} zone(s), ${ps.max_service_miles}mi radius`)
  : warn("quoting OFF — AI will say the owner texts a quote");

// matchService (voice/tools/handlers.ts) matches the caller's words against
// these names by substring, first hit wins. If one name contains another, the
// nested one silently swallows every request for the longer one — so a caller
// asking for the pricier service would be quoted the cheaper one. Cheap to
// check, invisible until it bites on a live call.
{
  const names = (pricedRows ?? []).map((r) => r.name);
  const clashes = [];
  for (const a of names)
    for (const b of names)
      if (a !== b && a.toLowerCase().includes(b.toLowerCase())) clashes.push(`"${b}" swallows "${a}"`);
  clashes.length
    ? bad(`service-name collision — ${clashes.join("; ")}`)
    : ok("no service-name collisions (each service is reachable by name)");
}

// The engine adds auto_time surcharges on its own and only MENTIONS the
// conditional ones, so it's worth seeing which is which before a demo call.
{
  const { data: sur } = await db
    .from("pricing_surcharges").select("name, amount, apply_type, window_start, window_end")
    .eq("business_id", biz.id).eq("active", true);
  if (!sur?.length) warn("no surcharges configured");
  else
    for (const s of sur)
      ok(
        s.apply_type === "auto_time"
          ? `auto surcharge: ${s.name} +$${s.amount} between ${s.window_start} and ${s.window_end}`
          : `mentioned only: ${s.name} (+$${s.amount}, never auto-added)`
      );
}

// prompt.ts inlines only the first 20 FAQs (by created_at) into the system
// prompt and leaves the rest to search_knowledge_base, which is a slower and
// less certain path. The seed stamps created_at from its array order so this
// cut is deterministic — confirm the answers that matter landed inside it.
{
  const MAX_INLINE_FAQS = 20;
  const { data: faqRows } = await db
    .from("faqs").select("question").eq("business_id", biz.id).eq("active", true)
    .order("created_at", { ascending: true });
  const all = faqRows ?? [];
  const inline = all.slice(0, MAX_INLINE_FAQS);
  const overflow = all.slice(MAX_INLINE_FAQS);
  ok(`${all.length} active FAQs — ${inline.length} inlined in the prompt${overflow.length ? `, ${overflow.length} search-only` : ""}`);
  // The demo-honesty answer has to be one the AI knows by heart.
  const honesty = all.findIndex((f) => /real company|actually hire/i.test(f.question));
  if (honesty < 0) bad("no 'is this a real company' FAQ — the demo can't answer honestly if asked");
  else if (honesty >= MAX_INLINE_FAQS) bad(`the demo-honesty FAQ is #${honesty + 1}, past the inline cut — move it earlier`);
  else ok(`demo-honesty FAQ is inlined (#${honesty + 1})`);
  for (const f of overflow) console.log(`      search-only: ${f.question}`);
}

// The AI's free-text instructions (businesses.ai_notes) — for the demo line
// this is what stops a genuine caller believing a technician is coming.
{
  const { data: b, error } = await db
    .from("businesses").select("ai_notes, transfer_enabled").eq("id", biz.id).maybeSingle();
  if (error) warn(`can't read ai_notes — apply 20260821090000_business_ai_notes.sql (${error.message})`);
  else {
    b?.ai_notes
      ? ok(`AI notes set (${b.ai_notes.length} chars) — includes the demo disclosure`)
      : bad("no AI notes — the AI won't volunteer that this is a demo");
    b?.transfer_enabled === false
      ? ok("live transfer OFF — a stranger can't ring the owner's cell")
      : warn("live transfer is ON — demo callers asking for a human will ring the transfer number");
  }
}

// A public demo line must never text a stranger "we're on the way, ETA 60 min".
{
  const { data: sms, error } = await db
    .from("sms_settings").select("dispatch_confirmation_enabled, text_back_enabled")
    .eq("business_id", biz.id).maybeSingle();
  if (error) warn(`can't read dispatch settings (${error.message})`);
  else {
    sms?.dispatch_confirmation_enabled === false
      ? ok("dispatch ETA texts OFF — no false 'help is on the way' promise")
      : bad("dispatch ETA texts are ON — an urgent demo call will promise a stranger a technician");
    sms?.text_back_enabled ? ok("missed-call text-back on") : warn("missed-call text-back off");
  }
}

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
      // Word-bounded: a bare /tow/ matches "toward" and cries wolf.
      /\btow(s|ing|ed|truck)?\b|find_tow_destination/i.test(prompt)
        ? warn("prompt carries towing language")
        : ok("no towing language");
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
