import "server-only";

import { env } from "@/lib/env";

/**
 * Outbound voice calls over the Twilio REST API (thin raw-fetch wrapper,
 * same style as numbers.ts / sms.ts). Used by the "Test my AI" demo: we
 * ring the owner's phone and, when they answer, Twilio fetches our TwiML
 * (twimlUrl) which bridges them to their own Retell agent.
 *
 * Every demo call bills the platform's Twilio + Retell accounts, so the
 * CALLER of this helper gates on a card-on-file subscription + rate limits
 * (see src/lib/voice/demo.ts). This module just talks to Twilio.
 */

const API = "https://api.twilio.com/2010-04-01";

export interface OutboundCallResult {
  ok: boolean;
  sid?: string;
  error?: string;
}

export interface UpdateCallResult {
  ok: boolean;
  error?: string;
}

function authHeader(): string | null {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
}

/**
 * Place an outbound call. `from` must be a Twilio number on the account
 * (the tenant's own number, else the platform number). When the callee
 * answers, Twilio GETs/POSTs `twimlUrl` for instructions. `timeoutSeconds`
 * is how long to let it ring before giving up.
 */
export async function createOutboundCall(opts: {
  to: string;
  from: string;
  twimlUrl: string;
  /** Ring timeout in seconds (default 25). */
  timeoutSeconds?: number;
  /** Receives lifecycle updates for this outbound leg. */
  statusCallbackUrl?: string;
}): Promise<OutboundCallResult> {
  const auth = authHeader();
  if (!auth) return { ok: false, error: "twilio_not_configured" };

  const body = new URLSearchParams({
    To: opts.to,
    From: opts.from,
    Url: opts.twimlUrl,
    Method: "POST",
    Timeout: String(opts.timeoutSeconds ?? 25),
  });
  if (opts.statusCallbackUrl) {
    body.set("StatusCallback", opts.statusCallbackUrl);
    body.set("StatusCallbackMethod", "POST");
    body.set("StatusCallbackEvent", "initiated ringing answered completed");
  }

  const res = await fetch(`${API}/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls.json`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    message?: string;
    code?: number;
  };
  if (!res.ok) {
    console.error(`[twilio] outbound call failed (${res.status}): ${json?.message ?? ""}`);
    return { ok: false, error: json?.message ?? `http_${res.status}` };
  }
  return { ok: true, sid: json.sid };
}

/** Replace an active call's instructions. This is the handoff control point:
 * the caller leaves the AI SIP leg and waits in our Twilio conference before
 * we ever ring a staff member. */
export async function updateActiveCall(opts: {
  callSid: string;
  twiml: string;
}): Promise<UpdateCallResult> {
  const auth = authHeader();
  if (!auth) return { ok: false, error: "twilio_not_configured" };

  const body = new URLSearchParams({ Twiml: opts.twiml });
  const res = await fetch(
    `${API}/Accounts/${env.TWILIO_ACCOUNT_SID}/Calls/${encodeURIComponent(opts.callSid)}.json`,
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body,
    }
  );
  const json = (await res.json().catch(() => ({}))) as { message?: string };
  if (!res.ok) {
    console.error(`[twilio] active call update failed (${res.status}): ${json.message ?? ""}`);
    return { ok: false, error: json.message ?? `http_${res.status}` };
  }
  return { ok: true };
}
