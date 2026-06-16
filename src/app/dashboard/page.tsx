import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Check, CircleDashed, Lock, Rocket, Wand2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { PLAN_META } from "@/lib/billing/plans";
import {
  effectivePlan,
  getPlanLimits,
  getSubscription,
  hasFeature,
  type PlanLimits,
} from "@/lib/billing/subscription";
import { STEP_META, isStepId } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { label: "Jobs booked", value: "0", hint: "arrives at M9 — booking" },
  { label: "Revenue recovered", value: "$0", hint: "arrives at M7+" },
];

/** Plan-gated modules (master plan §6.1/§7) and the plan that unlocks each. */
const GATED_FEATURES: { flag: string; label: string; unlockedBy: string }[] = [
  { flag: "booking", label: "Calendar booking", unlockedBy: "Starter" },
  { flag: "lead_pipeline", label: "Lead pipeline", unlockedBy: "Growth" },
  { flag: "analytics", label: "Analytics dashboard", unlockedBy: "Growth" },
  { flag: "followup_campaigns", label: "AI follow-ups", unlockedBy: "Growth" },
  { flag: "dispatch_board", label: "Dispatch board", unlockedBy: "Professional" },
  { flag: "multi_location", label: "Multi-location", unlockedBy: "Elite" },
  { flag: "api_access", label: "API access", unlockedBy: "Elite" },
];

const PROGRESS: { label: string; done: boolean }[] = [
  { label: "M1 — Branded site live", done: true },
  { label: "M2 — Accounts & secure workspaces", done: true },
  { label: "M3 — Billing & plans", done: true },
  { label: "M4 — Setup wizard", done: true },
  { label: "M5 — CRM", done: true },
  { label: "M6/M7 — Phone + AI receptionist", done: false },
];

export default async function DashboardPage() {
  const { active } = await requireActiveOrg();

  // Setup status for the callout card (business may not exist until
  // the wizard is opened for the first time) + live lead count.
  const supabase = await createClient();
  const [{ data: business }, { count: leadCount }, { count: callCount }] =
    await Promise.all([
      supabase
        .from("businesses")
        .select("id, name, status, setup_states ( current_step )")
        .eq("tenant_id", active.organization_id)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("leads")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", active.organization_id),
      supabase
        .from("calls")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", active.organization_id),
    ]);
  const setupState = Array.isArray(business?.setup_states)
    ? business.setup_states[0]
    : business?.setup_states;
  const isLive = business?.status === "live";
  const currentStep =
    setupState?.current_step && isStepId(setupState.current_step)
      ? STEP_META[setupState.current_step].title
      : null;

  // Billing data is absent until the M3 migration runs — degrade to
  // "no plan" rather than taking the dashboard down.
  let planName: string | null = null;
  let limits: PlanLimits | null = null;
  try {
    const sub = await getSubscription(active.organization_id);
    const plan = effectivePlan(sub);
    limits = await getPlanLimits(plan);
    planName = plan === "none" ? null : PLAN_META[plan].name;
  } catch (err) {
    unstable_rethrow(err); // never swallow Next.js control-flow errors
    console.error("[dashboard] billing lookup failed:", err);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Welcome, {active.organizations.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your AI front office is under construction — here&rsquo;s the live
        picture as modules come online.
      </p>

      {/* Setup callout — the path to going live */}
      <Card
        className={
          isLive
            ? "mt-8 border-success/30 bg-success/5"
            : "mt-8 border-cyan/25 bg-cyan/5"
        }
      >
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div className="flex items-center gap-3.5">
            <span
              className={
                isLive
                  ? "inline-flex size-10 items-center justify-center rounded-full border border-success/40 bg-success/10"
                  : "inline-flex size-10 items-center justify-center rounded-full border border-cyan/30 bg-cyan/10"
              }
            >
              {isLive ? (
                <Rocket className="size-4.5 text-success" aria-hidden />
              ) : (
                <Wand2 className="size-4.5 text-cyan" aria-hidden />
              )}
            </span>
            <div>
              <p className="font-display text-base font-semibold text-foreground">
                {isLive
                  ? `${business?.name} is live`
                  : business
                    ? "Finish setting up your business"
                    : "Set up your business"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isLive
                  ? "Setup is complete — the AI receptionist arrives at M7."
                  : currentStep && business
                    ? `You left off at “${currentStep}.” Your progress is saved.`
                    : "Teach the AI about your services, prices, area, and hours."}
              </p>
            </div>
          </div>
          {!isLive && (
            <Link href="/dashboard/setup" className={buttonVariants()}>
              {business ? "Resume setup" : "Start setup"}
            </Link>
          )}
        </CardContent>
      </Card>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>Calls received</CardDescription>
            <CardTitle className="font-mono text-3xl text-cyan">
              {callCount ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-steel">
              <Link href="/dashboard/calls" className="hover:text-cyan">
                open call log →
              </Link>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card/60">
          <CardHeader className="pb-2">
            <CardDescription>Leads captured</CardDescription>
            <CardTitle className="font-mono text-3xl text-cyan">
              {leadCount ?? 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-steel">
              <Link href="/dashboard/contacts" className="hover:text-cyan">
                manage contacts →
              </Link>
            </p>
          </CardContent>
        </Card>
        {STATS.map((stat) => (
          <Card key={stat.label} className="bg-card/60">
            <CardHeader className="pb-2">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="font-mono text-3xl text-cyan">
                {stat.value}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-steel">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="mt-8 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Plan features</CardTitle>
          <CardDescription>
            {planName ? (
              <>
                You&rsquo;re on the <span className="text-cyan">{planName}</span>{" "}
                plan. Locked features unlock on higher plans.
              </>
            ) : (
              <>
                No plan yet — everything below is locked until you{" "}
                <Link href="/dashboard/billing" className="text-cyan underline-offset-2 hover:underline">
                  choose a plan
                </Link>
                .
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {GATED_FEATURES.map((feature) => {
              const unlocked = limits ? hasFeature(limits, feature.flag) : false;
              return (
                <li key={feature.flag} className="flex items-center gap-2.5 text-sm">
                  {unlocked ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full border border-success/40 bg-success/10">
                      <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <span className="inline-flex size-5 items-center justify-center rounded-full border border-border/70 bg-night/40">
                      <Lock className="size-3 text-steel/70" aria-hidden />
                    </span>
                  )}
                  <span className={unlocked ? "text-foreground" : "text-muted-foreground"}>
                    {feature.label}
                  </span>
                  {!unlocked && (
                    <Link
                      href="/dashboard/billing"
                      className="ml-auto rounded-full border border-cyan/30 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan transition-colors hover:bg-cyan/10"
                    >
                      {feature.unlockedBy}+
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>

      <Card className="mt-8 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Build progress</CardTitle>
          <CardDescription>
            What your operating system can do today, and what lands next.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5">
            {PROGRESS.map((step) => (
              <li key={step.label} className="flex items-center gap-2.5 text-sm">
                {step.done ? (
                  <span className="inline-flex size-5 items-center justify-center rounded-full border border-success/40 bg-success/10">
                    <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
                  </span>
                ) : (
                  <CircleDashed className="size-5 text-steel/50" aria-hidden />
                )}
                <span className={step.done ? "text-foreground" : "text-muted-foreground"}>
                  {step.label}
                </span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
