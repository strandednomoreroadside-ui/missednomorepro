// Read-only diagnostic: inspect the Stripe (test-mode) webhook endpoints —
// URL, status, and which events each is listening for. Tells us whether
// invoice.paid is registered and whether the endpoint is enabled.
// Run: node scripts/stripe-webhook-check.mjs
import { readFileSync } from "node:fs";
import Stripe from "stripe";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const stripe = new Stripe(env.STRIPE_SECRET_KEY);
const NEED = [
  "checkout.session.completed",
  "invoice.paid",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
];

const { data } = await stripe.webhookEndpoints.list({ limit: 100 });
if (!data.length) {
  console.log("No webhook endpoints found (test mode).");
  process.exit(0);
}
for (const e of data) {
  const events = e.enabled_events ?? [];
  const all = events.includes("*");
  const missing = all ? [] : NEED.filter((ev) => !events.includes(ev));
  console.log(`\nEndpoint ${e.id}`);
  console.log(`  url:     ${e.url}`);
  console.log(`  status:  ${e.status}`);
  console.log(`  events:  ${all ? "* (all)" : events.join(", ")}`);
  console.log(`  has invoice.paid: ${all || events.includes("invoice.paid") ? "YES" : "NO"}`);
  if (missing.length) console.log(`  MISSING: ${missing.join(", ")}`);
}
console.log(
  `\nVercel STRIPE_WEBHOOK_SECRET present locally: ${env.STRIPE_WEBHOOK_SECRET ? "yes" : "no"} (compare against the endpoint's signing secret in Stripe → Webhooks → reveal).`
);
