// Points the Twilio number's voice webhooks at the deployed app
// (BUILD_GUIDE M6 — "or do it via the API"). Idempotent; rerun anytime.
//   node scripts/twilio-setup.mjs            → https://missednomorepro.com
//   node scripts/twilio-setup.mjs --url URL  → custom target (e.g. a preview)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const SID = env.TWILIO_ACCOUNT_SID;
const TOKEN = env.TWILIO_AUTH_TOKEN;
const NUMBER = env.TWILIO_PHONE_NUMBER;
if (!SID || !TOKEN || !NUMBER) {
  console.error("Missing TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_PHONE_NUMBER in .env.local");
  process.exit(1);
}

const urlFlag = process.argv.indexOf("--url");
const APP_URL = (urlFlag !== -1 ? process.argv[urlFlag + 1] : "https://missednomorepro.com").replace(/\/$/, "");

const auth = "Basic " + Buffer.from(`${SID}:${TOKEN}`).toString("base64");
const api = `https://api.twilio.com/2010-04-01/Accounts/${SID}`;

// 1. Find the number.
const lookup = await fetch(
  `${api}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(NUMBER)}`,
  { headers: { Authorization: auth } }
);
if (!lookup.ok) {
  console.error(`Twilio lookup failed: HTTP ${lookup.status} — ${await lookup.text()}`);
  process.exit(1);
}
const { incoming_phone_numbers: numbers } = await lookup.json();
if (!numbers?.length) {
  console.error(`No Twilio number matching ${NUMBER} found on this account.`);
  process.exit(1);
}
const num = numbers[0];
console.log(`Found ${num.phone_number} (${num.sid})`);
console.log(`  current voice url: ${num.voice_url || "(none)"}`);

// 2. Point its webhooks at the app.
const update = await fetch(`${api}/IncomingPhoneNumbers/${num.sid}.json`, {
  method: "POST",
  headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
  body: new URLSearchParams({
    VoiceUrl: `${APP_URL}/api/twilio/voice`,
    VoiceMethod: "POST",
    StatusCallback: `${APP_URL}/api/twilio/voice/status`,
    StatusCallbackMethod: "POST",
  }),
});
if (!update.ok) {
  console.error(`Twilio update failed: HTTP ${update.status} — ${await update.text()}`);
  process.exit(1);
}
const updated = await update.json();
console.log(`\n✅ Webhooks configured:`);
console.log(`  voice url:       ${updated.voice_url}`);
console.log(`  status callback: ${updated.status_callback}`);
console.log(`\nCall ${updated.phone_number} to hear the greeting.`);
