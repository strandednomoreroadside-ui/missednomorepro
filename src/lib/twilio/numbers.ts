import "server-only";

import { env } from "@/lib/env";

/**
 * Self-serve number provisioning (post-launch #1). Thin raw-fetch wrappers
 * over the Twilio REST API: search available US local numbers, buy one and
 * point its webhooks at our app, and attach it to the approved A2P
 * Messaging Service so its outbound SMS has 10DLC deliverability.
 *
 * Every purchased number bills the platform's Twilio account (~$1.15/mo +
 * usage), so the CALLERS of these helpers gate on a card-on-file
 * subscription + the per-plan number cap. This module just talks to Twilio.
 */

const API = "https://api.twilio.com/2010-04-01";

export interface AvailableNumber {
  /** E.164, e.g. +14405551234 */
  phoneNumber: string;
  friendlyName: string;
  locality: string | null;
  region: string | null;
}

export interface PurchaseResult {
  ok: boolean;
  sid?: string;
  phoneNumber?: string;
  error?: string;
}

function authHeader(): string | null {
  const sid = env.TWILIO_ACCOUNT_SID;
  const token = env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) return null;
  return "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
}

export function isTwilioConfigured(): boolean {
  return Boolean(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN);
}

/** The voice webhook URL a number must point at for the AI to answer it. */
export function voiceWebhookUrl(appUrl: string): string {
  return `${appUrl.replace(/\/$/, "")}/api/twilio/voice`;
}

/** The webhook fields every one of our numbers must have set on Twilio. */
function webhookBody(appUrl: string): URLSearchParams {
  const base = appUrl.replace(/\/$/, "");
  return new URLSearchParams({
    VoiceUrl: `${base}/api/twilio/voice`,
    VoiceMethod: "POST",
    StatusCallback: `${base}/api/twilio/voice/status`,
    StatusCallbackMethod: "POST",
    SmsUrl: `${base}/api/twilio/sms`,
    SmsMethod: "POST",
  });
}

/** Look up an owned Twilio number by E.164, returning its record (sid, urls). */
async function findOwnedNumber(
  phoneNumber: string
): Promise<{ sid: string; voiceUrl: string | null } | null> {
  const auth = authHeader();
  if (!auth) return null;
  const res = await fetch(
    `${API}/Accounts/${env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json?PhoneNumber=${encodeURIComponent(phoneNumber)}`,
    { headers: { Authorization: auth } }
  );
  if (!res.ok) return null;
  const json = (await res.json().catch(() => ({}))) as {
    incoming_phone_numbers?: { sid: string; voice_url?: string | null }[];
  };
  const n = json.incoming_phone_numbers?.[0];
  return n ? { sid: n.sid, voiceUrl: n.voice_url ?? null } : null;
}

/** Is this number's Twilio voice webhook already pointed at our app? */
export async function isNumberConnected(phoneNumber: string, appUrl: string): Promise<boolean> {
  const rec = await findOwnedNumber(phoneNumber);
  return rec?.voiceUrl === voiceWebhookUrl(appUrl);
}

/**
 * Point an already-owned number's webhooks at the app so the AI answers it,
 * and attach it to the A2P Messaging Service (best-effort). Idempotent — safe
 * to run on a number that's already connected. Used by the dashboard
 * "Activate" button and admin number assignment; buying a NEW number uses
 * purchaseNumber which sets the same webhooks at purchase time.
 */
export async function configureNumberWebhooks(opts: {
  phoneNumber: string;
  appUrl: string;
}): Promise<{ ok: boolean; sid?: string; error?: string }> {
  const auth = authHeader();
  if (!auth) return { ok: false, error: "twilio_not_configured" };

  const rec = await findOwnedNumber(opts.phoneNumber);
  if (!rec) return { ok: false, error: "not_owned" };

  const res = await fetch(
    `${API}/Accounts/${env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers/${rec.sid}.json`,
    {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
      body: webhookBody(opts.appUrl),
    }
  );
  if (!res.ok) {
    console.error(`[twilio] configure webhooks failed (${res.status}): ${await res.text()}`);
    return { ok: false, error: `http_${res.status}` };
  }
  // A2P SMS — best-effort (409 = already attached, which is success for us).
  await addToMessagingService(rec.sid).catch(() => false);
  return { ok: true, sid: rec.sid };
}

/** Search US local numbers (voice + SMS capable) by 3-digit area code. */
export async function searchAvailableNumbers(areaCode: string): Promise<AvailableNumber[]> {
  const auth = authHeader();
  if (!auth) return [];
  const params = new URLSearchParams({
    AreaCode: areaCode,
    SmsEnabled: "true",
    VoiceEnabled: "true",
    Limit: "10",
  });
  const res = await fetch(
    `${API}/Accounts/${env.TWILIO_ACCOUNT_SID}/AvailablePhoneNumbers/US/Local.json?${params}`,
    { headers: { Authorization: auth } }
  );
  if (!res.ok) {
    console.error(`[twilio] number search failed (${res.status}): ${await res.text()}`);
    return [];
  }
  const json = (await res.json().catch(() => ({}))) as {
    available_phone_numbers?: {
      phone_number: string;
      friendly_name: string;
      locality?: string | null;
      region?: string | null;
    }[];
  };
  return (json.available_phone_numbers ?? []).map((n) => ({
    phoneNumber: n.phone_number,
    friendlyName: n.friendly_name,
    locality: n.locality ?? null,
    region: n.region ?? null,
  }));
}

/** Buy a specific number and point its voice + SMS webhooks at the app. */
export async function purchaseNumber(opts: {
  phoneNumber: string;
  appUrl: string;
}): Promise<PurchaseResult> {
  const auth = authHeader();
  if (!auth) return { ok: false, error: "twilio_not_configured" };
  const body = webhookBody(opts.appUrl);
  body.set("PhoneNumber", opts.phoneNumber);
  const res = await fetch(`${API}/Accounts/${env.TWILIO_ACCOUNT_SID}/IncomingPhoneNumbers.json`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as {
    sid?: string;
    phone_number?: string;
    message?: string;
  };
  if (!res.ok) {
    console.error(`[twilio] purchase failed (${res.status}): ${json?.message ?? ""}`);
    return { ok: false, error: json?.message ?? `http_${res.status}` };
  }
  return { ok: true, sid: json.sid, phoneNumber: json.phone_number };
}

/**
 * Attach a purchased number to the approved A2P Messaging Service so its
 * outbound SMS rides the approved 10DLC campaign (best deliverability) and
 * its inbound is handled at the Service level (STOP/HELP). Best-effort: a
 * failure leaves voice working and SMS pending, not the whole claim broken.
 */
export async function addToMessagingService(numberSid: string): Promise<boolean> {
  const auth = authHeader();
  const mg = env.TWILIO_MESSAGING_SERVICE_SID;
  if (!auth || !mg) return false;
  const res = await fetch(`https://messaging.twilio.com/v1/Services/${mg}/PhoneNumbers`, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ PhoneNumberSid: numberSid }),
  });
  if (!res.ok) {
    console.error(`[twilio] add-to-messaging-service failed (${res.status}): ${await res.text()}`);
    return false;
  }
  return true;
}
