import "server-only";

import { randomUUID } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { createOutboundCall, updateActiveCall } from "@/lib/twilio/calls";
import {
  handoffCallerTwiml,
  handoffFallbackTwiml,
  handoffRecipientBridgeTwiml,
  handoffRecipientTwiml,
} from "@/lib/twilio/twiml";

import { recordHumanEscalation } from "./escalation";

export type HandoffMode = "normal" | "emergency";
export type HandoffOutcome =
  | "starting"
  | "holding"
  | "ringing"
  | "awaiting_acceptance"
  | "bridged"
  | "declined"
  | "busy"
  | "no_answer"
  | "failed"
  | "cancelled"
  | "caller_left";

type HandoffRow = {
  id: string;
  tenant_id: string;
  business_id: string;
  source_call_id: string;
  mode: HandoffMode;
  summary: string;
  conference_name: string;
  recipient_call_sid: string | null;
  outcome: HandoffOutcome;
};

/** How long the agent's closing sentence gets to finish before the caller is
 * moved to hold music. Long enough for "let me get someone on the line for
 * you — one moment" at the tuned voice speed, short enough that the caller
 * isn't left hanging. Raise it if the agent still gets clipped. */
const AGENT_SPEECH_TAIL_MS = 3000;

const ACTIVE_OUTCOMES: HandoffOutcome[] = [
  "starting",
  "holding",
  "ringing",
  "awaiting_acceptance",
];

function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

export function handoffUrl(id: string, action: "recipient" | "decision" | "status"): string {
  return `${appUrl()}/api/twilio/voice/handoff/${action}?id=${encodeURIComponent(id)}`;
}

function samePhone(a: string, b: string): boolean {
  const left = a.replace(/\D/g, "");
  const right = b.replace(/\D/g, "");
  return Boolean(left && right && left === right);
}

async function resolveRecipient(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string
): Promise<string | null> {
  const { data: business } = await admin
    .from("businesses")
    .select("transfer_enabled, transfer_number")
    .eq("id", businessId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!business || business.transfer_enabled === false) return null;
  const explicit = (business.transfer_number ?? "").trim();
  if (explicit) return explicit;
  const { data: staff } = await admin
    .from("staff_contacts")
    .select("phone")
    .eq("tenant_id", tenantId)
    .eq("business_id", businessId)
    .eq("notify_on_lead", true)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return staff?.phone ?? null;
}

/** Start a true warm handoff. The parent call moves to a conference before
 * the recipient is dialled, and the recipient has to press 1 before joining.
 * The model provides only a bounded summary; it never chooses a destination,
 * TwiML URL, conference, tenant, or call SID. */
export async function startVoiceHandoff(input: {
  admin: SupabaseClient;
  tenantId: string;
  businessId: string | null;
  callId: string | null;
  businessName: string;
  callerNumber: string;
  reason: string;
  summary: string;
  mode: HandoffMode;
}): Promise<
  | { kind: "started"; handoffId: string }
  | { kind: "already_started"; handoffId: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "failed_before_hold"; reason: string }
  | { kind: "fallback_started"; handoffId: string }
