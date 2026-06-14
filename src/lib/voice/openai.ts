import type {
  ProviderAgentRef,
  RegisterCallInput,
  RegisterCallResult,
  NormalizedCallEvent,
  SyncAgentResult,
  VoiceAgentConfig,
  VoiceProvider,
} from "./types";
import { VoiceProviderNotImplementedError } from "./types";

/**
 * Path B placeholder — OpenAI Realtime direct (master plan §3.1 required
 * stack). M6 chose Path A (Retell) for speed; this class exists so the
 * adapter seam is real and Path B can be implemented later for margin
 * without touching the prompt builder, tools, or call pipeline.
 *
 * Implementing it means running a small always-on media gateway (Vercel
 * can't hold live call audio) and filling these four methods.
 */
export class OpenAiRealtimeProvider implements VoiceProvider {
  readonly id = "openai" as const;

  async syncAgent(
    _config: VoiceAgentConfig,
    _existing: ProviderAgentRef | null
  ): Promise<SyncAgentResult> {
    throw new VoiceProviderNotImplementedError(this.id);
  }

  async registerInboundCall(_input: RegisterCallInput): Promise<RegisterCallResult> {
    throw new VoiceProviderNotImplementedError(this.id);
  }

  verifyWebhook(_rawBody: string, _signature: string | null): boolean {
    throw new VoiceProviderNotImplementedError(this.id);
  }

  parseWebhookEvent(_payload: unknown): NormalizedCallEvent {
    throw new VoiceProviderNotImplementedError(this.id);
  }
}
