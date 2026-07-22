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
/** Fast Tier: route to Retell's high-priority pool (more dedicated compute =
 *  lower, more consistent response latency). Costs more per message than the
 *  Standard pool — flip back to false if it pushes voice margin under target.
 *  Pairs with MODEL "gpt-4.1" to give the dashboard's "GPT-4.1 Fast Tier". */
const MODEL_HIGH_PRIORITY = true;
/** Retell custom-telephony SIP host. After registerPhoneCall we dial the
 *  caller to sip:{call_id}@<host> — Retell's "Method 2: Dial to SIP URI"
 *  (docs.retellai.com/deploy/custom-telephony). Twilio must connect within
 *  5 minutes of register or Retell ends it with registered_call_timeout. */
const SIP_HOST = "sip.retellai.com";
// ── Speech-after-tool policy (v12 — the definitive fix for the goodbye
//    quirks) ─────────────────────────────────────────────────────────
//
// HISTORY: v7 turned speak_after_execution OFF for the six "terminal"
// wrap-up tools (book_appointment, notify_staff, escalate_to_human,
// cancel/reschedule, create_follow_up_task) to kill a "double goodbye" —
// on the theory that Retell's after-tool speech was forcing an extra
// "okay, I've got that noted" line before the real goodbye. v10 found the
// ACTUAL cause of the double goodbye was Retell's reminder mechanism
// (reminder_max_count now 0), NOT after-tool speech. That left the v7
// switch doing real harm: with speech OFF, after a tool like
// book_appointment returns, Retell never invokes the model again, so the
// agent only says a goodbye IF it happened to generate speech in the very
// same turn as the tool call — which models do inconsistently. Result
// (operator-reported): booking succeeds, then dead silence, no goodbye,
// and no turn in which the model could call end_call either (so the caller
// has to hang up manually).
//
// FIX: EVERY tool speaks after it runs. The terminal tools now reliably
// get the turn in which the model delivers its ONE wrap-up line and calls
// end_call. reminder_max_count:0 keeps the double goodbye from coming back.
const SPEAK_AFTER_EXECUTION = true;
//
// EVERY tool also speaks a brief "one moment…" filler DURING execution
// (v13). Retell's own guidance: turn this on for any function taking over
// ~1s — and every one of our tools does network I/O; the calendar check
// and quote tools make 1-2 external Google API calls each and can run
// 5-20s on a cold serverless boot. v12 briefly turned fillers off
// globally, which created a lethal race: agent says "let me check", the
// tool runs silently, and END_CALL_AFTER_SILENCE_MS (the dead-air
// backstop) fires MID-LOOKUP — Retell hangs up on the caller while the
// availability check is still in flight (operator-reported: "she said
// she'd check availability and then hung up"). The filler keeps the line
// audibly alive during execution so the silence backstop only ever
// measures true dead air. Fillers contain no goodbye, so this cannot
// reintroduce the double-goodbye (that was the reminder mechanism, still
// disabled).
const SPEAK_DURING_EXECUTION = true;

/** Retell built-in end-call tool so the agent can hang up when finished —
 *  otherwise it lingers on the line and burns minutes. */
const END_CALL_TOOL = {
  type: "end_call",
  name: "end_call",
  description:
    "End the phone call. Call this the moment the conversation is finished — right after you've confirmed next steps and said a brief goodbye. Never stay on the line waiting in silence.",
};
/** Auto-hang-up after this much dead air (caller stopped responding).
 *  This is the failure-mode backstop for when the model says its wrap-up
 *  line but doesn't reliably call end_call in the same turn (tool-call
 *  reliability isn't 100% for any model) — the call must still end on its
 *  own rather than sit open until the caller gives up and hangs up
 *  manually. 15s: v11 briefly cut this to 10s, which (combined with v12
 *  turning off during-execution fillers) let it fire MID-TOOL-CALL on a
 *  slow calendar check and hang up on the caller. With fillers back on
 *  (SPEAK_DURING_EXECUTION above) this timer only measures true dead air,
 *  and 15s won't cut off a caller pausing to find their address. The
 *  primary clean-hangup path is the model calling end_call in its wrap-up
 *  turn (speak_after_execution guarantees it gets that turn). */
const END_CALL_AFTER_SILENCE_MS = 15000;
/** Retell's platform-level "remind the agent to speak" nudge defaults to
 *  firing once after 10s of silence following agent speech. That was the
 *  mechanical cause of the "double goodbye" bug: the agent says its one
 *  closing line and calls end_call, but if the line hangs up for even a
 *  few seconds longer than 10s, Retell prompts the model to speak again and
 *  it generates a second sign-off instead of silently retrying end_call.
 *  Multiple rounds of prompt-only fixes (v6-v9) couldn't touch this because
 *  it's a platform setting, not a prompt instruction — v10 disabled the
 *  reminder outright, which fixed most of it. Left disabled here rather
 *  than re-enabled with a shorter window: reintroducing it risks bringing
 *  the double-goodbye back at the same rate it was firing before v10, and
 *  END_CALL_AFTER_SILENCE_MS above is the safer backstop for a stuck call. */
const REMINDER_MAX_COUNT = 0;

