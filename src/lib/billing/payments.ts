import "server-only";

import { getStripe } from "@/lib/billing/stripe";

/**
 * Create a one-time hosted Stripe Checkout link for a customer payment
 * (deposit / invoice / payment). Inline price_data means any amount works
 * without pre-creating a Price. The customer pays on Stripe's page — we
 * never touch card data. checkout.session.completed marks it paid.
 */
export async function createPaymentCheckout(opts: {
  paymentId: string;
  tenantId: string;
  amountCents: number;
  currency: string;
  description: string;
  origin: string;
}): Promise<{ url: string; sessionId: string }> {
  const stripe = getStripe();
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: opts.currency,
          unit_amount: opts.amountCents,
          product_data: { name: opts.description || "Payment" },
        },
      },
    ],
    metadata: { tenant_id: opts.tenantId, payment_id: opts.paymentId },
    payment_intent_data: {
      metadata: { tenant_id: opts.tenantId, payment_id: opts.paymentId },
    },
    success_url: `${opts.origin}/?paid=1`,
    cancel_url: `${opts.origin}/?paid=0`,
  });
  if (!session.url) throw new Error("Stripe did not return a payment URL.");
  return { url: session.url, sessionId: session.id };
}
