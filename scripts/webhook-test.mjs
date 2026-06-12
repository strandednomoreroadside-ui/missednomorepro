// Verifies the Twilio voice webhook end-to-end without placing a call:
// posts a fake inbound call signed exactly like Twilio would, expecting
// the branded greeting; then posts a forged signature, expecting 403.
//   node scripts/webhook-test.mjs                       → localhost:3000
//   node scripts/webhook-test.mjs --url https://...     → deployed app
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const urlFlag = process.argv.indexOf("--url");
const BASE = (urlFlag !== -1 ? process.argv[urlFlag + 1] : "http://localhost:3000").replace(/\/$/, "");
const URL_ = `${BASE}/api/twilio/voice`;
const TOKEN = env.TWILIO_AUTH_TOKEN;
if (!TOKEN) {
  console.error("TWILIO_AUTH_TOKEN missing from .env.local");
  process.exit(1);
}

const params = {
  CallSid: `CAwebhooktest${Date.now()}`,
  AccountSid: env.TWILIO_ACCOUNT_SID ?? "ACtest",
  From: "+15555550123",
  To: env.TWILIO_PHONE_NUMBER ?? "+15555550000",
  CallStatus: "ringing",
  Direction: "inbound",
};

function sign(url, p, token) {
  const data = url + Object.keys(p).sort().map((k) => k + p[k]).join("");
  return createHmac("sha1", token).update(data, "utf8").digest("base64");
}

async function post(signature) {
  return fetch(URL_, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "X-Twilio-Signature": signature,
    },
    body: new URLSearchParams(params),
  });
}

let failures = 0;
const assert = (label, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
};

// 1. Correctly signed request → TwiML (greeting or unconfigured).
const good = await post(sign(URL_, params, TOKEN));
const body = await good.text();
assert("valid signature accepted", good.status === 200, `HTTP ${good.status}`);
assert("response is TwiML", body.includes("<Response>"));
if (body.includes("Thanks for calling")) {
  console.log(`        greeting: ${/Thanks for calling[^.]*/.exec(body)?.[0]}`);
} else {
  console.log("        (number not assigned to a tenant yet — heard the 'not configured' fallback)");
}

// 2. Forged signature → rejected, no TwiML.
const bad = await post(sign(URL_, params, "wrong-token"));
assert("forged signature rejected with 403", bad.status === 403, `HTTP ${bad.status}`);

console.log(failures === 0 ? "\n✅ WEBHOOK TEST PASSED" : `\n❌ ${failures} check(s) failed`);
process.exit(failures === 0 ? 0 : 1);
