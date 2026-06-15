/**
 * Voice-provider adapter contract (master plan §3.1: "AI Fallback
 * Abstraction — Retell / Vapi / Bland adapter-ready").
 *
 * The rest of M7 talks to a voice provider ONLY through this interface.
 * Retell is the chosen provider (Path A); OpenAI Realtime (Path B) and
 * Vapi can be slotted in later by implementing the same shape — nothing
 * above this file imports a provider SDK. Telephony stays generic via
 * the {@link CallBridge} union: the provider tells us how to connect the
 * caller, and the Twilio layer renders that into TwiML.
 */

/** A §10 tool exposed to the AI, provider-neutral (no endpoint URL —
 *  the provider layer attaches our authenticated tools URL). */
export interface VoiceToolDef {
  name: string;
  description: string;
  /** JSON Schema for the arguments object. */
  parameters: Record<string, unknown>;
}

/** Everything needed to provision/refresh a provider-side agent. Built
 *  by the prompt builder from one tenant's wizard data. */
export interface VoiceAgentConfig {
  name: string;
  systemPrompt: string;
  /** First line the AI speaks when it answers. */
  beginMessage: string;
  /** Provider voice id (e.g. a Retell/ElevenLabs voice). */
  voiceId: string;
  /** BCP-47, e.g. "en-US". */
  language: string;
  /** Hard cap on call length (cost guard, §15). */
  maxCallSeconds: number;
  tools: VoiceToolDef[];
  /** E.164 number to warm-transfer live callers to (a human), or null. */
  transferNumber: string | null;
  /** Stable hash of the above — used to skip no-op re-syncs. */
  promptHash: string;
}

/** What we persist in our `agents` row after a sync. */
export interface ProviderAgentRef {
  providerAgentId: string;
  providerLlmId: string | null;
  promptHash: string | null;
}

export interface SyncAgentResult {
  providerAgentId: string;
  providerLlmId: string | null;
  promptHash: string;
}

export interface RegisterCallInput {
  agent: ProviderAgentRef;
  tenantId: string;
  businessId: string | null;
  fromNumber: string;
  toNumber: string;
  twilioCallSid: string;
  /** Opaque key/values the provider echoes back on tool calls and
   *  webhooks (we put tenant/business/call ids here). */
  metadata: Record<string, string>;
  /** Per-call prompt variables ({{caller_name}}, {{returning}} …). */
  dynamicVariables: Record<string, string>;
}

/** How the telephony layer should connect the caller to the provider.
 *  `say_hangup` is the graceful failure path (provider unavailable). */
export type CallBridge =
  | { kind: "stream"; url: string; parameters?: Record<string, string> }
  | { kind: "sip"; uri: string; headers?: Record<string, string> }
  | { kind: "say_hangup"; message: string };

export interface RegisterCallResult {
  providerCallId: string;
  bridge: CallBridge;
}

/** Normalized transcript/analysis delivered by an end-of-call webhook. */
export interface CallAnalysis {
  /** Raw transcript text — encrypted at rest, never shown raw (§9). */
  fullText: string;
  summary: string | null;
  /** "positive" | "neutral" | "negative" (provider-normalized). */
  sentiment: string | null;
  actionItems: string[];
  recordingUrl: string | null;
  durationSeconds: number | null;
  /** Provider's success flag, if any (informs disposition). */
  successful: boolean | null;
  /** Why the call ended, provider's words (e.g. "agent_hangup"). */
  disconnectReason: string | null;
  /** Any provider custom-analysis fields (e.g. is_spam, needs_callback). */
  custom: Record<string, unknown>;
}

/** Provider call lifecycle events, normalized across providers. */
export type NormalizedCallEvent =
  | { type: "call_started"; providerCallId: string; metadata: Record<string, string> }
  | {
      type: "call_ended";
      providerCallId: string;
      durationSeconds: number | null;
      recordingUrl: string | null;
      disconnectReason: string | null;
      metadata: Record<string, string>;
    }
  | {
      type: "call_analyzed";
      providerCallId: string;
      analysis: CallAnalysis;
      metadata: Record<string, string>;
    }
  | { type: "ignored"; providerCallId: string | null; reason: string };

export interface VoiceProvider {
  readonly id: "retell" | "openai" | "vapi";

  /**
   * Create or update the provider-side agent from `config`. Implementations
   * skip the network round-trip when `existing.promptHash === config.promptHash`.
   */
  syncAgent(
    config: VoiceAgentConfig,
    existing: ProviderAgentRef | null
  ): Promise<SyncAgentResult>;

  /**
   * Register an inbound call and return the provider call id plus how to
   * bridge the caller. Called from our Twilio voice webhook before we
   * answer, so we set per-call metadata/variables here.
   */
  registerInboundCall(input: RegisterCallInput): Promise<RegisterCallResult>;

  /** Verify a webhook came from the provider (signature/secret). */
  verifyWebhook(rawBody: string, signature: string | null): boolean | Promise<boolean>;

  /** Normalize a verified webhook body into a {@link NormalizedCallEvent}. */
  parseWebhookEvent(payload: unknown): NormalizedCallEvent;
}

/** Thrown by providers that are adapter-ready but not yet implemented. */
export class VoiceProviderNotImplementedError extends Error {
  constructor(providerId: string) {
    super(
      `Voice provider "${providerId}" is adapter-ready but not implemented yet. ` +
        `Set VOICE_PROVIDER=retell (the M6 decision) or implement this adapter.`
    );
    this.name = "VoiceProviderNotImplementedError";
  }
}
