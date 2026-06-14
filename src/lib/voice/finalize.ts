import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { encryptText } from "@/lib/crypto";
import { redactPii } from "@/lib/redact";
import { recordUsage } from "@/lib/billing/usage";

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
};

const CALL_COLUMNS =
  "id, tenant_id, contact_id, direction, disposition, duration_seconds, ended_at";

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
  hasContact: boolean,
  durationSeconds: number | null
): string {
  const names = toolCalls.map((t) => t.tool_name);
  if (names.includes("mark_spam")) return "spam";
  if (names.includes("escalate_to_human")) return "escalated";
  if (names.includes("notify_staff") || names.includes("create_contact") || hasContact) {
    return "lead";
  }
  const area = toolCalls.find((t) => t.tool_name === "check_service_area");
  if (area && area.result && area.result.covered === false) return "out_of_area";
  if ((durationSeconds ?? 0) < 15) return "abandoned";
  return "no_action";
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
      Boolean(call.contact_id),
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
}