> {
  if (!input.businessId || !input.callId) {
    return { kind: "unavailable", reason: "live_transfer_not_available" };
  }

  const [recipient, callResult] = await Promise.all([
    resolveRecipient(input.admin, input.tenantId, input.businessId),
    input.admin
      .from("calls")
      .select("twilio_call_sid, to_number")
      .eq("id", input.callId)
      .eq("tenant_id", input.tenantId)
      .maybeSingle(),
  ]);
  if (!recipient) return { kind: "unavailable", reason: "live_transfer_not_configured" };
  if (!callResult.data?.twilio_call_sid || !callResult.data.to_number) {
    return { kind: "unavailable", reason: "live_transfer_call_not_available" };
  }
  if (samePhone(input.callerNumber, recipient)) {
    return { kind: "unavailable", reason: "live_transfer_recipient_is_caller" };
  }

  const conferenceName = `handoff-${randomUUID()}`;
  const summary = input.summary.trim().slice(0, 600) || input.reason.trim().slice(0, 600);
  const { data: created, error: createError } = await input.admin
    .from("voice_handoffs")
    .insert({
      tenant_id: input.tenantId,
      business_id: input.businessId,
      source_call_id: input.callId,
      mode: input.mode,
      summary,
      conference_name: conferenceName,
      outcome: "starting",
    })
    .select("id")
    .single();

  if (createError) {
    if (createError.code === "23505") {
      const { data: existing } = await input.admin
        .from("voice_handoffs")
        .select("id")
        .eq("source_call_id", input.callId)
        .maybeSingle();
      if (existing) return { kind: "already_started", handoffId: existing.id };
    }
    console.error("[handoff] unable to create state row:", createError.message);
    return { kind: "failed_before_hold", reason: "handoff_state_unavailable" };
  }

  const handoffId = created.id as string;

  // Let the agent land its sentence. The model speaks "let me get someone on
  // the line for you" and calls this tool in the same turn, so redirecting the
  // moment the tool fires chops the line off mid-word. Nothing in the provider
  // API reports "finished speaking", so we simply give the tail time to play
  // before the caller leaves the SIP leg. The during-execution filler keeps the
  // line alive meanwhile, and this is well inside the tool's 20s budget.
  await new Promise((resolve) => setTimeout(resolve, AGENT_SPEECH_TAIL_MS));

  const hold = await updateActiveCall({
    callSid: callResult.data.twilio_call_sid,
    twiml: handoffCallerTwiml({ conferenceName }),
  });
  if (!hold.ok) {
    await input.admin
      .from("voice_handoffs")
      .update({ outcome: "failed", error_code: hold.error ?? "parent_call_update_failed", ended_at: new Date().toISOString() })
      .eq("id", handoffId)
      .eq("tenant_id", input.tenantId);
    return { kind: "failed_before_hold", reason: "live_transfer_hold_failed" };
  }

  await input.admin
    .from("voice_handoffs")
    .update({ outcome: "holding", holding_at: new Date().toISOString() })
    .eq("id", handoffId)
    .eq("tenant_id", input.tenantId);

  const recipientCall = await createOutboundCall({
    to: recipient,
    from: callResult.data.to_number,
    twimlUrl: handoffUrl(handoffId, "recipient"),
    statusCallbackUrl: handoffUrl(handoffId, "status"),
    timeoutSeconds: input.mode === "emergency" ? 18 : 30,
  });
  if (!recipientCall.ok || !recipientCall.sid) {
    await failVoiceHandoff(input.admin, handoffId, "failed", recipientCall.error ?? "recipient_call_failed");
    return { kind: "fallback_started", handoffId };
  }

  await input.admin
    .from("voice_handoffs")
    .update({
      recipient_call_sid: recipientCall.sid,
      outcome: "ringing",
      ringing_at: new Date().toISOString(),
    })
    .eq("id", handoffId)
    .eq("tenant_id", input.tenantId);

  return { kind: "started", handoffId };
}

export async function getVoiceHandoff(
  admin: SupabaseClient,
  handoffId: string
): Promise<HandoffRow | null> {
  const { data } = await admin
    .from("voice_handoffs")
    .select(
      "id, tenant_id, business_id, source_call_id, mode, summary, conference_name, recipient_call_sid, outcome"
    )
    .eq("id", handoffId)
    .maybeSingle();
  return (data as HandoffRow | null) ?? null;
}

export function recipientHandoffTwiml(handoff: HandoffRow): string {
  return handoffRecipientTwiml({
    mode: handoff.mode,
    summary: handoff.summary,
    decisionUrl: handoffUrl(handoff.id, "decision"),
  });
}

export async function acceptVoiceHandoff(
  admin: SupabaseClient,
  handoff: HandoffRow,
  recipientCallSid: string
): Promise<boolean> {
  if (!handoff.recipient_call_sid || handoff.recipient_call_sid !== recipientCallSid) return false;
  if (handoff.outcome !== "bridged") {
    const { data, error } = await admin
      .from("voice_handoffs")
      .update({
        outcome: "bridged",
        accepted_at: new Date().toISOString(),
        bridged_at: new Date().toISOString(),
      })
      .eq("id", handoff.id)
      .in("outcome", ACTIVE_OUTCOMES)
      .select("id");
    if (error || !data?.length) return false;
  }
  return true;
}

export function recipientBridgeTwiml(handoff: HandoffRow): string {
  return handoffRecipientBridgeTwiml(handoff.conference_name);
}

/** Terminal recipient statuses must release the caller and only then create
 * the task/SMS fallback. The conditional state update makes retries and
 * duplicate Twilio callbacks harmless. */
