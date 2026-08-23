// Creates the §6.1 plans as Stripe TEST-mode products/prices and the
// production webhook endpoint. Idempotent — safe to run again.
// Run: node scripts/stripe-setup.mjs
// No PC handy? /admin/billing-setup on the deployed site does the same
// (plus the Customer Portal config) from any browser.
import { readFileSync, writeFileSync } from "node:fs";
import Stripe from "stripe";

const ENV_PATH = ".env.local";
const envText = readFileSync(ENV_PATH, "utf8");
const env = Object.fromEntries(
  envText
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const key = env.STRIPE_SECRET_KEY;
if (!key) throw new Error("STRIPE_SECRET_KEY missing in .env.local");
// Hard rule (BUILD_GUIDE): Stripe stays in TEST mode until M10.
if (!key.startsWith("sk_test_")) {
  throw new Error("Refusing to run: STRIPE_SECRET_KEY is not a TEST key (sk_test_…).");
}

const stripe = new Stripe(key);
const WEBHOOK_URL = "https://missednomorepro.com/api/stripe/webhook";

// Current public catalog — monthly cents and annual cents (12 × monthly × 0.8).
const PLANS = [
  { plan: "starter", name: "Starter", monthly: 7900, annual: 75840 },
  { plan: "growth", name: "Growth", monthly: 15900, annual: 152640 },
  { plan: "professional", name: "Professional", monthly: 27900, annual: 267840 },
  { plan: "elite", name: "Elite", monthly: 47900, annual: 459840 },
];

const lookupKeys = PLANS.flatMap((p) => [
  `plan_${p.plan}_monthly`,
  `plan_${p.plan}_annual`,
]);
const existing = await stripe.prices.list({ lookup_keys: lookupKeys, limit: 100 });
const have = new Set(existing.data.map((p) => p.lookup_key));

for (const p of PLANS) {
  const monthlyKey = `plan_${p.plan}_monthly`;
  const annualKey = `plan_${p.plan}_annual`;
  if (have.has(monthlyKey) && have.has(annualKey)) {
    console.log(`= ${p.name}: prices already exist, skipping`);
    continue;
  }

  // Reuse the product if a previous run created it.
  const search = await stripe.products.search({
    query: `metadata['plan']:'${p.plan}'`,
    limit: 1,
  });
  const product =
    search.data[0] ??
    (await stripe.products.create({
      name: `Missed No More Pro — ${p.name}`,
      metadata: { plan: p.plan },
    }));

  if (!have.has(monthlyKey)) {
    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: p.monthly,
      recurring: { interval: "month" },
      lookup_key: monthlyKey,
      metadata: { plan: p.plan, interval: "month" },
    });
    console.log(`+ ${p.name} monthly  $${(p.monthly / 100).toFixed(2)}  (${monthlyKey})`);
  }
  if (!have.has(annualKey)) {
    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: p.annual,
      recurring: { interval: "year" },
      lookup_key: annualKey,
      metadata: { plan: p.plan, interval: "year" },
    });
    console.log(`+ ${p.name} annual   $${(p.annual / 100).toFixed(2)}/yr  (${annualKey})`);
  }
}

// ── Webhook endpoint (production URL) ──────────────────────────
const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
let endpoint = endpoints.data.find((e) => e.url === WEBHOOK_URL);
if (endpoint) {
  console.log(`= Webhook endpoint already registered: ${WEBHOOK_URL}`);
  console.log("  (its signing secret was shown when first created — already in .env.local)");
} else {
  endpoint = await stripe.webhookEndpoints.create({
    url: WEBHOOK_URL,
    enabled_events: [
      "checkout.session.completed",
      "customer.subscription.created",
      "customer.subscription.updated",
      "customer.subscription.deleted",
    ],
  });
  console.log(`+ Webhook endpoint created: ${WEBHOOK_URL}`);
  const secret = endpoint.secret;
  if (secret) {
    const updated = envText.replace(
      /^STRIPE_WEBHOOK_SECRET=.*$/m,
      `STRIPE_WEBHOOK_SECRET=${secret}`
    );
    writeFileSync(ENV_PATH, updated);
    console.log("+ Signing secret written to .env.local (STRIPE_WEBHOOK_SECRET)");
    console.log(`  >>> ADD TO VERCEL TOO: STRIPE_WEBHOOK_SECRET=${secret}`);
  }
}

console.log("\nDone. Stripe test-mode catalog is ready.");
