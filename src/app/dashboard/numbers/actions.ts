"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getSubscription } from "@/lib/billing/subscription";
import { env } from "@/lib/env";
import { normalizeUsPhone } from "@/lib/phone";
import { sendCustomerSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOutboundCall } from "@/lib/twilio/calls";
import {
  addToMessagingService,
  configureNumberWebhooks,
  isTwilioConfigured,
  purchaseNumber,
  releaseNumberFromTwilio,
  searchAvailableNumbers,
  type AvailableNumber,
} from "@/lib/twilio/numbers";
import { placeDemoCall, type DemoError } from "@/lib/voice/demo";

/** A card on file (any of these statuses) — the same anti-fraud gate the
 *  demo call uses, reused for the manual "text/call from my number" tools. */
const COMMS_CARDED_STATUSES = new Set(["active", "trialing", "past_due"]);

/** Only carded customers may provision (active or trialing — both have a
 *  card on file under our trial policy). past_due is excluded: fix billing
 *  before claiming a NEW number that bills us. */
const PROVISION_STATUSES = new Set(["active", "trialing"]);

export type ClaimResult = { ok: boolean; error?: string; phone?: string };
export type SearchResult = { ok: boolean; numbers: AvailableNumber[]; error?: string };

/**
 * Can this tenant claim a number right now? Gates on a card-on-file
 * subscription (guards the platform's Twilio bill) + the per-plan number
 * cap (1 included; more only with the multi_number entitlement). Re-checked
 * server-side on every search and claim — never trust the client.
 */
export async function provisionEligibility(
  tenantId: string
): Promise<{ ok: boolean; reason?: "no_subscription" | "limit_reached" }> {
  const sub = await getSubscription(tenantId);
  if (!sub || !PROVISION_STATUSES.has(sub.status)) return { ok: false, reason: "no_subscription" };

  const admin = createAdminClient();
  const { count } = await admin
    .from("phone_numbers")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  const ent = await getEntitlements(tenantId);
  if ((count ?? 0) >= 1 && !ent.has("multi_number")) return { ok: false, reason: "limit_reached" };

  return { ok: true };
}

/** Search available local numbers by area code (eligibility-gated). */
export async function searchNumbers(areaCode: string): Promise<SearchResult> {
  const { active } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, numbers: [], error: "not_allowed" };
  }
  const elig = await provisionEligibility(active.organization_id);
  if (!elig.ok) return { ok: false, numbers: [], error: elig.reason };
  if (!isTwilioConfigured()) return { ok: false, numbers: [], error: "twilio_not_configured" };

  const code = (areaCode ?? "").replace(/\D/g, "").slice(0, 3);
  if (code.length !== 3) return { ok: false, numbers: [], error: "bad_area_code" };

  const numbers = await searchAvailableNumbers(code);
  if (numbers.length === 0) return { ok: true, numbers: [], error: "none_found" };
  return { ok: true, numbers };
}

/**
 * Buy a number for this tenant: purchase it on Twilio (webhooks pointed at
 * us), attach it to the A2P Messaging Service for SMS, then record it. The
 * row is written with the service-role client because phone_numbers is
 * server-owned (members read, never write).
 */
export async function claimNumber(phoneNumber: string): Promise<ClaimResult> {
  const { user, active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, error: "not_allowed" };
  }

  const elig = await provisionEligibility(tenantId);
  if (!elig.ok) return { ok: false, error: elig.reason };

  const phone = normalizeUsPhone(phoneNumber);
  if (!phone) return { ok: false, error: "bad_number" };

  const purchased = await purchaseNumber({ phoneNumber: phone, appUrl: env.NEXT_PUBLIC_APP_URL });
  if (!purchased.ok || !purchased.sid) {
    return { ok: false, error: purchased.error ?? "purchase_failed" };
  }

  // A2P SMS (best-effort — voice works regardless).
  const a2p = await addToMessagingService(purchased.sid);

  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const finalNumber = purchased.phoneNumber ?? phone;
  const { error } = await admin.from("phone_numbers").insert({
    tenant_id: tenantId,
    business_id: business?.id ?? null,
    twilio_sid: purchased.sid,
    phone_number: finalNumber,
    type: "local",
    a2p_status: a2p ? "approved" : "pending",
    voice_enabled: true,
    sms_enabled: true,
  });
  if (error) {
    // The number was bought on Twilio but we couldn't record it — surface it
    // so support can reconcile rather than silently double-charging a retry.
    console.error(`[numbers] purchased ${finalNumber} (${purchased.sid}) but insert failed: ${error.message}`);
    return { ok: false, error: "record_failed" };
  }

  await logAudit({
    tenantId,
    actorUserId: user?.id,
    action: "phone_number.self_provisioned",
    entityType: "phone_number",
    entityId: finalNumber,
    metadata: { sid: purchased.sid, a2p },
  });

  revalidatePath("/dashboard/numbers");
  revalidatePath("/dashboard/settings");
  return { ok: true, phone: finalNumber };
}

export type ActivateResult = { ok: boolean; error?: string };