export async function failVoiceHandoff(
  admin: SupabaseClient,
  handoffId: string,
  outcome: Extract<HandoffOutcome, "declined" | "busy" | "no_answer" | "failed" | "cancelled" | "caller_left">,
  errorCode: string
): Promise<boolean> {
  const handoff = await getVoiceHandoff(admin, handoffId);
  if (!handoff || !ACTIVE_OUTCOMES.includes(handoff.outcome)) return false;

  const { data: transitioned, error } = await admin
    .from("voice_handoffs")
    .update({ outcome, error_code: errorCode.slice(0, 200), ended_at: new Date().toISOString() })
    .eq("id", handoff.id)
    .in("outcome", ACTIVE_OUTCOMES)
    .select("id");
  if (error || !transitioned?.length) return false;

  const { data: call } = await admin
    .from("calls")
    .select("id, tenant_id, business_id, contact_id, from_number, twilio_call_sid")
    .eq("id", handoff.source_call_id)
    .eq("tenant_id", handoff.tenant_id)
    .maybeSingle();
  if (!call) return true;

  if (call.twilio_call_sid) {
    const fallback = await updateActiveCall({
      callSid: call.twilio_call_sid,
      twiml: handoffFallbackTwiml({
        recordDoneUrl: `${appUrl()}/api/twilio/voice/recording-done`,
        recordingStatusUrl: `${appUrl()}/api/twilio/voice/recording`,
      }),
    });
    if (!fallback.ok) console.error("[handoff] unable to release caller to fallback:", fallback.error);
  }

  const { data: business } = await admin
    .from("businesses")
    .select("name")
    .eq("id", handoff.business_id)
    .eq("tenant_id", handoff.tenant_id)
    .maybeSingle();
  await recordHumanEscalation({
    admin,
    tenantId: handoff.tenant_id,
    businessId: handoff.business_id,
    contactId: call.contact_id ?? null,
    callId: call.id,
    businessName: business?.name ?? "our team",
    fromNumber: call.from_number ?? "",
    reason: `live handoff ${outcome}`,
    summary: handoff.summary,
    source: "system",
  });
  return true;
}

export async function updateHandoffRecipientStatus(
  admin: SupabaseClient,
  handoffId: string,
  recipientCallSid: string,
  callStatus: string
): Promise<void> {
  const handoff = await getVoiceHandoff(admin, handoffId);
  if (!handoff || (handoff.recipient_call_sid && handoff.recipient_call_sid !== recipientCallSid)) return;

  if (callStatus === "ringing") {
    await admin
      .from("voice_handoffs")
      .update({ outcome: "ringing", ringing_at: new Date().toISOString() })
      .eq("id", handoff.id)
      .in("outcome", ["starting", "holding", "ringing"]);
    return;
  }
  if (callStatus === "in-progress") {
    await admin
      .from("voice_handoffs")
      .update({ outcome: "awaiting_acceptance" })
      .eq("id", handoff.id)
      .in("outcome", ["holding", "ringing"]);
    return;
  }
  const terminal: Record<string, Extract<HandoffOutcome, "busy" | "no_answer" | "failed" | "cancelled">> = {
    busy: "busy",
    "no-answer": "no_answer",
    failed: "failed",
    canceled: "cancelled",
  };
  if (terminal[callStatus]) {
    await failVoiceHandoff(admin, handoff.id, terminal[callStatus], `recipient_${callStatus}`);
    return;
  }
  if (callStatus === "completed" && handoff.outcome !== "bridged") {
    await failVoiceHandoff(admin, handoff.id, "no_answer", "recipient_completed_without_acceptance");
  }
}

/** The source call may end while the recipient is still ringing or hearing
 * the brief. Cancel that orphaned leg without generating a callback alert:
 * the customer has chosen to leave rather than the team missing them. */
export async function cancelVoiceHandoffForCaller(
  admin: SupabaseClient,
  tenantId: string,
  sourceCallId: string
): Promise<void> {
  const { data } = await admin
    .from("voice_handoffs")
    .update({ outcome: "caller_left", error_code: "source_call_ended", ended_at: new Date().toISOString() })
    .eq("tenant_id", tenantId)
    .eq("source_call_id", sourceCallId)
    .in("outcome", ACTIVE_OUTCOMES)
    .select("recipient_call_sid");
  const recipientCallSid = data?.[0]?.recipient_call_sid as string | null | undefined;
  if (recipientCallSid) {
    await updateActiveCall({ callSid: recipientCallSid, twiml: "<Hangup/>" });
  }
}
