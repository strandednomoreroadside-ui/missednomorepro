import "server-only";

import Retell from "retell-sdk";

import { env } from "@/lib/env";

import type {
  ProviderAgentRef,
  RegisterCallInput,
  RegisterCallResult,
  NormalizedCallEvent,
  SyncAgentResult,
  VoiceAgentConfig,
  VoiceProvider,
  VoiceToolDef,
  CallAnalysis,
} from "./types";

/**
 * Retell adapter (Path A — the M6 voice decision), built against
 * retell-sdk 5.36. Model: Retell-hosted LLM ("retell-llm" response
 * engine) with our §10 tools as custom functions and our Next.js routes
 * as their URLs — so Vercel never holds live audio (Twilio streams it
 * straight to Retell).
 *
 * Inbound flow: our Twilio webhook calls registerInboundCall → Retell
 * issues a call_id → we bridge Twilio media to Retell's audio websocket.
 * Auth to our tools + webhook is the INTERNAL_API_SECRET carried in the
 * URL (Retell has no signed-webhook helper in this SDK version; the
 * shared secret is the equivalent gate, checked in each route).
 */

/** Retell LLM model. Balanced for instruction-following vs. call latency
 *  and cost; tune from the 10-call test if a hard rule ever slips. */
const MODEL = "gpt-4.1";
/** Retell custom-telephony SIP host. After registerPhoneCall we dial the
 *  caller to sip:{call_id}@<host> — Retell's "Method 2: Dial to SIP URI"
 *  (docs.retellai.com/deploy/custom-telephony). Twilio must connect within
 *  5 minutes of register or Retell ends it with registered_call_timeout. */
const SIP_HOST = "sip.retellai.com";
/** Tools that do slow work (place outbound calls) — let the agent speak a
 *  filler line so the caller isn't met with silence. */
const SLOW_TOOLS = new Set(["notify_staff", "escalate_to_human"]);

/** Retell built-in end-call tool so the agent can hang up when finished —
 *  otherwise it lingers on the line and burns minutes. */
const END_CALL_TOOL = {
  type: "end_call",
  name: "end_call",
  description:
    "End the phone call. Call this the moment the conversation is finished — right after you've confirmed next steps and said a brief goodbye. Never stay on the line waiting in silence.",
};
/** Auto-hang-up after this much dead air (caller stopped responding). */
const END_CALL_AFTER_SILENCE_MS = 15000;

/** Warm-transfer tool: the agent privately briefs the teammate (who's
 *  calling + why), THEN bridges the caller — so the human doesn't make the
 *  caller re-explain. Only added when the business has a transfer number. */
function transferTool(number: string): Record<string, unknown> {
  return {
    type: "transfer_call",
    name: "transfer_to_human",
    description:
      "THE way to get a caller to a human — call this IMMEDIATELY (not escalate_to_human) the moment the caller asks for a person, is upset or distressed, or has a complaint. It bridges them to a teammate live, briefing the teammate first so the caller never repeats themselves. Only if this fails to connect should you fall back to escalate_to_human.",
    transfer_destination: { type: "predefined", number },
    transfer_option: {
      type: "warm_transfer",
      on_hold_music: "ringtone",
      private_handoff_option: {
        type: "prompt",
        prompt:
          "In one sentence, tell the teammate who is calling and why — the caller's name, their location, and what they need or why they're upset. Then the caller is connected.",
      },
    },
  };
}

let client: Retell | null = null;
function getClient(): Retell {
  if (!env.RETELL_API_KEY) {
    throw new Error("RETELL_API_KEY is not configured.");
  }
  if (!client) client = new Retell({ apiKey: env.RETELL_API_KEY });
  return client;
}

function appUrl(): string {
  return env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
}

function requireSecret(): string {
  if (!env.INTERNAL_API_SECRET) {
    throw new Error(
      "INTERNAL_API_SECRET is required to provision the AI agent (it secures the tool + webhook URLs)."
    );
  }
  return env.INTERNAL_API_SECRET;
}

function webhookUrl(): string {
  return `${appUrl()}/api/voice/retell/webhook?key=${encodeURIComponent(requireSecret())}`;
}

/** Map our provider-neutral tool defs to Retell custom functions. Auth +
 *  tool name ride in query_params, which our /api/voice/tools route reads. */
function mapTools(tools: VoiceToolDef[]): unknown[] {
  const secret = requireSecret();
  const url = `${appUrl()}/api/voice/tools`;
  return tools.map((t) => ({
    type: "custom",
    name: t.name,
    url,
    description: t.description,
    parameters: t.parameters,
    query_params: { tool: t.name, key: secret },
    speak_after_execution: true,
    speak_during_execution: SLOW_TOOLS.has(t.name),
    timeout_ms: 20000,
  }));
}

export class RetellVoiceProvider implements VoiceProvider {
  readonly id = "retell" as const;