/** Give a real person time to actually pick up before the warm transfer is
 *  declared failed. A solo roadside owner is often driving and needs several
 *  rings; with no timeout set the transfer bailed the instant the line didn't
 *  answer, so the agent jumped straight to "that didn't go through". */
const TRANSFER_DETECTION_TIMEOUT_MS = 30000;
const TRANSFER_RING_DURATION_MS = 30000;

/** Speech-to-text + audio tuning for noisy roadside callers (wind, highway,
 *  bystanders). `accurate` STT trades a little latency for far better
 *  transcription of mumbled service names and addresses; the strongest
 *  denoise strips background noise *and* other voices. Retell's
 *  interruption_sensitivity is "how easy is it to interrupt the agent" —
 *  HIGHER = easier to cut off, but also the general knob for how readily a
 *  quiet talker registers as speaking at all. We keep it LOW-ish so
 *  wind/traffic/bystander noise can't stop the agent mid-sentence, while a
 *  caller who clearly speaks over it still can. (Was 0.8 — that misread the
 *  scale and let noise barge in; then 0.3; nudged to 0.2 after a live test
 *  still caught some barge-in; nudged back up to 0.3 — quiet talkers weren't
 *  registering at 0.2. If background noise starts barging in again at 0.3,
 *  the fix is denoising strength, not pushing this back down.) */
const STT_MODE = "accurate" as const;
const DENOISING_MODE = "noise-and-background-speech-cancellation" as const;
const INTERRUPTION_SENSITIVITY = 0.3;
/** TTS playback rate (1.0 = natural). Wired as a one-number tune for the
 *  live-call test. */
const VOICE_SPEED = 1.0;
/** Curated pronunciation fixes applied to every agent. Backstops the prompt's
 *  "never write a.m./p.m." rule — a stray abbreviation still reads as
 *  "AM"/"PM" rather than the spurious trailing "k" we were hearing — and
 *  keeps 11labs from mis-saying local proper nouns. IPA alphabet. */
const PRONUNCIATION_DICTIONARY: { word: string; alphabet: "ipa"; phoneme: string }[] = [
  { word: "a.m.", alphabet: "ipa", phoneme: "ˌeɪˈɛm" },
  { word: "p.m.", alphabet: "ipa", phoneme: "ˌpiˈɛm" },
  { word: "AM", alphabet: "ipa", phoneme: "ˌeɪˈɛm" },
  { word: "PM", alphabet: "ipa", phoneme: "ˌpiˈɛm" },
  { word: "Strongsville", alphabet: "ipa", phoneme: "ˈstrɔŋzvɪl" },
  { word: "Cuyahoga", alphabet: "ipa", phoneme: "ˌkaɪəˈhoʊɡə" },
  { word: "Lakewood", alphabet: "ipa", phoneme: "ˈleɪkwʊd" },
  { word: "Sunoco", alphabet: "ipa", phoneme: "səˈnoʊkoʊ" },
];

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
      // Wait long enough for a human to answer before declaring failure.
      agent_detection_timeout_ms: TRANSFER_DETECTION_TIMEOUT_MS,
      transfer_ring_duration_ms: TRANSFER_RING_DURATION_MS,
      // Skip Retell's answering-machine detection entirely. A live call
      // confirmed the transfer was declared a failure while the line was
      // never actually seen ringing on the receiving end — the most likely
      // explanation is AMD misclassifying the pickup (or ring/SIP signaling)
      // and aborting the leg early. A single-owner business would rather
      // get bridged into their own voicemail on a bad guess than have a
      // real caller silently bounced to a text-only fallback.
      opt_out_human_detection: true,
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
    speak_after_execution: SPEAK_AFTER_EXECUTION,
    speak_during_execution: SPEAK_DURING_EXECUTION,
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
        model_high_priority: MODEL_HIGH_PRIORITY,
      });
      await c.agent.update(existing.providerAgentId, {
        voice_id: config.voiceId,
        language: config.language as never,
        webhook_url: webhookUrl(),
        max_call_duration_ms: config.maxCallSeconds * 1000,
        end_call_after_silence_ms: END_CALL_AFTER_SILENCE_MS,
        reminder_max_count: REMINDER_MAX_COUNT,
        boosted_keywords: config.boostedKeywords.length ? config.boostedKeywords : null,
        stt_mode: STT_MODE,
        denoising_mode: DENOISING_MODE,
        interruption_sensitivity: INTERRUPTION_SENSITIVITY,
        voice_speed: VOICE_SPEED,
        pronunciation_dictionary: PRONUNCIATION_DICTIONARY,
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
      model_high_priority: MODEL_HIGH_PRIORITY,
    });
    const agent = await c.agent.create({
      response_engine: { type: "retell-llm", llm_id: llm.llm_id },
      voice_id: config.voiceId,
      language: config.language as never,
      webhook_url: webhookUrl(),
      max_call_duration_ms: config.maxCallSeconds * 1000,
      end_call_after_silence_ms: END_CALL_AFTER_SILENCE_MS,
      boosted_keywords: config.boostedKeywords.length ? config.boostedKeywords : null,
      stt_mode: STT_MODE,
      denoising_mode: DENOISING_MODE,
      interruption_sensitivity: INTERRUPTION_SENSITIVITY,
      voice_speed: VOICE_SPEED,
      pronunciation_dictionary: PRONUNCIATION_DICTIONARY,
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
