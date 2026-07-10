"use server";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { getSubscription } from "@/lib/billing/subscription";
import { env } from "@/lib/env";
import { normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  addToMessagingService,
  configureNumberWebhooks,
  isTwilioConfigured,
  purchaseNumber,
  searchAvailableNumbers,
  type AvailableNumber,
} from "@/lib/twilio/numbers";
import { placeDemoCall, type DemoError } from "@/lib/voice/demo";

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
