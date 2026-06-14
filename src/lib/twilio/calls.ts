import "server-only";

import { env } from "@/lib/env";

import { xmlEscape } from "./twiml";

const VOICE = "Polly.Matthew-Neural";

/**
 * Place an outbound voice call that speaks `message` to a staff number.
 * This is M7's staff-alert channel (the operator chose voice; SMS staff
 * alerts arrive with the messaging system at M8). Uses Twilio's inline
 * `Twiml` parameter so no extra callback endpoint is needed.
 *
 * Returns true on accepted, false on any failure — a failed alert must
 * never throw into the AI tool call.
 */
export async function placeStaffVoiceCall(opts: {
  to: string;
  message: string;
}): Promise<boolean> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  const from = env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.error("[twilio] staff voice call skipped — Twilio env not configured");
    return false;
  }

  const twiml = `<Response><Say voice="${VOICE}">${xmlEscape(opts.message)}</Say></Response>`;
  const body = new URLSearchParams({ To: opts.to, From: from, Twiml: twiml });

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Calls.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[twilio] staff voice call failed (${res.status}): ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[twilio] staff voice call error:", err);
    return false;
  }
}
