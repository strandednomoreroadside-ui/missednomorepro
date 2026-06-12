import Stripe from "stripe";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSubscription } from "@/lib/billing/sync";

/**
 * Stripe webhook (master plan §9): signature-verified and idempotent.
 * Stripe retries on any non-2xx, so failures release their idempotency
 * claim before returning 500.
 */
export async function POST(req: Request) {
  if (!env.STRIPE_SECRET_KEY || !env.STRIPE_WEBHOOK_SECRET) {
    return new NextResponse("billing not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new NextResponse("missing signature", { status: 400 });

  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  const payload = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch {
    return new NextResponse("signature verification failed", { status: 400 });
  }

  const admin = createAdminClient();

  // Idempotency: first writer wins; replays get a friendly 200.
  const { error: claimErr } = await admin
    .from("stripe_webhook_events")
    .insert({ id: event.id, type: event.type });
  if (claimErr) {
    if (claimErr.code === "23505") {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error("[stripe-webhook] idempotency store failed:", claimErr.message);
    return new NextResponse("storage failure", { status: 500 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode === "subscription" && session.subscription) {
          const sub = await stripe.subscriptions.retrieve(
            String(session.subscription)
          );
          await syncSubscription(admin, stripe, sub);
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await syncSubscription(admin, stripe, event.data.object as Stripe.Subscription);
        break;
      }
      default:
        // Only registered events arrive; anything else is safely ignored.
        break;
    }
  } catch (err) {
    // Release the claim so Stripe's retry can re-process this event.
    await admin.from("stripe_webhook_events").delete().eq("id", event.id);
    console.error(`[stripe-webhook] ${event.type} processing failed:`, err);
    return new NextResponse("processing failed", { status: 500 });
  }

  return NextResponse.json({ received: true });
}
