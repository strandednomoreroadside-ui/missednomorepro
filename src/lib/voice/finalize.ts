import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { encryptText } from "@/lib/crypto";
import { redactPii } from "@/lib/redact";
import { formatUsPhone } from "@/lib/phone";
import { recordUsage } from "@/lib/billing/usage";
import { checkAndSendUsageAlerts } from "@/lib/billing/usage-alerts";
import { sendStaffSms } from "@/lib/sms/outbound";

import type { CallAnalysis } from "./types";

/**
 * Call finalization (BUILD_GUIDE M7 steps 5–6). Turns provider end-of-call
 * webhooks into our stored truth: transcript (encrypted raw + redacted
 * display), summary/sentiment, a disposition derived from what the AI
 * actually did, metered minutes, and a CRM timeline entry.
 *
 * Everything here is IDEMPOTENT — webhooks retry, and call_ended +
 * call_analyzed overlap — so each step checks before it writes.
 */

/** Rough blended $/min (Retell + telephony) for the dashboard estimate.
 *  Real cost reconciliation is post-MVP. */
const COST_PER_MINUTE = 0.15;

type CallRow = {
  id: string;
  tenant_id: string;
  contact_id: string | null;
  direction: string | null;
  disposition: string | null;
  duration_seconds: number | null;
  ended_at: string | null;
  vehicle_year: string | null;
  vehicle_make: string | null;
  vehicle_model: string | null;
};

const CALL_COLUMNS =
  "id, tenant_id, contact_id, direction, disposition, duration_seconds, ended_at, " +
  "vehicle_year, vehicle_make, vehicle_model";

async function loadCall(
  admin: SupabaseClient,
  providerCallId: string
): Promise<CallRow | null> {
  const { data } = await admin
    .from("calls")
    .select(CALL_COLUMNS)
    .eq("provider_call_id", providerCallId)
    .maybeSingle();
  return (data as CallRow | null) ?? null;
}

/** Disposition from the AI's actions when a tool didn't already set one. */
function deriveDisposition(
  toolCalls: { tool_name: string; result: Record<string, unknown> | null }[],
  durationSeconds: number | null
): string {
  const names = toolCalls.map((t) => t.tool_name);
  if (names.includes("mark_spam")) return "spam";
  if (names.includes("escalate_to_human")) return "escalated";
  // Out of area: a service-area check failed and none succeeded — even if we
  // took the caller's info, the call's outcome is "outside our area".
  const areaChecks = toolCalls.filter((t) => t.tool_name === "check_service_area");
  const anyCovered = areaChecks.some((a) => a.result?.covered === true);
  const anyNotCovered = areaChecks.some((a) => a.result?.covered === false);
  if (anyNotCovered && !anyCovered) return "out_of_area";
  // "lead" requires actual lead activity on THIS call — not merely that we
  // recognized a returning caller (contact_id is linked at call setup, so a
  // wrong number from a known caller must not count as a lead).
  if (names.includes("notify_staff") || names.includes("create_contact")) {
    return "lead";
  }
  if ((durationSeconds ?? 0) < 15) return "abandoned";
  return "no_action";
}

/** Dispositions that mean a real lead the staff should hear about. */
const LEAD_DISPOSITIONS = new Set(["lead", "booked", "escalated"]);

/**
 * Deterministic staff "new lead" text — the backstop for the regression
 * where the AI, on a busy prompt, finishes a lead/booked call WITHOUT ever
 * calling notify_staff. If the AI already alerted staff (notify_staff or
 * escalate_to_human ran), we don't duplicate. staff_alerted_at is claimed
 * first-writer-wins so webhook retries can't double-text.
 *
 * calls has no business_id, so we scope to the tenant's first business
 * (every current tenant is single-business) for the name + staff list.
 */
