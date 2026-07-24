import "server-only";

import { logAudit } from "@/lib/audit";
import { voiceAllowed } from "@/lib/billing/cost-controls";
import { env } from "@/lib/env";
import { normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createOutboundCall } from "@/lib/twilio/calls";

import { AGENT_BUSINESS_COLUMNS, ensureAgentSynced, type AgentBusiness } from "./agent-sync";

/**
 * "Test my AI" / Demo Now (NEEDS.md "Next"). We place an OUTBOUND call to
 * the owner's phone and, when they answer, bridge them to their own Retell
 * agent (the demo TwiML route at /api/twilio/voice/demo) — so they hear
 * exactly what a customer hears before going live.
 *
 * Every demo bills our Twilio + Retell accounts, and dialing an arbitrary
 * number is a toll-fraud / harassment vector, so this is gated hard:
 *  - owner/admin only (enforced by the caller) + card-on-file subscription
 *  - US/Canada targets only
 *  - rate-limited via the audit log so even calls that ring-no-answer count
 *    (you can't use it to spam-ring a number)
 *  - short hard cap + metered minutes (the demo TwiML caps the bridge)
 */

/** A card on file means an accountable, billable owner — the anti-fraud gate. */
const CARDED_STATUSES = new Set(["active", "trialing", "past_due"]);

/** No two demos closer than this (seconds). */
const COOLDOWN_SECONDS = 60;
/** Most demos a tenant may place per rolling 24h. */
const DAILY_CAP = 5;
const DEMO_AUDIT_ACTION = "demo_call.placed";

export type DemoError =
  | "not_configured"
  | "no_subscription"
  | "no_business"
  | "bad_number"
  | "rate_limited"
  | "capped"
  | "call_failed";

export type DemoResult = { ok: true; to: string } | { ok: false; error: DemoError };

const AGENT_COLUMNS = AGENT_BUSINESS_COLUMNS;

/**
 * Place a demo call for `tenantId` to `toPhone`. Caller must already have
 * verified the actor is an owner/admin of this tenant.
 */
export async function placeDemoCall(opts: {
  tenantId: string;
  actorUserId?: string | null;
  toPhone: string;
}): Promise<DemoResult> {
  const { tenantId, actorUserId } = opts;

  // ── Infra present? (voice demo needs Twilio + Retell + the bridge secret) ──
  if (
    !env.TWILIO_ACCOUNT_SID ||
    !env.TWILIO_AUTH_TOKEN ||
    !env.RETELL_API_KEY ||
    !env.INTERNAL_API_SECRET
  ) {
    return { ok: false, error: "not_configured" };
  }

  const to = normalizeUsPhone(opts.toPhone ?? "");
  if (!to) return { ok: false, error: "bad_number" };

  const admin = createAdminClient();

  // ── Card on file? (no card → no outbound calls on our dime) ──
  const { data: sub } = await admin
    .from("subscriptions")
    .select("status")
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!sub || !CARDED_STATUSES.has((sub as { status: string }).status)) {
    return { ok: false, error: "no_subscription" };
  }

  // ── Cost caps (kill switch / spend cap) — errs open like the voice route ──
  const gate = await voiceAllowed(admin, tenantId);
  if (!gate.allowed) return { ok: false, error: "capped" };

  // ── Rate limit (audit-log backed; counts every placed demo) ──
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { data: recent } = await admin
    .from("audit_logs")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .eq("action", DEMO_AUDIT_ACTION)
    .gte("created_at", since)
    .order("created_at", { ascending: false });
  const recentDemos = (recent ?? []) as { created_at: string }[];
  if (recentDemos.length >= DAILY_CAP) return { ok: false, error: "rate_limited" };
  if (
    recentDemos.length > 0 &&
    Date.now() - new Date(recentDemos[0].created_at).getTime() < COOLDOWN_SECONDS * 1000
  ) {
    return { ok: false, error: "rate_limited" };
  }

  // ── Resolve the business (first for the tenant) ──
  const { data: businessRow } = await admin
    .from("businesses")
    .select(AGENT_COLUMNS)
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const business = (businessRow as AgentBusiness | null) ?? null;
  if (!business) return { ok: false, error: "no_business" };

  // ── FROM number: the tenant's own number (realistic caller ID), else the
  //    platform number so a not-yet-provisioned tenant can still demo. ──
  const { data: numberRow } = await admin
    .from("phone_numbers")
    .select("phone_number")
    .eq("tenant_id", tenantId)
    .eq("voice_enabled", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const fromNumber =
    (numberRow as { phone_number: string } | null)?.phone_number ??
    env.TWILIO_PHONE_NUMBER ??
    null;
  if (!fromNumber) return { ok: false, error: "not_configured" };

  // ── Warm the agent now so it's ready when Twilio bridges to the SIP URI
  //    (the demo TwiML re-checks; this just avoids a cold first sync racing
  //    Retell's 5-minute register window). ──
  try {
    await ensureAgentSynced(admin, business);
  } catch (err) {
    console.error("[demo] agent sync failed:", err);
    return { ok: false, error: "not_configured" };
  }

  // ── Place the call. The TwiML callback bridges the answered call to the
  //    agent; the businessId + secret in the URL are covered by Twilio's
  //    request signature (and re-checked in the route). ──
  const appUrl = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const twimlUrl =
    `${appUrl}/api/twilio/voice/demo` +
    `?b=${encodeURIComponent(business.id)}&key=${encodeURIComponent(env.INTERNAL_API_SECRET)}`;

  const placed = await createOutboundCall({ to, from: fromNumber, twimlUrl, timeoutSeconds: 25 });
  if (!placed.ok) return { ok: false, error: "call_failed" };

  await logAudit({
    tenantId,
    actorUserId,
    action: DEMO_AUDIT_ACTION,
    entityType: "call",
    entityId: placed.sid,
    metadata: { to, from: fromNumber },
  });

  return { ok: true, to };
}
