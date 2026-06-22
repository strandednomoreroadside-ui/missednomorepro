import "server-only";

import { env } from "@/lib/env";

export interface TwilioSmsResult {
  ok: boolean;
  sid: string | null;
  error: string | null;
  /** Twilio's numeric error code (e.g. 21610 = recipient opted out). */
  code: number | null;
}

/**
 * Low-level Twilio SMS send. Prefers the A2P Messaging Service (best
 * 10DLC deliverability) when TWILIO_MESSAGING_SERVICE_SID is set, else
 * sends from the business number. Returns the MessageSid so the caller
 * can correlate delivery-status callbacks.
 *
 * This is the raw transport — gating (consent/suppression) and logging
 * live in src/lib/sms/outbound.ts. Never call this directly for customer
 * messages; go through sendCustomerSms so the compliance gate runs.
 */
export async function sendTwilioSms(opts: {
  to: string;
  body: string;
}): Promise<TwilioSmsResult> {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return { ok: false, sid: null, error: "twilio_not_configured", code: null };

  const params = new URLSearchParams({ To: opts.to, Body: opts.body });
  if (env.TWILIO_MESSAGING_SERVICE_SID) {
    params.set("MessagingServiceSid", env.TWILIO_MESSAGING_SERVICE_SID);
  } else if (env.TWILIO_PHONE_NUMBER) {
    params.set("From", env.TWILIO_PHONE_NUMBER);
  } else {
    return { ok: false, sid: null, error: "no_from_or_service", code: null };
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
    const json = (await res.json().catch(() => ({}))) as {
      sid?: string;
      message?: string;
      code?: number;
    };
    if (!res.ok) {
      const error = json?.message ?? `http_${res.status}`;
      console.error(`[twilio] sms failed (${res.status}): ${error}`);
      return { ok: false, sid: null, error: String(error), code: json?.code ?? null };
    }
    return { ok: true, sid: json?.sid ?? null, error: null, code: null };
  } catch (err) {
    console.error("[twilio] sms error:", err);
    return { ok: false, sid: null, error: String(err), code: null };
  }
}
