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

/** Speech-to-text + audio tuning for noisy roadside callers (wind, highway,
 *  bystanders). `fast` STT keeps turn latency low; boosted keywords and the
 *  strongest
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
const STT_MODE = "fast" as const;
const DENOISING_MODE = "noise-and-background-speech-cancellation" as const;
const INTERRUPTION_SENSITIVITY = 0.3;
/** Universal Retell tuning defaults. These mirror the live production line
 * and are applied whenever any agent is created or re-synced. */
const VOICE_MODEL = "eleven_flash_v2_5" as const;
const VOICE_SPEED = 1.04;
const VOICE_TEMPERATURE = 0.85;
const DYNAMIC_VOICE_SPEED = true;
const DYNAMIC_RESPONSIVENESS = true;
const RESPONSIVENESS = 1;
// Backchannels stay off until they pass a representative call corpus; false
// is intentional, not an omitted provider default.
const ENABLE_BACKCHANNEL = false;
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

/** What the agent says WHILE a tool runs (v14).
 *
 *  Retell's execution message defaults to type "prompt", meaning the model
 *  *generates* the filler. On a live call that produced rambling, choppy
 *  narration — a quote lookup opened with "Let me get your exact price for AC
 *  repair at 6466 Avalon Drive, Brook Park, Ohio, 4 4 1 4 2", reading the whole
 *  address (and a digit-spaced ZIP) back before the tool had even returned.
 *  Slow, robotic, and the worst possible first impression on the demo line.
 *
 *  These are spoken verbatim instead (execution_message_type "static_text"):
 *  short, natural, and varied per tool so the call keeps its rhythm without
 *  narrating the caller's own details back at them. */
const TOOL_FILLERS: Record<string, string> = {
  lookup_contact: "One moment.",
  create_contact: "Let me get that saved.",
  search_knowledge_base: "Let me check on that.",
  check_service_area: "Let me check that address.",
  check_calendar_availability: "Let me check the calendar.",
  book_appointment: "Booking that now.",
  reschedule_appointment: "Let me move that for you.",
  cancel_appointment: "One moment.",
  calculate_quote: "Let me get your exact price.",
  find_tow_destination: "Let me find some options nearby.",
  notify_staff: "Getting the team on it.",
  escalate_to_human: "Let me reach the team.",
  create_follow_up_task: "Noting that down.",
  send_sms: "Sending that over now.",
  mark_spam: "One moment.",
};
const DEFAULT_FILLER = "One moment.";

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
    execution_message_type: "static_text",
    execution_message_description: TOOL_FILLERS[t.name] ?? DEFAULT_FILLER,
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
    // Human handoff is a custom server tool, never a Retell-native transfer.
    // This prevents an LLM/provider tool-selection mismatch from turning a
    // requested person into an immediate text-only escalation.
    const tools = [...mapTools(config.tools), END_CALL_TOOL];

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
        responsiveness: RESPONSIVENESS,
        enable_dynamic_responsiveness: DYNAMIC_RESPONSIVENESS,
        enable_dynamic_voice_speed: DYNAMIC_VOICE_SPEED,
        enable_backchannel: ENABLE_BACKCHANNEL,
        handbook_config: { speech_normalization: true, smart_matching: true },
        voice_model: VOICE_MODEL,
        voice_speed: VOICE_SPEED,
        voice_temperature: VOICE_TEMPERATURE,
        pronunciation_dictionary: [...PRONUNCIATION_DICTIONARY, ...config.pronunciationDictionary],
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
      responsiveness: RESPONSIVENESS,
      enable_dynamic_responsiveness: DYNAMIC_RESPONSIVENESS,
      enable_dynamic_voice_speed: DYNAMIC_VOICE_SPEED,
      enable_backchannel: ENABLE_BACKCHANNEL,
      handbook_config: { speech_normalization: true, smart_matching: true },
      voice_model: VOICE_MODEL,
      voice_speed: VOICE_SPEED,
      voice_temperature: VOICE_TEMPERATURE,
      pronunciation_dictionary: [...PRONUNCIATION_DICTIONARY, ...config.pronunciationDictionary],
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
