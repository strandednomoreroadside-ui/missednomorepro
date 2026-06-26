import Stripe from "stripe";
import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { syncSubscription } from "@/lib/billing/sync";
import { clearPaymentFailed, handlePaymentFailed } from "@/lib/billing/dunning";
import { sendPaymentReceipt, sendSubscriptionReceipt } from "@/lib/email/receipts";

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
        } else if (session.mode === "payment" && session.payment_status === "paid") {
          // Customer payment (deposit/invoice/payment link) — mark it paid.
          const paymentId = session.metadata?.payment_id;
          const tenantId = session.metadata?.tenant_id;
          if (paymentId && tenantId) {
            await admin
              .from("payments")
              .update({
                status: "paid",
                paid_at: new Date().toISOString(),
                stripe_payment_intent:
                  typeof session.payment_intent === "string" ? session.payment_intent : null,
              })
              .eq("id", paymentId)
              .eq("tenant_id", tenantId);
          }
          // Receipt to the payer (best-effort; no-ops if Resend is off).
          await sendPaymentReceipt(session);
        }
        break;
      }
      case "invoice.paid": {
        // Subscription charge succeeded (first + renewals) → email a receipt
        // AND clear any dunning flag (the customer recovered).
        const invoice = event.data.object as Stripe.Invoice;
        await sendSubscriptionReceipt(admin, invoice);
        await clearPaymentFailed(admin, invoice);
        break;
      }
      case "invoice.payment_failed": {
        // A renewal charge failed → flag it + email the customer to update
        // their card before Stripe's retries run out.
        await handlePaymentFailed(admin, event.data.object as Stripe.Invoice);
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
