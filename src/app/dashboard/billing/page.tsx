import type { Metadata } from "next";
import { cookies } from "next/headers";
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
import { getBusinessTimezone } from "@/lib/business/timezone";
import { formatDateInZone } from "@/lib/calendar/timezone";
import { PLAN_META, PLAN_ORDER, lookupKey } from "@/lib/billing/plans";
import {
  ADDON_META,
  ADDON_ORDER,
  effectiveAddonKeys,
  type AddonKey,
} from "@/lib/billing/addons";
import {
  effectivePlan,
  getPlanLimits,
  getSubscription,
} from "@/lib/billing/subscription";
import { getUsageSummary, type UsageStatus } from "@/lib/billing/usage";
import { TRIAL_DAYS, TRIAL_VOICE_MINUTES, isTrialing, trialEndsAt } from "@/lib/billing/trial";
import { isStripeTestMode } from "@/lib/billing/stripe";
import { UsageMeter, type MeterStatus } from "@/components/billing/usage-meter";
import { IntervalToggle } from "@/components/billing/interval-toggle";
import { createClient } from "@/lib/supabase/server";

import { addAddon, openBillingPortal, removeAddon, startCheckout } from "./actions";

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
  const testMode = isStripeTestMode();

  const tz = await getBusinessTimezone(active.organization_id);
  const sub = await getSubscription(active.organization_id);
  const plan = effectivePlan(sub);
  const limits = await getPlanLimits(plan);
  const currentMeta = plan !== "none" ? PLAN_META[plan] : null;
  const usage: UsageStatus[] =
    plan !== "none"
      ? await getUsageSummary(active.organization_id, { sub, limits })
      : [];
  const meterStatuses: MeterStatus[] = usage.map((u) => ({
    kind: u.kind,
    used: u.used,
    limit: u.limit,
  }));

  // Active add-ons (members may read tenant_addons). Expand the bundle so the
  // three growth add-ons show as included when the bundle is active.
  const supabase = await createClient();
  const { data: addonRows } =
    plan !== "none"
      ? await supabase
          .from("tenant_addons")
          .select("addon_key")
          .eq("tenant_id", active.organization_id)
          .eq("status", "active")
      : { data: [] };
  const purchased = new Set<AddonKey>(
    ((addonRows ?? []) as { addon_key: AddonKey }[]).map((r) => r.addon_key)
  );
  const effectiveAddons = effectiveAddonKeys(purchased);

  const error = typeof sp.error === "string" ? sp.error : undefined;
  const success = sp.success === "1";
  const canceled = sp.canceled === "1";
  const addonSaved = sp.addon === "1";

  // Plan deep-linked from the landing (?plan=growth, or the signup_plan cookie
  // set at sign-up). Only highlight it while they have no plan yet.
  const chosenRaw =
    (typeof sp.plan === "string" ? sp.plan : "") ||
    (await cookies()).get("signup_plan")?.value ||
    "";
  const highlightPlan =
    plan === "none" && (PLAN_ORDER as readonly string[]).includes(chosenRaw)
      ? (chosenRaw as (typeof PLAN_ORDER)[number])
      : null;

  // Monthly/annual picker state (mirrors the landing), URL-driven so this stays
  // a server component.
  const interval: "month" | "year" = sp.interval === "year" ? "year" : "month";

  // Trial state: granted on the first subscription only. firstTime drives the
  // "start free trial" CTA copy; trialing drives the active-trial banner.
  const trialing = isTrialing(sub);
  const trialEnd = trialEndsAt(sub);
  const firstTime = !sub?.stripe_subscription_id;
  const trialMinutesUsed =
    usage.find((u) => u.kind === "voice_minutes")?.used ?? 0;

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
        {addonSaved && (
          <FormBanner kind="success">
            Add-ons updated. Your subscription was adjusted with prorated billing.
          </FormBanner>
        )}
        {highlightPlan && (
          <FormBanner kind="success">
            You picked <strong>{PLAN_META[highlightPlan].name}</strong> — start your{" "}
            {TRIAL_DAYS}-day free trial in the{" "}
            <a href={`#plan-${highlightPlan}`} className="underline underline-offset-2">
              highlighted plan
            </a>{" "}
            below.
          </FormBanner>
        )}
      </div>

      {trialing && currentMeta && (
        <Card className="border-cyan/30 bg-cyan/5">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
            <div>
              <p className="font-display text-base font-semibold text-foreground">
                Free trial active{trialEnd ? ` — ends ${formatDateInZone(trialEnd.toISOString(), tz)}` : ""}
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Using{" "}
                <span className="font-mono text-cyan">{trialMinutesUsed}</span> of{" "}
                <span className="font-mono text-cyan">{TRIAL_VOICE_MINUTES}</span> trial
                AI minutes. After the trial your card is charged ${currentMeta.monthly}/mo —
                cancel anytime in Manage billing, no charge.
              </p>
            </div>
            {canManage && sub?.stripe_customer_id && (
              <form action={openBillingPortal}>
                <Button type="submit" variant="outline" size="sm">
                  Manage billing
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      )}

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
                  renews {formatDateInZone(sub.current_period_end, tz)}
                </span>
              )}
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

      {/* Usage meter — count + near-limit upgrade nudge (hard cap, no overage) */}
      {plan !== "none" && meterStatuses.length > 0 && (
        <UsageMeter
          statuses={meterStatuses}
          planId={plan}
          trialVoiceCap={trialing ? TRIAL_VOICE_MINUTES : null}
          className="mt-2"
        />
      )}

      {/* ── Plan picker ── */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-lg font-semibold">
          {plan === "none" ? "Choose your plan" : "Change plan"}
        </h2>
        <IntervalToggle interval={interval} />
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {firstTime && (
          <span className="text-foreground">
            Every plan starts with a {TRIAL_DAYS}-day free trial — card required, cancel
            anytime before it ends and you&rsquo;re not charged.{" "}
          </span>
        )}
        {interval === "year" ? "Annual billing saves 20%." : "Switch to annual to save 20%."}
        {testMode && (
          <>
            {" "}
            Test mode: use card 4242&nbsp;4242&nbsp;4242&nbsp;4242, any future date,
            any CVC.
          </>
        )}
      </p>

      <div className="mt-5 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {PLAN_ORDER.map((id) => {
          const meta = PLAN_META[id];
          const isCurrent = plan === id;
          const isHighlight = id === highlightPlan;
          return (
            <div
              key={id}
              id={`plan-${id}`}
              className={`relative flex scroll-mt-24 flex-col rounded-xl p-5 ${
                meta.popular && !isCurrent
                  ? "border-glow"
                  : "border border-border bg-card/60"
              } ${isCurrent ? "border border-cyan/50" : ""} ${
                isHighlight ? "ring-2 ring-cyan/60" : ""
              }`}
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
                <span className="font-display text-2xl font-bold">
                  ${interval === "year" ? meta.annualMonthly.toFixed(2) : meta.monthly}
                </span>
                <span className="text-xs text-muted-foreground">/mo</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {interval === "year"
                  ? `billed annually ($${(meta.annualMonthly * 12).toFixed(0)}/yr)`
                  : `or $${meta.annualMonthly.toFixed(2)}/mo billed annually`}
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
                    <input type="hidden" name="lookup_key" value={lookupKey(id, interval)} />
                    <Button type="submit" className="w-full" size="sm">
                      {firstTime
                        ? `Start free trial`
                        : interval === "year"
                          ? `Annual — $${meta.annualMonthly.toFixed(2)}/mo`
                          : `Monthly — $${meta.monthly}`}
                    </Button>
                  </form>
                  {firstTime && (
                    <p className="text-center text-[11px] text-steel">
                      {TRIAL_DAYS} days free, then{" "}
                      {interval === "year"
                        ? `$${(meta.annualMonthly * 12).toFixed(0)}/yr`
                        : `$${meta.monthly}/mo`}
                    </p>
                  )}
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
        once you&rsquo;re subscribed. Your plan is a hard cap — you&rsquo;ll never be
        charged for going over. If you run low we&rsquo;ll prompt you to upgrade, and if
        you hit the cap, calls forward to your phone so nothing is missed.
      </p>

      {/* ── Add-ons ── */}
      <h2 className="mt-10 font-display text-lg font-semibold">Add-ons</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bolt on extra automation. Billed monthly on top of your plan, prorated
        from the day you add them.
        {plan === "none" && " Choose a plan first to enable add-ons."}
      </p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADDON_ORDER.map((key) => {
          const meta = ADDON_META[key];
          const isPurchased = purchased.has(key);
          const includedViaBundle = !isPurchased && effectiveAddons.has(key);
          const isActive = isPurchased || includedViaBundle;
          const canToggle = canManage && plan !== "none" && !!sub?.stripe_subscription_id;
          return (
            <div
              key={key}
              className={`flex flex-col rounded-xl p-5 ${
                isActive ? "border border-cyan/50 bg-cyan/5" : "border border-border bg-card/60"
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="font-display text-base font-semibold">{meta.name}</h3>
                <span className="font-mono text-sm text-cyan">+${meta.monthly}/mo</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{meta.blurb}</p>
              <ul className="mt-3 flex-1 space-y-1.5 border-t border-border/70 pt-3 text-xs text-muted-foreground">
                {meta.highlights.map((h) => (
                  <li key={h} className="flex items-center gap-1.5">
                    <Check className="size-3 shrink-0 text-cyan/70" strokeWidth={3} aria-hidden />
                    {h}
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                {includedViaBundle ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 px-2 py-1 text-[10px] font-medium uppercase text-cyan">
                    <Check className="size-3" strokeWidth={3} aria-hidden />
                    Included in Growth Suite
                  </span>
                ) : !canToggle ? (
                  <span className="text-[11px] text-steel">
                    {plan === "none" ? "Requires a plan" : isActive ? "Active" : ""}
                  </span>
                ) : isPurchased ? (
                  <form action={removeAddon}>
                    <input type="hidden" name="addon_key" value={key} />
                    <Button type="submit" variant="outline" size="sm" className="w-full">
                      Remove
                    </Button>
                  </form>
                ) : (
                  <form action={addAddon}>
                    <input type="hidden" name="addon_key" value={key} />
                    <Button type="submit" size="sm" className="w-full">
                      Add — ${meta.monthly}/mo
                    </Button>
                  </form>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
