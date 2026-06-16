import type { Metadata } from "next";
import Link from "next/link";
import { unstable_rethrow } from "next/navigation";
import { Check, Lock, Rocket, Wand2 } from "lucide-react";

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
import { BOARD_STAGES, STAGE_META } from "@/lib/crm/pipeline";
import { STEP_META, isStepId } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

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

function pct(part: number, whole: number): string {
  if (whole <= 0) return "—";
  return `${Math.round((part / whole) * 100)}%`;
}

export default async function DashboardPage() {
  const { active } = await requireActiveOrg();

  // KPIs over the trailing 30 days.
  const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
  const supabase = await createClient();
  const [
    { data: business },
    { data: callRows },
    { count: leadCount },
    { data: leadRows },
    { count: textbackCount },
  ] = await Promise.all([
    supabase
      .from("businesses")
      .select("id, name, status, setup_states ( current_step )")
      .eq("tenant_id", active.organization_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("calls")
      .select("ai_handled, disposition")
      .eq("tenant_id", active.organization_id)
      .gte("created_at", since),
    supabase
      .from("leads")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", active.organization_id)
      .gte("created_at", since),
    supabase
      .from("leads")
      .select("status, estimated_value")
      .eq("tenant_id", active.organization_id),
    supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", active.organization_id)
      .eq("kind", "text_back")
      .gte("created_at", since),
  ]);

  // Derive call KPIs.
  const calls = (callRows ?? []) as { ai_handled: boolean; disposition: string | null }[];
  const callsTotal = calls.length;
  const aiHandled = calls.filter((c) => c.ai_handled).length;
  const booked = calls.filter((c) => c.disposition === "booked").length;

  // Pipeline snapshot + estimated value of open work.
  const leads = (leadRows ?? []) as { status: string; estimated_value: number | null }[];
  const stageCounts = new Map<string, number>();
  let pipelineValue = 0;
  for (const l of leads) {
    stageCounts.set(l.status, (stageCounts.get(l.status) ?? 0) + 1);
    if (["quoted", "scheduled", "completed", "repeat"].includes(l.status)) {
      pipelineValue += Number(l.estimated_value ?? 0);
    }
  }

  const setupState = Array.isArray(business?.setup_states)
    ? business.setup_states[0]
    : business?.setup_states;
  const isLive = business?.status === "live";
  const currentStep =
    setupState?.current_step && isStepId(setupState.current_step)
      ? STEP_META[setupState.current_step].title
      : null;

  const kpis = [
    { label: "Calls (30d)", value: callsTotal.toLocaleString(), href: "/dashboard/calls" },
    { label: "Answer rate", value: pct(aiHandled, callsTotal), hint: "AI-handled" },
    { label: "Booking rate", value: pct(booked, callsTotal), hint: `${booked} booked` },
    { label: "Leads (30d)", value: (leadCount ?? 0).toLocaleString(), href: "/dashboard/leads" },
    { label: "Pipeline value", value: `$${Math.round(pipelineValue).toLocaleString()}`, hint: "quoted + booked" },
    { label: "Missed-call texts", value: (textbackCount ?? 0).toLocaleString(), hint: "recovered" },
  ];

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
        Your AI front office at a glance — the last 30 days.
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
                  ? "Setup is complete — your AI receptionist is answering calls."
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

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-card/60">
            <CardHeader className="pb-2">
              <CardDescription>{k.label}</CardDescription>
              <CardTitle className="font-mono text-2xl text-cyan">{k.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-steel">
                {k.href ? (
                  <Link href={k.href} className="hover:text-cyan">
                    view →
                  </Link>
                ) : (
                  k.hint
                )}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Pipeline snapshot */}
      <Card className="mt-8 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between font-display text-lg">
            Pipeline
            <Link href="/dashboard/leads" className="text-sm font-medium text-cyan hover:underline">
              Open board →
            </Link>
          </CardTitle>
          <CardDescription>Where your leads stand right now.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {BOARD_STAGES.map((stage) => (
              <Link
                key={stage}
                href="/dashboard/leads"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs transition-colors hover:bg-accent/40 ${STAGE_META[stage].className}`}
              >
                {STAGE_META[stage].label}
                <span className="font-mono">{stageCounts.get(stage) ?? 0}</span>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}
