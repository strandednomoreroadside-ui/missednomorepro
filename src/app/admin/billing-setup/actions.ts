"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type Stripe from "stripe";

import { isPlatformAdmin } from "@/lib/auth";
import { getStripe } from "@/lib/billing/stripe";
import { ALL_LOOKUP_KEYS, PLAN_META, PLAN_ORDER, lookupKey } from "@/lib/billing/plans";
import {
  ADDON_META,
  ADDON_ORDER,
  ALL_ADDON_LOOKUP_KEYS,
  addonLookupKey,
} from "@/lib/billing/addons";
import { env } from "@/lib/env";
import { getOrigin } from "@/lib/request";

import { SETUP_RESULT_COOKIE } from "./shared";

/** §6.1 amounts in cents, derived from the plan catalog. Annual = 12 × 80%. */
function amounts(plan: (typeof PLAN_ORDER)[number]) {
  const monthly = Math.round(PLAN_META[plan].monthly * 100);
  return { monthly, annual: Math.round(monthly * 12 * 0.8) };
}

/** The deployed app's base URL — never a localhost webhook. */
async function productionBaseUrl(): Promise<string> {
  const configured = env.NEXT_PUBLIC_APP_URL;
  if (configured.startsWith("https://")) return configured.replace(/\/$/, "");
  return (await getOrigin()).replace(/\/$/, "");
}

/**
 * One-tap Stripe setup (mobile-friendly replacement for
 * scripts/stripe-setup.mjs). Idempotent — safe to run again. Creates:
 * test-mode products/prices, the production webhook endpoint, and a
 * Customer Portal configuration. getStripe() refuses non-test keys.
 */
