// Point an already-owned Twilio number's webhooks at the app so the AI
// answers it, and backfill its twilio_sid in our DB.
// Usage: node scripts/activate-number.mjs +14405787667 [--url https://missednomorepro.com]
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try { process.loadEnvFile(".env.local"); } catch {}

const NUMBER = process.argv[2];
if (!NUMBER || !NUMBER.startsWith("+")) {
  console.error("Usage: node scripts/activate-number.mjs +1XXXXXXXXXX");
  process.exit(1);
}
const urlFlag = process.argv.indexOf("--url");
const APP_URL = (urlFlag !== -1 ? process.argv[urlFlag + 1] : "https://missednomorepro.com").replace(/\/$/, "");

const SID = process.env.TWILIO_ACCOUNT_SID;
const TOKEN = process.env.TWILIO_AUTH_TOKEN;
const MGSID = process.env.TWILIO_MESSAGING_SERVICE_SID;
const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
const api = `https://api.twilio.com/2010-04-01/Accounts/${SID}`;

// 1) Find the number on Twilio.
const lk = await fetch(`${api}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(NUMBER)}`, {
  headers: { Authorization: auth },
});
const { incoming_phone_numbers: nums } = await lk.json();
if (!nums?.length) {
  console.error(`✗ ${NUMBER} is not owned on this Twilio account.`);
  process.exit(1);
}
const num = nums[0];
console.log(`Found ${num.phone_number} (${num.sid})`);
console.log(`  before → voice: ${num.voice_url || "(none)"}`);

// 2) Point its webhooks at the app.
const up = await fetch(`${api}/IncomingPhoneNumbers/${num.sid}.json`, {
  method: "POST",
  headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    VoiceUrl: `${APP_URL}/api/twilio/voice`,
    VoiceMethod: "POST",
    StatusCallback: `${APP_URL}/api/twilio/voice/status`,
    StatusCallbackMethod: "POST",
    SmsUrl: `${APP_URL}/api/twilio/sms`,
    SmsMethod: "POST",
  }),
});
if (!up.ok) {
  console.error(`✗ Twilio update failed HTTP ${up.status}: ${await up.text()}`);
  process.exit(1);
}
const updated = await up.json();
console.log(`  after  → voice: ${updated.voice_url}`);
console.log(`           sms:   ${updated.sms_url}`);
console.log(`           status:${updated.status_callback}`);

// 3) Attach to the A2P Messaging Service (best-effort) so outbound SMS rides
//    the approved 10DLC campaign + inbound STOP/HELP reaches us.
if (MGSID) {
  const msRes = await fetch(`https://messaging.twilio.com/v1/Services/${MGSID}/PhoneNumbers`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ PhoneNumberSid: num.sid }),
  });
  console.log(`  messaging service attach: ${msRes.ok ? "ok" : `(already attached / HTTP ${msRes.status})`}`);
}

// 4) Backfill twilio_sid + ensure voice/sms enabled in our DB.
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});
const { error } = await db
  .from("phone_numbers")
  .update({ twilio_sid: num.sid, voice_enabled: true, sms_enabled: true })
  .eq("phone_number", NUMBER);
console.log(`  db row updated: ${error ? error.message : "ok (twilio_sid stored, voice+sms on)"}`);

console.log(`\n✅ ${NUMBER} is live. Call it — your AI should answer.`);