/**
 * "Activate" an assigned number: point its Twilio webhooks at the app so the
 * AI answers it. Owner/admin only. The number must already belong to this
 * tenant (numbers are server-owned; we verify ownership before touching
 * Twilio). Idempotent — safe to press even if it's already connected.
 */
export async function activateNumber(phoneNumber: string): Promise<ActivateResult> {
  const { user, active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, error: "not_allowed" };
  }
  if (!isTwilioConfigured()) return { ok: false, error: "twilio_not_configured" };

  const phone = normalizeUsPhone(phoneNumber);
  if (!phone) return { ok: false, error: "bad_number" };

  // Ownership check — this number must be one of THIS tenant's rows.
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("phone_numbers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone)
    .maybeSingle();
  if (!row) return { ok: false, error: "not_yours" };

  const cfg = await configureNumberWebhooks({ phoneNumber: phone, appUrl: env.NEXT_PUBLIC_APP_URL });
  if (!cfg.ok) return { ok: false, error: cfg.error ?? "activate_failed" };

  await admin
    .from("phone_numbers")
    .update({ twilio_sid: cfg.sid ?? null, voice_enabled: true, sms_enabled: true })
    .eq("id", row.id);

  await logAudit({
    tenantId,
    actorUserId: user?.id,
    action: "phone_number.activated",
    entityType: "phone_number",
    entityId: phone,
    metadata: { sid: cfg.sid },
  });

  revalidatePath("/dashboard/numbers");
  return { ok: true };
}

export type ReleaseResult = { ok: boolean; error?: string };

/**
 * Release (give back) a number the tenant no longer wants — e.g. to swap for a
 * different area code. Owner/admin only, ownership-checked. Releases it on
 * Twilio (stops billing us) then removes our row. Irreversible: the number is
 * gone for good, so the UI gates this behind an explicit confirm.
 */
export async function releaseNumber(phoneNumber: string): Promise<ReleaseResult> {
  const { user, active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, error: "not_allowed" };
  }
  if (!isTwilioConfigured()) return { ok: false, error: "twilio_not_configured" };

  const phone = normalizeUsPhone(phoneNumber);
  if (!phone) return { ok: false, error: "bad_number" };

  // Ownership check — must be one of THIS tenant's rows.
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("phone_numbers")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone_number", phone)
    .maybeSingle();
  if (!row) return { ok: false, error: "not_yours" };

  // Release on Twilio first — if that fails we keep the row so the number
  // isn't billing us invisibly (the orphan trap).
  const rel = await releaseNumberFromTwilio(phone);
  if (!rel.ok) return { ok: false, error: rel.error ?? "release_failed" };

  const { error } = await admin.from("phone_numbers").delete().eq("id", row.id);
  if (error) {
    console.error(`[numbers] released ${phone} on Twilio but row delete failed: ${error.message}`);
    return { ok: false, error: "record_failed" };
  }

  await logAudit({
    tenantId,
    actorUserId: user?.id,
    action: "phone_number.released",
    entityType: "phone_number",
    entityId: phone,
  });

  revalidatePath("/dashboard/numbers");
  revalidatePath("/dashboard/settings");
  return { ok: true };
}

export type DemoCallResult = { ok: boolean; error?: string; to?: string };

/** Human-readable copy for each demo failure reason. */
const DEMO_ERROR_COPY: Record<DemoError, string> = {
  not_configured: "Demo calls aren't available yet — phone service isn't fully set up.",
  no_subscription: "Start a plan or free trial first, then you can test your AI.",
  no_business: "Finish setting up your business, then try again.",
  bad_number: "That doesn't look like a valid US phone number.",
  rate_limited: "You've placed a test call recently — give it a minute and try again.",
  capped: "Your usage cap was reached, so the AI is paused. Check Billing.",
  call_failed: "We couldn't place the call. Double-check the number and try again.",
};

/**
 * "Test my AI": ring the owner's phone and bridge them to their own AI
 * receptionist. Owner/admin only; all margin/abuse gating (card on file,
 * rate limits, cost caps) lives in placeDemoCall.
 */
export async function startDemoCall(toPhone: string): Promise<DemoCallResult> {
  const { user, active } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, error: "Only an owner or admin can place a test call." };
  }

  const result = await placeDemoCall({
    tenantId: active.organization_id,
    actorUserId: user?.id,
    toPhone,
  });
  if (!result.ok) {
    return { ok: false, error: DEMO_ERROR_COPY[result.error] };
  }
  return { ok: true, to: result.to };
}

// ── Outbound texting & calling from the business's own number ──────
//
// A general "compose a text" / "call this number" tool for the operator AND
// any future tenant — separate from the AI's own send_sms tool and from the
// two-way SMS Inbox (which only replies inside an existing conversation
// thread). Both bill the platform's Twilio account, so both are gated the
// same way self-serve provisioning and the demo call are: owner/admin only,
// card on file, and a daily rate cap re-checked server-side on every call.

const MANUAL_SMS_DAILY_CAP = 300;
const OUTBOUND_CALL_DAILY_CAP = 100;
const OUTBOUND_CALL_COOLDOWN_SECONDS = 15;
const OUTBOUND_CALL_AUDIT_ACTION = "staff_call.placed";