export async function runStripeSetup() {
  if (!(await isPlatformAdmin())) redirect("/dashboard");

  const stripe = getStripe();
  const log: string[] = [];
  let webhookSecret: string | null = null;

  // ── Products & prices ──────────────────────────────────────────
  // Stripe caps lookup_keys filtering at 10; list all and match in code.
  const existing = await stripe.prices.list({ limit: 100 });
  const have = new Set(existing.data.map((p) => p.lookup_key));

  for (const plan of PLAN_ORDER) {
    const meta = PLAN_META[plan];
    const { monthly, annual } = amounts(plan);
    const monthlyKey = lookupKey(plan, "month");
    const annualKey = lookupKey(plan, "year");
    if (have.has(monthlyKey) && have.has(annualKey)) {
      log.push(`= ${meta.name}: prices already exist`);
      continue;
    }

    const search = await stripe.products.search({
      query: `metadata['plan']:'${plan}'`,
      limit: 1,
    });
    const product =
      search.data[0] ??
      (await stripe.products.create({
        name: `Missed No More Pro — ${meta.name}`,
        metadata: { plan },
      }));

    if (!have.has(monthlyKey)) {
      await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: monthly,
        recurring: { interval: "month" },
        lookup_key: monthlyKey,
        metadata: { plan, interval: "month" },
      });
      log.push(`+ ${meta.name} monthly $${(monthly / 100).toFixed(2)}`);
    }
    if (!have.has(annualKey)) {
      await stripe.prices.create({
        product: product.id,
        currency: "usd",
        unit_amount: annual,
        recurring: { interval: "year" },
        lookup_key: annualKey,
        metadata: { plan, interval: "year" },
      });
      log.push(`+ ${meta.name} annual $${(annual / 100).toFixed(2)}/yr`);
    }
  }

  // ── Add-on products & prices (monthly only) ────────────────────
  for (const key of ADDON_ORDER) {
    const meta = ADDON_META[key];
    const lk = addonLookupKey(key);
    if (have.has(lk)) {
      log.push(`= Add-on ${meta.name}: price already exists`);
      continue;
    }
    const search = await stripe.products.search({
      query: `metadata['addon']:'${key}'`,
      limit: 1,
    });
    const product =
      search.data[0] ??
      (await stripe.products.create({
        name: `Missed No More Pro — ${meta.name}`,
        metadata: { addon: key },
      }));
    await stripe.prices.create({
      product: product.id,
      currency: "usd",
      unit_amount: Math.round(meta.monthly * 100),
      recurring: { interval: "month" },
      lookup_key: lk,
      metadata: { addon: key },
    });
    log.push(`+ Add-on ${meta.name} $${meta.monthly}/mo`);
  }

  // ── Webhook endpoint on the production URL ─────────────────────
  // Single source of truth for the events our handler processes.
  const WEBHOOK_EVENTS: Stripe.WebhookEndpointCreateParams.EnabledEvent[] = [
    "checkout.session.completed",
    "invoice.paid",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];
  const webhookUrl = `${await productionBaseUrl()}/api/stripe/webhook`;
  const endpoints = await stripe.webhookEndpoints.list({ limit: 100 });
  const existingEndpoint = endpoints.data.find((e) => e.url === webhookUrl);
  if (existingEndpoint) {
    // Endpoint exists — reconcile its event list IN PLACE so adding an event
    // later (e.g. invoice.paid) only needs a re-run, not a delete+recreate.
    // An in-place update keeps the same signing secret (no Vercel change).
    const current = existingEndpoint.enabled_events ?? [];
    const missing = current.includes("*")
      ? []
      : WEBHOOK_EVENTS.filter((ev) => !current.includes(ev));
    if (missing.length === 0) {
      log.push(`= Webhook endpoint already registered: ${webhookUrl}`);
    } else {
      const merged = Array.from(new Set<string>([...current, ...WEBHOOK_EVENTS]));
      await stripe.webhookEndpoints.update(existingEndpoint.id, {
        enabled_events: merged as Stripe.WebhookEndpointUpdateParams.EnabledEvent[],
      });
      log.push(`~ Webhook endpoint updated (+${missing.join(", ")}): ${webhookUrl}`);
    }
  } else {
    const endpoint = await stripe.webhookEndpoints.create({
      url: webhookUrl,
      enabled_events: WEBHOOK_EVENTS,
    });
    webhookSecret = endpoint.secret ?? null;
    log.push(`+ Webhook endpoint created: ${webhookUrl}`);
  }

  // ── Customer Portal configuration ──────────────────────────────
  const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
  if (configs.data.some((c) => c.active)) {
    log.push("= Customer Portal already configured");
  } else {
    // Allow switching between every plan/interval + managing add-ons.
    const expectedSet = new Set([...ALL_LOOKUP_KEYS, ...ALL_ADDON_LOOKUP_KEYS]);
    const priceList = await stripe.prices.list({ limit: 100 });
    const prices = { data: priceList.data.filter((p) => p.lookup_key && expectedSet.has(p.lookup_key)) };
    const byProduct = new Map<string, string[]>();
    for (const price of prices.data) {
      const product = typeof price.product === "string" ? price.product : price.product.id;
      byProduct.set(product, [...(byProduct.get(product) ?? []), price.id]);
    }
    const products: Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product[] =
      [...byProduct.entries()].map(([product, priceIds]) => ({
        product,
        prices: priceIds,
      }));

    const base = await productionBaseUrl();
    await stripe.billingPortal.configurations.create({
      business_profile: {
        headline: "Missed No More Pro — manage your subscription",
        privacy_policy_url: `${base}/privacy`,
        terms_of_service_url: `${base}/terms`,
      },
      features: {
        invoice_history: { enabled: true },
        payment_method_update: { enabled: true },
        subscription_cancel: { enabled: true, mode: "at_period_end" },
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products,
        },
      },
    });
    log.push("+ Customer Portal configured (plan switch, cancel, invoices)");
  }

  // Flash the result (incl. the show-once signing secret) via a short-
  // lived cookie — never through the URL.
  const cookieStore = await cookies();
  cookieStore.set(SETUP_RESULT_COOKIE, JSON.stringify({ log, webhookSecret }), {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/admin",
    maxAge: 600,
  });

  redirect("/admin/billing-setup");
}
