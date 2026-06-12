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
  // Hard rule: test mode until M10 — everywhere, including production.
  // M10's go-live step removes this guard deliberately.
  if (!env.STRIPE_SECRET_KEY.startsWith("sk_test_")) {
    throw new Error("Refusing non-test Stripe key during the build phase (see BUILD_GUIDE).");
  }
  stripeSingleton ??= new Stripe(env.STRIPE_SECRET_KEY);
  return stripeSingleton;
}
