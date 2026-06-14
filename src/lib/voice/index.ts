import "server-only";

import { env } from "@/lib/env";

import { OpenAiRealtimeProvider } from "./openai";
import { RetellVoiceProvider } from "./retell";
import type { VoiceProvider } from "./types";
import { VoiceProviderNotImplementedError } from "./types";

export type * from "./types";

let cached: VoiceProvider | null = null;

/**
 * The configured voice provider (master plan §3.1 abstraction). Keyed by
 * VOICE_PROVIDER — "retell" is the M6 decision. Everything in M7 goes
 * through this so the provider stays swappable.
 */
export function getVoiceProvider(): VoiceProvider {
  if (cached) return cached;

  switch (env.VOICE_PROVIDER ?? "retell") {
    case "retell":
      cached = new RetellVoiceProvider();
      break;
    case "openai":
      cached = new OpenAiRealtimeProvider();
      break;
    case "vapi":
      throw new VoiceProviderNotImplementedError("vapi");
    default:
      cached = new RetellVoiceProvider();
  }
  return cached;
}
