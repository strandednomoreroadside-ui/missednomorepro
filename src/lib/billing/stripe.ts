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
  // Test and live secret keys are both supported; reject malformed values.
  if (
    !env.STRIPE_SECRET_KEY.startsWith("sk_test_") &&
    !env.STRIPE_SECRET_KEY.startsWith("sk_live_") &&
    !env.STRIPE_SECRET_KEY.startsWith("rk_test_") &&
    !env.STRIPE_SECRET_KEY.startsWith("rk_live_")
  ) {
    throw new Error("STRIPE_SECRET_KEY is not a valid Stripe secret key (expected sk_/rk_ prefix).");
  }
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