export type SendTextResult = { ok: boolean; error?: string };

/** Send a one-off text to any number from the tenant's own business line. */
export async function sendManualText(toPhone: string, body: string): Promise<SendTextResult> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, error: "Only an owner or admin can send a text." };
  }
  if (!isTwilioConfigured()) return { ok: false, error: "Phone service isn't fully set up yet." };

  const to = normalizeUsPhone(toPhone);
  if (!to) return { ok: false, error: "That doesn't look like a valid US phone number." };
  const text = (body ?? "").trim();
  if (!text) return { ok: false, error: "Write a message first." };
  if (text.length > 1000) return { ok: false, error: "That message is too long." };

  const admin = createAdminClient();

  const sub = await getSubscription(tenantId);
  if (!sub || !COMMS_CARDED_STATUSES.has(sub.status)) {
    return { ok: false, error: "Start a plan or free trial first, then you can send texts." };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("kind", "manual")
    .eq("direction", "outbound")
    .gte("created_at", since);
  if ((count ?? 0) >= MANUAL_SMS_DAILY_CAP) {
    return { ok: false, error: "You've hit today's texting limit — try again tomorrow." };
  }

  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const { data: contact } = await admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("phone", to)
    .maybeSingle();

  const result = await sendCustomerSms(admin, {
    tenantId,
    businessId: (business?.id as string | undefined) ?? null,
    contactId: (contact?.id as string | undefined) ?? null,
    toPhone: to,
    body: text,
    kind: "manual",
    // Staff-composed, one-to-one, human-in-the-loop — treated like the other
    // transactional kinds. The STOP list is still a hard block either way.
    requireConsent: false,
  });

  if (result.blocked) {
    return {
      ok: false,
      error:
        result.reason === "suppressed" || result.reason === "suppressed_carrier"
          ? "This number has opted out of texts (STOP) — we can't text them."
          : "Couldn't send that text.",
    };
  }
  if (!result.sent) return { ok: false, error: "Couldn't send that text. Please try again." };

  revalidatePath("/dashboard/messages");
  return { ok: true };
}

export type CallNumberResult = { ok: boolean; error?: string };

/**
 * Click-to-call: ring the staff member's own phone, then bridge them to the
 * target number — presenting the tenant's business number as caller ID. Two
 * legs so the browser never has to hold live audio.
 */
export async function startOutboundCall(
  targetPhone: string,
  ringPhone: string
): Promise<CallNumberResult> {
  const { user, active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  if (active.role !== "owner" && active.role !== "admin") {
    return { ok: false, error: "Only an owner or admin can place a call." };
  }
  if (!isTwilioConfigured() || !env.INTERNAL_API_SECRET) {
    return { ok: false, error: "Phone service isn't fully set up yet." };
  }

  const target = normalizeUsPhone(targetPhone);
  const ring = normalizeUsPhone(ringPhone);
  if (!target) return { ok: false, error: "That doesn't look like a valid number to call." };
  if (!ring) return { ok: false, error: "That doesn't look like a valid number to ring you at." };

  const admin = createAdminClient();

  const sub = await getSubscription(tenantId);
  if (!sub || !COMMS_CARDED_STATUSES.has(sub.status)) {
    return { ok: false, error: "Start a plan or free trial first, then you can place calls." };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("audit_logs")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .eq("action", OUTBOUND_CALL_AUDIT_ACTION)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  const recentCalls = (recent ?? []) as { created_at: string }[];
  if (recentCalls.length >= OUTBOUND_CALL_DAILY_CAP) {
    return { ok: false, error: "You've hit today's calling limit — try again tomorrow." };
  }
  if (
    recentCalls.length > 0 &&
    Date.now() - new Date(recentCalls[0].created_at).getTime() < OUTBOUND_CALL_COOLDOWN_SECONDS * 1000
  ) {
    return { ok: false, error: "Give it a few seconds and try again." };
  }

  const { data: numberRow } = await admin
    .from("phone_numbers")
    .select("phone_number")
    .eq("tenant_id", tenantId)
    .eq("voice_enabled", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const fromNumber =
    (numberRow as { phone_number: string } | null)?.phone_number ?? env.TWILIO_PHONE_NUMBER ?? null;
  if (!fromNumber) return { ok: false, error: "No phone number set up yet to call from." };

  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const twimlUrl =
    `${appUrl}/api/twilio/voice/bridge` +
    `?tid=${encodeURIComponent(tenantId)}&t=${encodeURIComponent(target)}&f=${encodeURIComponent(fromNumber)}` +
    `&key=${encodeURIComponent(env.INTERNAL_API_SECRET)}`;

  const placed = await createOutboundCall({ to: ring, from: fromNumber, twimlUrl, timeoutSeconds: 25 });
  if (!placed.ok) return { ok: false, error: "Couldn't place the call. Please try again." };

  await logAudit({
    tenantId,
    actorUserId: user?.id,
    action: OUTBOUND_CALL_AUDIT_ACTION,
    entityType: "call",
    entityId: placed.sid,
    metadata: { target, ring, from: fromNumber },
  });

  revalidatePath("/dashboard/calls");
  return { ok: true };
}