  async syncAgent(
    config: VoiceAgentConfig,
    existing: ProviderAgentRef | null
  ): Promise<SyncAgentResult> {
    const c = getClient();
    const tools = [...mapTools(config.tools), END_CALL_TOOL];
    if (config.transferNumber) tools.push(transferTool(config.transferNumber));

    // Up to date already — skip the network round-trips.
    if (
      existing?.providerAgentId &&
      existing.providerLlmId &&
      existing.promptHash === config.promptHash
    ) {
      return {
        providerAgentId: existing.providerAgentId,
        providerLlmId: existing.providerLlmId,
        promptHash: config.promptHash,
      };
    }

    // Update the existing agent in place when we have its ids.
    if (existing?.providerAgentId && existing.providerLlmId) {
      await c.llm.update(existing.providerLlmId, {
        general_prompt: config.systemPrompt,
        general_tools: tools as never,
        begin_message: config.beginMessage,
        model: MODEL,
      });
      await c.agent.update(existing.providerAgentId, {
        voice_id: config.voiceId,
        language: config.language as never,
        webhook_url: webhookUrl(),
        max_call_duration_ms: config.maxCallSeconds * 1000,
        end_call_after_silence_ms: END_CALL_AFTER_SILENCE_MS,
      });
      return {
        providerAgentId: existing.providerAgentId,
        providerLlmId: existing.providerLlmId,
        promptHash: config.promptHash,
      };
    }

    // First time: create the LLM, then the agent that references it.
    const llm = await c.llm.create({
      general_prompt: config.systemPrompt,
      general_tools: tools as never,
      begin_message: config.beginMessage,
      model: MODEL,
    });
    const agent = await c.agent.create({
      response_engine: { type: "retell-llm", llm_id: llm.llm_id },
      voice_id: config.voiceId,
      language: config.language as never,
      webhook_url: webhookUrl(),
      max_call_duration_ms: config.maxCallSeconds * 1000,
      end_call_after_silence_ms: END_CALL_AFTER_SILENCE_MS,
      agent_name: config.name,
    });

    return {
      providerAgentId: agent.agent_id,
      providerLlmId: llm.llm_id,
      promptHash: config.promptHash,
    };
  }

  async registerInboundCall(input: RegisterCallInput): Promise<RegisterCallResult> {
    const c = getClient();
    const res = await c.call.registerPhoneCall({
      agent_id: input.agent.providerAgentId,
      direction: "inbound",
      from_number: input.fromNumber,
      to_number: input.toNumber,
      metadata: input.metadata,
      retell_llm_dynamic_variables: input.dynamicVariables,
    });
    return {
      providerCallId: res.call_id,
      bridge: { kind: "sip", uri: `sip:${res.call_id}@${SIP_HOST}` },
    };
  }

  /**
   * Retell (this SDK version) ships no signed-webhook verifier. The route
   * authenticates via the INTERNAL_API_SECRET in the webhook URL, and the
   * handlers only touch call rows we created at register time. Returns
   * true so the route's secret check is the single gate.
   */
  verifyWebhook(_rawBody: string, _signature: string | null): boolean {
    return true;
  }

  parseWebhookEvent(payload: unknown): NormalizedCallEvent {
    const p = (payload ?? {}) as {
      event?: string;
      call?: {
        call_id?: string;
        metadata?: unknown;
        duration_ms?: number;
        recording_url?: string;
        disconnection_reason?: string;
        transcript?: string;
        call_analysis?: {
          call_successful?: boolean;
          call_summary?: string;
          custom_analysis_data?: unknown;
          user_sentiment?: string;
        };
      };
    };

    const call = p.call;
    if (!call?.call_id) {
      return { type: "ignored", providerCallId: null, reason: "no call in payload" };
    }
    const metadata =
      call.metadata && typeof call.metadata === "object"
        ? (call.metadata as Record<string, string>)
        : {};
    const durationSeconds =
      typeof call.duration_ms === "number" ? Math.round(call.duration_ms / 1000) : null;

    switch (p.event) {
      case "call_started":
        return { type: "call_started", providerCallId: call.call_id, metadata };
      case "call_ended":
        return {
          type: "call_ended",
          providerCallId: call.call_id,
          durationSeconds,
          recordingUrl: call.recording_url ?? null,
          disconnectReason: call.disconnection_reason ?? null,
          metadata,
        };
      case "call_analyzed": {
        const a = call.call_analysis ?? {};
        const analysis: CallAnalysis = {
          fullText: call.transcript ?? "",
          summary: a.call_summary ?? null,
          sentiment: a.user_sentiment ? a.user_sentiment.toLowerCase() : null,
          actionItems: [],
          recordingUrl: call.recording_url ?? null,
          durationSeconds,
          successful: a.call_successful ?? null,
          disconnectReason: call.disconnection_reason ?? null,
          custom:
            a.custom_analysis_data && typeof a.custom_analysis_data === "object"
              ? (a.custom_analysis_data as Record<string, unknown>)
              : {},
        };
        return { type: "call_analyzed", providerCallId: call.call_id, analysis, metadata };
      }
      default:
        return {
          type: "ignored",
          providerCallId: call.call_id,
          reason: `unhandled event ${p.event ?? "(none)"}`,
        };
    }
  }
}
