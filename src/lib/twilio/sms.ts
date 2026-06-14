import "server-only";

import { env } from "@/lib/env";

/**
 * Send an SMS via Twilio. Prefers the A2P Messaging Service (best 10DLC
 * deliverability) when TWILIO_MESSAGING_SERVICE_SID is set, else sends
 * from the business number.
 *
 * Scope: this is the STAFF-alert channel for M7 (notifying the business's
 * own people). The full CUSTOMER SMS system — per-contact consent, STOP/
 * HELP, suppression list, missed-call text-back, message log — is M8.
 *
 * Returns true on accepted, false on any failure — an alert must never
 * throw into the AI tool call.
 */
export async function sendSms(opts: { to: string; body: string }): Promise<boolean> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) {
    console.error("[twilio] sms skipped — Twilio env not configured");
    return false;
  }

  const params = new URLSearchParams({ To: opts.to, Body: opts.body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  } else if (env.TWILIO_PHONE_NUMBER) {
    params.set("From", env.TWILIO_PHONE_NUMBER);
  } else {
    console.error("[twilio] sms skipped — no Messaging Service or From number");
    return false;
  }

  try {
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      console.error(`[twilio] sms failed (${res.status}): ${text}`);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[twilio] sms error:", err);
    return false;
  }
}
