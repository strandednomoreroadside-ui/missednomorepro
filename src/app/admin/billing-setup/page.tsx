import type { Metadata } from "next";
import { cookies } from "next/headers";
import { CheckCircle2, CircleAlert, CircleDashed } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ALL_LOOKUP_KEYS } from "@/lib/billing/plans";
import { ALL_ADDON_LOOKUP_KEYS } from "@/lib/billing/addons";
import { getStripe, isStripeTestMode } from "@/lib/billing/stripe";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

import { runStripeSetup } from "./actions";
import { SETUP_RESULT_COOKIE, type SetupResult } from "./shared";

export const metadata: Metadata = { title: "Billing setup" };
export const dynamic = "force-dynamic";

type CheckState = "ok" | "todo" | "error";
type Check = { label: string; state: CheckState; detail: string };

function StatusIcon({ state }: { state: CheckState }) {
  if (state === "ok")
    return <CheckCircle2 className="size-4 shrink-0 text-success" aria-hidden />;
  if (state === "error")
    return <CircleAlert className="size-4 shrink-0 text-alert" aria-hidden />;
  return <CircleDashed className="size-4 shrink-0 text-steel/60" aria-hidden />;
}

async function migrationCheck(): Promise<Check> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("plan_limits").select("plan");
    if (error) {
      return {
        label: "Database migration (billing tables)",
        state: "todo",
        detail:
          "plan_limits not found — paste supabase/migrations/20260612090000_billing.sql into the Supabase SQL editor.",
      };
    }
    const count = data?.length ?? 0;
    return count >= 6
      ? {
          label: "Database migration (billing tables)",
          state: "ok",
          detail: `Applied — ${count} plan rows seeded.`,
        }
      : {
          label: "Database migration (billing tables)",
          state: "todo",
          detail: `Tables exist but only ${count} plan rows — re-run the migration's seed section.`,
        };
  } catch (err) {
    return {
      label: "Database migration (billing tables)",
      state: "error",
      detail: err instanceof Error ? err.message : "Database check failed.",
    };
  }
}

async function stripeChecks(): Promise<Check[]> {
  if (!env.STRIPE_SECRET_KEY) {
    return [
      {
        label: "Stripe API key",
        state: "todo",
        detail: "STRIPE_SECRET_KEY is not set in this deployment's environment.",
      },
    ];
  }
  try {
    const stripe = getStripe();
    const expectedKeys = [...ALL_LOOKUP_KEYS, ...ALL_ADDON_LOOKUP_KEYS];
    // Stripe caps lookup_keys filtering at 10, so list all prices and match
    // in code (test accounts have far fewer than 100 prices).
    const [prices, endpoints, portals] = await Promise.all([
      stripe.prices.list({ limit: 100 }),
      stripe.webhookEndpoints.list({ limit: 100 }),
      stripe.billingPortal.configurations.list({ limit: 10 }),
    ]);

    const expectedSet = new Set(expectedKeys);
    const found = prices.data.filter(
      (p) => p.lookup_key && expectedSet.has(p.lookup_key)
    ).length;
    const webhook = endpoints.data.find((e) => e.url.endsWith("/api/stripe/webhook"));
    const portalReady = portals.data.some((c) => c.active);

    return [
      {
        label: `Plan + add-on catalog in Stripe (${expectedKeys.length} prices)`,
        state: found === expectedKeys.length ? "ok" : "todo",
        detail:
          found === expectedKeys.length
            ? "All plans (monthly + annual) and add-ons exist."
            : `${found} of ${expectedKeys.length} prices exist — run setup below.`,
      },
      {
        label: "Stripe webhook endpoint",
        state: webhook ? "ok" : "todo",
        detail: webhook
          ? `Registered: ${webhook.url}`
          : "Not registered — run setup below.",
      },
      {
        label: "Webhook signing secret in this deployment",
        state: env.STRIPE_WEBHOOK_SECRET ? "ok" : "todo",
        detail: env.STRIPE_WEBHOOK_SECRET
          ? "STRIPE_WEBHOOK_SECRET is set."
          : "STRIPE_WEBHOOK_SECRET missing — run setup, copy the secret it shows into Vercel, then redeploy.",
      },
      {
        label: "Customer Portal",
        state: portalReady ? "ok" : "todo",
        detail: portalReady
          ? "Configured — “Manage billing” will work."
          : "No active portal configuration — run setup below.",
      },
    ];
  } catch (err) {
    return [
      {
        label: "Stripe connection",
        state: "error",
        detail: err instanceof Error ? err.message : "Stripe check failed.",
      },
    ];
  }
}

export default async function BillingSetupPage() {
  // Layout already gates on isPlatformAdmin.
  const testMode = isStripeTestMode();
  const [migration, stripeStatus] = await Promise.all([
    migrationCheck(),
    stripeChecks(),
  ]);
  const checks = [migration, ...stripeStatus];

  let result: SetupResult | null = null;
  const cookieStore = await cookies();
  const raw = cookieStore.get(SETUP_RESULT_COOKIE)?.value;
  if (raw) {
    try {
      result = JSON.parse(raw) as SetupResult;
    } catch {
      result = null;
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          Billing setup
        </h1>
        <span
          className={`rounded-full border px-2.5 py-0.5 font-mono text-xs uppercase tracking-wide ${
            testMode
              ? "border-steel/40 bg-steel/10 text-steel"
              : "border-success/50 bg-success/10 text-success"
          }`}
        >
          {testMode ? "Test mode" : "Live mode"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        One-tap Stripe configuration ({testMode ? "test" : "live"} mode) — products,
        webhook, and Customer Portal. Idempotent: running it again only fills gaps.
      </p>

      {result && (
        <Card className="mt-6 border-cyan/40 bg-card/60">
          <CardHeader>
            <CardTitle className="font-display text-lg">Setup run finished</CardTitle>
            <CardDescription>
              This summary disappears after 10 minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <ul className="space-y-1 font-mono text-xs text-muted-foreground">
              {result.log.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
            {result.webhookSecret && (
              <div className="rounded-lg border border-alert/40 bg-alert/10 p-4 text-sm">
                <p className="font-semibold text-alert">
                  Action needed — copy this signing secret now (shown once):
                </p>
                <p className="mt-2 break-all rounded bg-night/80 p-2 font-mono text-xs text-foreground">
                  {result.webhookSecret}
                </p>
                <ol className="mt-3 list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
                  <li>Open vercel.com → your project → Settings → Environment Variables</li>
                  <li>
                    Add <span className="font-mono">STRIPE_WEBHOOK_SECRET</span> with the
                    value above (all environments)
                  </li>
                  <li>Deployments → ⋯ on the latest → Redeploy</li>
                </ol>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Status</CardTitle>
          <CardDescription>Live checks against the database and Stripe.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2.5 text-sm">
                <span className="mt-0.5">
                  <StatusIcon state={check.state} />
                </span>
                <span>
                  <span className="font-medium text-foreground">{check.label}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {check.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <form action={runStripeSetup} className="mt-6">
            <Button type="submit" disabled={!env.STRIPE_SECRET_KEY}>
              Run Stripe setup
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
