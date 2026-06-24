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
