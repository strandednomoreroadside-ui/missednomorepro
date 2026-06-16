import type { Metadata } from "next";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormBanner } from "@/components/form-banner";
import { requireActiveOrg } from "@/lib/auth";
import { PLAN_META, PLAN_ORDER, lookupKey } from "@/lib/billing/plans";
import {
  effectivePlan,
  getPlanLimits,
  getSubscription,
} from "@/lib/billing/subscription";
import { getUsageSummary, type UsageStatus } from "@/lib/billing/usage";

import { openBillingPortal, startCheckout } from "./actions";

export const metadata: Metadata = { title: "Billing" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BillingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const { active } = await requireActiveOrg();
  const canManage = active.role === "owner" || active.role === "admin";

  const sub = await getSubscription(active.organization_id);
  const plan = effectivePlan(sub);
  const limits = await getPlanLimits(plan);
  const currentMeta = plan !== "none" ? PLAN_META[plan] : null;
  const usage: UsageStatus[] =
    plan !== "none"
      ? await getUsageSummary(active.organization_id, { sub, limits })
      : [];
  const usageLabel: Record<UsageStatus["kind"], string> = {
    voice_minutes: "AI minutes",
    sms: "texts",
  };

  const error = typeof sp.error === "string" ? sp.error : undefined;
  const success = sp.success === "1";
  const canceled = sp.canceled === "1";

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Billing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Plans, payment method, and invoices for {active.organizations.name}.
      </p>

      <div className="mt-6">
        {error && <FormBanner kind="error">{error}</FormBanner>}
        {success && (
          <FormBanner kind="success">
            Payment received! Stripe&rsquo;s confirmation usually lands within a
            few seconds — refresh this page if your plan hasn&rsquo;t updated yet.
          </FormBanner>
        )}
        {canceled && (
          <FormBanner kind="error">
            Checkout canceled — nothing was charged.
          </FormBanner>
        )}
      </div>

      {/* ── Current plan ── */}
      <Card className="mt-2 bg-card/60">
        <CardHeader className="pb-3">
          <CardDescription>Current plan</CardDescription>
          <div className="flex flex-wrap items-center gap-3">
            <CardTitle className="font-display text-2xl">
              {currentMeta ? currentMeta.name : "No plan yet"}
            </CardTitle>
            {sub && plan !== "none" && (
              <span className="rounded-full border border-success/40 bg-success/10 px-2.5 py-0.5 text-xs text-success">
                {sub.status}
                {sub.cancel_at_period_end ? " · cancels at period end" : ""}
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {plan === "none" ? (
            <p className="text-sm text-muted-foreground">
              Pick a plan below to unlock your AI front office.
              {!canManage && " Ask the workspace owner to choose a plan."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm text-muted-foreground">
              <span>
                <span className="font-mono text-cyan">{limits.monthly_minutes.toLocaleString()}</span>{" "}
                AI minutes/mo
              </span>
              <span>
                <span className="font-mono text-cyan">{limits.simultaneous_calls}</span>{" "}
                concurrent calls
              </span>
              <span>
                <span className="font-mono text-cyan">{limits.monthly_sms.toLocaleString()}</span>{" "}
                texts/mo
              </span>
              <span>
                <span className="font-mono text-cyan">{limits.max_users}</span> users
              </span>
              {sub?.current_period_end && (
                <span>
                  renews {new Date(sub.current_period_end).toLocaleDateString()}
                </span>
              )}
            </div>
          )}
          {usage.length > 0 && (
            <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-border/60 pt-3 text-sm text-muted-foreground">
              <span className="font-mono text-[10px] uppercase tracking-widest text-steel">
                Used this period
              </span>
              {usage.map((u) => (
                <span key={u.kind}>
                  <span className="font-mono text-cyan">
                    {u.used.toLocaleString()}
                  </span>{" "}
                  / {u.limit.toLocaleString()} {usageLabel[u.kind]}
                </span>
              ))}
            </div>
          )}
          {canManage && sub?.stripe_customer_id && (
            <form action={openBillingPortal}>
              <Button type="submit" variant="outline" size="sm">
                Manage billing — payment method, invoices, cancel
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* ── Plan picker ── */}
      <h2 className="mt-10 font-display text-lg font-semibold">
        {plan === "none" ? "Choose your plan" : "Change plan"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Annual billing saves 20%. Test mode: use card 4242&nbsp;4242&nbsp;4242&nbsp;4242,
        any future date, any CVC.
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {PLAN_ORDER.map((id) => {
          const meta = PLAN_META[id];
          const isCurrent = plan === id;
          return (
            <div
              key={id}
              className={`relative flex flex-col rounded-xl p-5 ${
                meta.popular && !isCurrent
                  ? "border-glow"
                  : "border border-border bg-card/60"
              } ${isCurrent ? "border border-cyan/50" : ""}`}
            >
              {meta.popular && !isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Most popular
                </span>
              )}
              {isCurrent && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-cyan/50 bg-night px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-cyan">
                  Current plan
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{meta.name}</h3>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-display text-2xl font-bold">${meta.monthly}</span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground">
                or ${meta.annualMonthly.toFixed(2)}/mo billed annually
              </p>
              <ul className="mt-4 flex-1 space-y-1.5 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                {meta.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <Check className="size-3 shrink-0 text-cyan/70" strokeWidth={3} aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              {canManage && !isCurrent && (
                <div className="mt-4 space-y-2">
                  <form action={startCheckout}>
                    <input type="hidden" name="lookup_key" value={lookupKey(id, "month")} />
                    <Button type="submit" className="w-full" size="sm">
                      Monthly — ${meta.monthly}
                    </Button>
                  </form>
                  <form action={startCheckout}>
                    <input type="hidden" name="lookup_key" value={lookupKey(id, "year")} />
                    <Button type="submit" variant="outline" className="w-full" size="sm">
                      Annual — ${meta.annualMonthly.toFixed(2)}/mo
                    </Button>
                  </form>
                </div>
              )}
            </div>
          );
        })}

        {/* Enterprise — custom, contact sales (no self-serve checkout) */}
        <div className="relative flex flex-col rounded-xl border border-border bg-card/60 p-5">
          <h3 className="font-display text-lg font-semibold">{PLAN_META.enterprise.name}</h3>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="font-display text-2xl font-bold">Custom</span>
          </div>
          <p className="text-xs text-muted-foreground">{PLAN_META.enterprise.blurb}</p>
          <ul className="mt-4 flex-1 space-y-1.5 border-t border-border/70 pt-3 text-xs text-muted-foreground">
            {PLAN_META.enterprise.highlights.map((h) => (
              <li key={h} className="flex items-center gap-1.5">
                <Check className="size-3 shrink-0 text-cyan/70" strokeWidth={3} aria-hidden />
                {h}
              </li>
            ))}
          </ul>
          <a
            href="mailto:sales@missednomorepro.com?subject=Enterprise%20plan%20inquiry"
            className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-lg border border-border text-sm font-semibold text-foreground transition-colors hover:border-cyan/50 hover:text-cyan"
          >
            Contact sales
          </a>
        </div>
      </div>

      <p className="mt-6 text-xs text-steel">
        Plan changes and cancellations are handled through “Manage billing”
        once you&rsquo;re subscribed. Overage protection is built in — no
        surprise bills.
      </p>
    </div>
  );
}
