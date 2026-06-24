import Link from "next/link";
import { Check, CircleDashed, Rocket, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  approvals,
  readyToLaunch,
  stepCompletion,
  type SetupData,
} from "@/lib/setup/queries";
import { STEP_META, STEP_ORDER, type StepId } from "@/lib/setup/steps";

import { approveSection, launchBusiness } from "../actions";

const APPROVAL_SECTIONS = [
  {
    key: "pricing" as const,
    section: "pricing",
    step: "pricing" as StepId,
    title: "Pricing rules",
    detail: "I reviewed every price and the AI may rely on this list.",
    stamp: (d: SetupData) => d.state.pricing_approved_at,
  },
  {
    key: "hours" as const,
    section: "hours",
    step: "hours" as StepId,
    title: "Business hours",
    detail: "These are the only windows the AI may ever book inside.",
    stamp: (d: SetupData) => d.state.hours_approved_at,
  },
  {
    key: "area" as const,
    section: "area",
    step: "service-area" as StepId,
    title: "Service area",
    detail: "Callers outside this list are politely declined.",
    stamp: (d: SetupData) => d.state.area_approved_at,
  },
];

export function LaunchStep({
  data,
  canApprove,
}: {
  data: SetupData;
  /** Owners and admins approve + launch; members can only view. */
  canApprove: boolean;
}) {
  const completion = stepCompletion(data);
  const approved = approvals(data.state);
  const ready = readyToLaunch(data);
  const live = data.business.status === "live";
  const requiredSteps = STEP_ORDER.filter(
    (s) => s !== "launch" && STEP_META[s].required
  );

  if (live) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="flex items-center gap-4 pt-6">
          <span className="inline-flex size-11 items-center justify-center rounded-full border border-success/40 bg-success/10">
            <Rocket className="size-5 text-success" aria-hidden />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-foreground">
              {data.business.name} is live
            </p>
            <p className="text-sm text-muted-foreground">
              Launched{" "}
              {data.state.launched_at
                ? new Date(data.state.launched_at).toLocaleDateString()
                : "—"}
              . Your AI receptionist starts answering at milestone M7 — everything it
              needs is configured here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Required-step checklist */}
      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Required steps</CardTitle>
          <CardDescription>Every box must be checked before launch.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2 sm:grid-cols-2">
            {requiredSteps.map((step) => (
              <li key={step}>
                <Link
                  href={`/dashboard/setup/${step}`}
                  className="flex items-center gap-2.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {completion[step] ? (
                    <span className="inline-flex size-5 items-center justify-center rounded-full border border-success/40 bg-success/10">
                      <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
                    </span>
                  ) : (
                    <CircleDashed className="size-5 text-steel/50" aria-hidden />
                  )}
                  {STEP_META[step].title}
                </Link>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* The three explicit approvals */}
      <Card className="bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <ShieldCheck className="size-4 text-cyan" aria-hidden />
            Owner approvals
          </CardTitle>
          <CardDescription>
            {canApprove
              ? "Your sign-off that the AI may rely on this data. Editing a section later clears its approval."
              : "Only the account owner or an admin can approve these sections."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {APPROVAL_SECTIONS.map((a) => {
            const isApproved = approved[a.key];
            const stamp = a.stamp(data);
            return (
              <div
                key={a.key}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 px-3.5 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{a.title}</p>
                  <p className="text-xs text-muted-foreground">{a.detail}</p>
                  {a.key === "area" && data.pricingSettings?.base_address && (
                    <p className="mt-0.5 text-xs text-steel">
                      Covering{" "}
                      <span className="font-mono text-cyan">
                        {data.pricingSettings.max_service_miles ?? 40}
                      </span>{" "}
                      miles around {data.pricingSettings.base_address}
                    </p>
                  )}
                </div>
                {isApproved ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs text-success">
                    <Check className="size-3.5" strokeWidth={3} aria-hidden />
                    Approved {stamp ? new Date(stamp).toLocaleDateString() : ""}
                  </span>
                ) : completion[a.step] ? (
                  canApprove ? (
                    <form action={approveSection}>
                      <input type="hidden" name="section" value={a.section} />
                      <Button type="submit" variant="outline" size="sm">
                        Approve
                      </Button>
                    </form>
                  ) : (
                    <span className="text-xs text-steel">Awaiting owner</span>
                  )
                ) : (
                  <Link
                    href={`/dashboard/setup/${a.step}`}
                    className="text-xs text-cyan hover:underline"
                  >
                    Finish this step first →
                  </Link>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Launch */}
      <Card className="bg-card/60">
        <CardContent className="flex flex-wrap items-center justify-between gap-4 pt-6">
          <div>
            <p className="font-display text-base font-semibold text-foreground">
              {ready ? "Everything checks out." : "Not ready yet."}
            </p>
            <p className="text-sm text-muted-foreground">
              {ready
                ? "Going live marks this business ready for the AI receptionist."
                : "Finish the steps and approvals above — the launch button unlocks itself."}
            </p>
          </div>
          {canApprove ? (
            <form action={launchBusiness}>
              <Button type="submit" disabled={!ready}>
                <Rocket className="size-4" aria-hidden />
                Launch {data.business.name}
              </Button>
            </form>
          ) : (
            <p className="text-xs text-steel">Only the owner or an admin can launch.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