async function backstopStaffAlert(
  admin: SupabaseClient,
  call: CallRow,
  disposition: string,
  toolNames: string[],
  summary: string | null
): Promise<void> {
  if (!LEAD_DISPOSITIONS.has(disposition)) return;
  if (toolNames.includes("notify_staff") || toolNames.includes("escalate_to_human")) return;

  // Claim the send — only the first writer proceeds (retry-safe).
  const { data: claimed } = await admin
    .from("calls")
    .update({ staff_alerted_at: new Date().toISOString() })
    .eq("id", call.id)
    .eq("tenant_id", call.tenant_id)
    .is("staff_alerted_at", null)
    .select("id");
  if (!claimed?.length) return;

  const { data: business } = await admin
    .from("businesses")
    .select("id, name")
    .eq("tenant_id", call.tenant_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const businessName = (business?.name as string | null) ?? "your business";

  let staffQuery = admin
    .from("staff_contacts")
    .select("phone")
    .eq("tenant_id", call.tenant_id)
    .eq("notify_on_lead", true);
  if (business?.id) staffQuery = staffQuery.eq("business_id", business.id);
  const { data: staff } = await staffQuery;
  if (!staff?.length) return;

  let who = "A caller";
  let phone = "";
  if (call.contact_id) {
    const { data: contact } = await admin
      .from("contacts")
      .select("name, phone")
      .eq("id", call.contact_id)
      .eq("tenant_id", call.tenant_id)
      .maybeSingle();
    if (contact?.name) who = contact.name as string;
    if (contact?.phone) phone = contact.phone as string;
  }

  let need = "";
  if (call.contact_id) {
    const { data: lead } = await admin
      .from("leads")
      .select("service_needed")
      .eq("tenant_id", call.tenant_id)
      .eq("contact_id", call.contact_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lead?.service_needed) need = ` · ${lead.service_needed as string}`;
  }

  const vehicleParts = [call.vehicle_year, call.vehicle_make, call.vehicle_model].filter(Boolean);
  const vehiclePart = vehicleParts.length ? ` Vehicle: ${vehicleParts.join(" ")}.` : "";

  const prefix =
    disposition === "booked" ? "New booking" : disposition === "escalated" ? "URGENT" : "New lead";
  const summaryPart = summary ? ` ${summary.slice(0, 120)}` : "";
  const callbackPart = phone ? ` Call back: ${formatUsPhone(phone)}` : "";
  const body =
    `${prefix} — ${businessName}. ${who}${need}.${vehiclePart}${summaryPart}${callbackPart}`.slice(0, 480);

  for (const s of staff) {
    await sendStaffSms(admin, {
      tenantId: call.tenant_id,
      businessId: (business?.id as string | undefined) ?? null,
      toPhone: s.phone as string,
      body,
    });
  }
}

/** Meter call minutes exactly once per call (idempotent by source_id). */
async function meterMinutes(
  admin: SupabaseClient,
  call: CallRow,
  durationSeconds: number | null
): Promise<number> {
  if (!durationSeconds || durationSeconds <= 0) return 0;
  const minutes = Math.ceil(durationSeconds / 60);

  const { data: existing } = await admin
    .from("usage_events")
    .select("id")
    .eq("tenant_id", call.tenant_id)
    .eq("event_type", "voice_minutes")
    .eq("source_id", call.id)
    .maybeSingle();
  if (existing) return minutes;

  await recordUsage(admin, {
    tenantId: call.tenant_id,
    eventType: "voice_minutes",
    quantity: minutes,
    unit: "minute",
    provider: "retell",
    sourceId: call.id,
  });
  return minutes;
}

function costFor(minutes: number): number | null {
  return minutes > 0 ? Number((minutes * COST_PER_MINUTE).toFixed(4)) : null;
}

/**
 * call_ended: the call is over. Record duration/recording, mark completed,
 * meter minutes. Disposition + transcript come with call_analyzed.
 */
export async function applyCallEnded(
  admin: SupabaseClient,
  providerCallId: string,
  data: { durationSeconds: number | null; recordingUrl: string | null }
): Promise<void> {
  const call = await loadCall(admin, providerCallId);
  if (!call) {
    console.warn(`[finalize] call_ended for unknown provider call ${providerCallId}`);
    return;
  }

  const minutes = await meterMinutes(admin, call, data.durationSeconds);

  const patch: Record<string, unknown> = {
    status: "completed",
    ended_at: call.ended_at ?? new Date().toISOString(),
  };
  if (data.durationSeconds != null) {
    patch.duration_seconds = data.durationSeconds;
    patch.plan_minutes_used = minutes || null;
    patch.cost_estimate = costFor(minutes);
  }
  if (data.recordingUrl) patch.recording_url = data.recordingUrl;

  await admin.from("calls").update(patch).eq("id", call.id).eq("tenant_id", call.tenant_id);

  // Fire any newly-crossed usage-alert thresholds (best-effort, idempotent).
  if (minutes > 0) await checkAndSendUsageAlerts(admin, call.tenant_id);
}

/**
 * call_analyzed: store the transcript + analysis, decide the disposition,
 * meter (if not already), and write the contact's timeline entry.
 */
export async function applyCallAnalysis(
  admin: SupabaseClient,
  providerCallId: string,
  analysis: CallAnalysis
): Promise<void> {
  const call = await loadCall(admin, providerCallId);
  if (!call) {
    console.warn(`[finalize] call_analyzed for unknown provider call ${providerCallId}`);
    return;
  }

  const { data: toolCalls } = await admin
    .from("tool_calls")
    .select("tool_name, result")
    .eq("call_id", call.id);

  const durationSeconds = analysis.durationSeconds ?? call.duration_seconds;
  const disposition =
    call.disposition ??
    deriveDisposition(
      (toolCalls as { tool_name: string; result: Record<string, unknown> | null }[]) ?? [],
      durationSeconds
    );

  // Transcript: encrypt the raw, redact the display copy (§9).
  const raw = analysis.fullText ?? "";
  const { redacted, redactedCount } = redactPii(raw);
  const transcriptRow = {
    tenant_id: call.tenant_id,
    call_id: call.id,
    redacted_text: redacted || null,
    raw_text_encrypted: raw ? encryptText(raw) : null,
    summary: analysis.summary,
    sentiment: analysis.sentiment,
    action_items: analysis.actionItems ?? [],
    pii_redacted: redactedCount > 0,
  };

  const { data: existingT } = await admin
    .from("call_transcripts")
    .select("id")
    .eq("call_id", call.id)
    .maybeSingle();
  if (existingT) {
    await admin.from("call_transcripts").update(transcriptRow).eq("id", existingT.id);
  } else {
    await admin.from("call_transcripts").insert(transcriptRow);
  }

  const minutes = await meterMinutes(admin, call, durationSeconds);

  const patch: Record<string, unknown> = {
    status: "completed",
    disposition,
    transcript_status: "ready",
    ai_handled: true,
    ended_at: call.ended_at ?? new Date().toISOString(),
  };
  if (durationSeconds != null) {
    patch.duration_seconds = durationSeconds;
    patch.plan_minutes_used = minutes || null;
    patch.cost_estimate = costFor(minutes);
  }
  if (analysis.recordingUrl) patch.recording_url = analysis.recordingUrl;
  await admin.from("calls").update(patch).eq("id", call.id).eq("tenant_id", call.tenant_id);

  // CRM timeline (idempotent): one 'call' event per call.
  if (call.contact_id) {
    const { data: existingEvent } = await admin
      .from("customer_timeline_events")
      .select("id")
      .eq("tenant_id", call.tenant_id)
      .eq("event_type", "call")
      .eq("source_id", call.id)
      .maybeSingle();
    if (!existingEvent) {
      const summaryText = analysis.summary
        ? ` — ${analysis.summary.slice(0, 160)}`
        : "";
      await admin.from("customer_timeline_events").insert({
        tenant_id: call.tenant_id,
        contact_id: call.contact_id,
        event_type: "call",
        source_id: call.id,
        summary: `Call · ${disposition}${summaryText}`,
        metadata: {
          disposition,
          duration_seconds: durationSeconds,
          direction: call.direction,
        },
      });
    }
  }

  // Guarantee a staff lead text even when the AI forgot to call notify_staff
  // (best-effort, idempotent; never blocks finalization).
  try {
    const toolNames = ((toolCalls as { tool_name: string }[]) ?? []).map((t) => t.tool_name);
    await backstopStaffAlert(admin, call, disposition, toolNames, analysis.summary ?? null);
  } catch (err) {
    console.error("[finalize] backstop staff alert failed:", err);
  }
}
