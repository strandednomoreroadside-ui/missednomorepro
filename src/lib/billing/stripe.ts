import "server-only";

import Stripe from "stripe";

import { env } from "@/lib/env";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error(
      "Stripe is not configured — STRIPE_SECRET_KEY missing (BUILD_GUIDE M0)."
    );
  }
  // Live-mode unlocked at launch (M10 go-live). Test (sk_test_) and live
  // (sk_live_) keys both work — whichever is in the environment decides the
  // mode, so prod stays in test until live keys are swapped into Vercel.
  stripeSingleton ??= new Stripe(env.STRIPE_SECRET_KEY);
  return stripeSingleton;
}

/**
 * True when the configured Stripe key is a TEST key. Gates test-only UI hints
 * (e.g. the 4242 test card) so a real customer is never shown them once live
 * keys are in place. Matches sk_test_/rk_test_/pk_test_; defaults to false
 * (no test hint) when no key is configured.
 */
export function isStripeTestMode(): boolean {
  return env.STRIPE_SECRET_KEY?.includes("_test_") ?? false;
}
