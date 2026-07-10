// Read-only: what's the state of a specific number, on BOTH Twilio and our DB?
// Usage: node scripts/number-activate-diagnose.mjs +14405787667
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}

const NUMBER = process.argv[2] || "+14405787667";
const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");

console.log(`\n=== Number activation diagnose: ${NUMBER} ===\n`);

// 1) Twilio ownership + current webhooks
const lk = await fetch(
  `https://api.twilio.com/2010-04-01/Accounts/${SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(NUMBER)}`,
  { headers: { Authorization: auth } }
);
if (!lk.ok) {
  console.log(`Twilio lookup HTTP ${lk.status}: ${await lk.text()}`);
} else {
  const { incoming_phone_numbers: nums } = await lk.json();
  if (!nums?.length) {
    console.log(`✗ NOT owned on this Twilio account (${NUMBER}).`);
  } else {
    const n = nums[0];
    console.log(`✓ Owned on Twilio — sid=${n.sid}`);
    console.log(`  voice_url:       ${n.voice_url || "(none)"}`);
    console.log(`  status_callback: ${n.status_callback || "(none)"}`);
    console.log(`  sms_url:         ${n.sms_url || "(none)"}`);
    console.log(`  capabilities:    voice=${n.capabilities?.voice} sms=${n.capabilities?.sms}`);
  }
}

// 2) DB row
const db = createClient(url, key, { auth: { persistSession: false } });
const { data: row } = await db
  .from("phone_numbers")
  .select("phone_number, tenant_id, business_id, voice_enabled, sms_enabled, a2p_status, twilio_sid")
  .eq("phone_number", NUMBER)
  .maybeSingle();
console.log(`\n  phone_numbers row:`);
if (!row) console.log(`    ✗ no row for ${NUMBER}`);
else {
  console.log(`    tenant_id=${row.tenant_id}`);
  console.log(`    business_id=${row.business_id}`);
  console.log(`    voice_enabled=${row.voice_enabled}  sms_enabled=${row.sms_enabled}  a2p=${row.a2p_status}`);
  console.log(`    twilio_sid=${row.twilio_sid || "(none stored)"}`);
  if (row.business_id) {
    const { data: b } = await db.from("businesses").select("name, status, ai_enabled, tenant_id").eq("id", row.business_id).maybeSingle();
    console.log(`    business: ${b?.name}  status=${b?.status}  ai_enabled=${b?.ai_enabled}`);
  }
}

// 3) All numbers on this tenant (if we found a row) so we see siblings
if (row?.tenant_id) {
  const { data: all } = await db
    .from("phone_numbers")
    .select("phone_number, voice_enabled, business_id")
    .eq("tenant_id", row.tenant_id);
  console.log(`\n  All numbers on this tenant (${all?.length}):`);
  for (const a of all ?? []) console.log(`    • ${a.phone_number}  voice=${a.voice_enabled}  business=${a.business_id ? "set" : "NULL"}`);
}
console.log("");
