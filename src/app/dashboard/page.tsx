import type { Metadata } from "next";
import Link from "next/link";
import { Check, CircleDashed, Rocket, Wand2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { STEP_META, isStepId } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { label: "Calls answered", value: "0", hint: "arrives at M7 — AI receptionist" },
  { label: "Jobs booked", value: "0", hint: "arrives at M9 — booking" },
  { label: "Revenue recovered", value: "$0", hint: "arrives at M7+" },
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
  const [{ data: business }, { count: leadCount }] = await Promise.all([
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
  ]);
  const setupState = Array.isArray(business?.setup_states)
    ? business.setup_states[0]
    : business?.setup_states;
  const isLive = business?.status === "live";
  const currentStep =
    setupState?.current_step && isStepId(setupState.current_step)
      ? STEP_META[setupState.current_step].title
      : null;

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
