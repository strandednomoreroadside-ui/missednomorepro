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
 * scripts/stripe-setup.mjs). Idempotent — safe to run again. Creates, in
 * whichever Stripe mode the environment's key selects (test or live):
 * products/prices, the production webhook endpoint, and a Customer Portal
 * configuration. Test and live are fully separate, so this must be re-run
 * once after live keys are added — it returns the new live webhook secret.
 */
export async function runStripeSetup() {
  if (!(await isPlatformAdmin())) redirect("/dashboard");

  const stripe = getStripe();
  const log: string[] = [];
  let webhookSecret: string | null = null;

  // ── Products & prices ──────────────────────────────────────────
  // Stripe caps lookup_keys filtering at 10; list all and match in code.
  // Prices are immutable in Stripe, so a plan_limits price change (e.g. the
  // 20% across-the-board cut) can't edit unit_amount in place. Instead we
  // detect a mismatch and mint a replacement price with the SAME lookup_key
  // via transfer_lookup_key — Stripe atomically moves the key over, so every
  // future checkout (which always resolves the price BY lookup_key) picks up
  // the new amount immediately. Existing subscribers keep their current
  // price/amount until they change plans — that's intentional, not a bug.
  const existing = await stripe.prices.list({ limit: 100, active: true });
  const byLookupKey = new Map(existing.data.filter((p) => p.lookup_key).map((p) => [p.lookup_key!, p]));

  async function ensurePrice(opts: {
    product: string;
    key: string;
    amount: number;
    interval: "month" | "year";
    metadata: Record<string, string>;
    label: string;
  }) {
    const current = byLookupKey.get(opts.key);
    if (current) {
      if (current.unit_amount === opts.amount) {
        log.push(`= ${opts.label}: already $${(opts.amount / 100).toFixed(2)}`);
        return current;
      }
      const fresh = await stripe.prices.create({
        product: opts.product,
        currency: "usd",
        unit_amount: opts.amount,
        recurring: { interval: opts.interval },
        lookup_key: opts.key,
        transfer_lookup_key: true,
        metadata: opts.metadata,
      });
      await stripe.prices.update(current.id, { active: false });
      byLookupKey.set(opts.key, fresh);
      log.push(
        `~ ${opts.label}: $${((current.unit_amount ?? 0) / 100).toFixed(2)} → $${(opts.amount / 100).toFixed(2)} (old price archived)`
      );
      return fresh;
    }
    const created = await stripe.prices.create({
      product: opts.product,
      currency: "usd",
      unit_amount: opts.amount,
      recurring: { interval: opts.interval },
      lookup_key: opts.key,
      metadata: opts.metadata,
    });
    byLookupKey.set(opts.key, created);
    log.push(`+ ${opts.label} $${(opts.amount / 100).toFixed(2)}`);
    return created;
  }

  for (const plan of PLAN_ORDER) {
    const meta = PLAN_META[plan];
    const { monthly, annual } = amounts(plan);
    const monthlyKey = lookupKey(plan, "month");
    const annualKey = lookupKey(plan, "year");

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

    await ensurePrice({
      product: product.id,
      key: monthlyKey,
      amount: monthly,
      interval: "month",
      metadata: { plan, interval: "month" },
      label: `${meta.name} monthly`,
    });
    await ensurePrice({
      product: product.id,
      key: annualKey,
      amount: annual,
      interval: "year",
      metadata: { plan, interval: "year" },
      label: `${meta.name} annual`,
    });
  }

  // ── Add-on products & prices (monthly only) ────────────────────
  for (const key of ADDON_ORDER) {
    const meta = ADDON_META[key];
    const lk = addonLookupKey(key);
    if (byLookupKey.has(lk)) {
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
    "invoice.payment_failed",
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
  // Reconciled EVERY run (not just created once) — the portal's
  // subscription_update.products list pins specific price IDs, so after a
  // price change (old price archived, new one minted above) the portal must
  // be re-pointed or customers switching plans there would still see stale
  // prices even though checkout/billing-page already show the new ones.
  const expectedSet = new Set([...ALL_LOOKUP_KEYS, ...ALL_ADDON_LOOKUP_KEYS]);
  const priceList = await stripe.prices.list({ limit: 100, active: true });
  const currentPrices = priceList.data.filter((p) => p.lookup_key && expectedSet.has(p.lookup_key));
  const byProduct = new Map<string, string[]>();
  for (const price of currentPrices) {
    const product = typeof price.product === "string" ? price.product : price.product.id;
    byProduct.set(product, [...(byProduct.get(product) ?? []), price.id]);
  }
  const portalProducts: Stripe.BillingPortal.ConfigurationCreateParams.Features.SubscriptionUpdate.Product[] =
    [...byProduct.entries()].map(([product, priceIds]) => ({
      product,
      prices: priceIds,
    }));

  const base = await productionBaseUrl();
  const configs = await stripe.billingPortal.configurations.list({ limit: 10 });
  const activeConfig = configs.data.find((c) => c.active);
  if (activeConfig) {
    await stripe.billingPortal.configurations.update(activeConfig.id, {
      features: {
        subscription_update: {
          enabled: true,
          default_allowed_updates: ["price"],
          proration_behavior: "create_prorations",
          products: portalProducts,
        },
      },
    });
    log.push("~ Customer Portal price list refreshed");
  } else {
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
          products: portalProducts,
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
