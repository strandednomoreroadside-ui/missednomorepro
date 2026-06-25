import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Gauge } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PLAN_META, PLAN_ORDER, type EffectivePlan, type PlanId } from "@/lib/billing/plans";
import { cn } from "@/lib/utils";

/** Show an upgrade nudge once a plan's voice minutes drop to this many left. */
export const NEAR_VOICE_MINUTES = 50;
/** …or once any metered usage crosses this fraction of the allotment. */
const NEAR_FRACTION = 0.8;

export type MeterStatus = {
  kind: "voice_minutes" | "sms";
  used: number;
  limit: number;
};

const LABEL: Record<MeterStatus["kind"], string> = {
  voice_minutes: "AI minutes",
  sms: "texts",
};

type Level = "ok" | "near" | "over";

function levelFor(kind: MeterStatus["kind"], used: number, limit: number): Level {
  if (limit <= 0) return "ok";
  if (used >= limit) return "over";
  const remaining = limit - used;
  if (kind === "voice_minutes" && remaining <= NEAR_VOICE_MINUTES) return "near";
  if (used / limit >= NEAR_FRACTION) return "near";
  return "ok";
}

const BAR: Record<Level, string> = {
  ok: "bg-cyan",
  near: "bg-amber-500",
  over: "bg-red-500",
};

const NUM: Record<Level, string> = {
  ok: "text-cyan",
  near: "text-amber-500",
  over: "text-red-500",
};

/**
 * Plan usage meter — a clear minutes/texts used count with progress bars and a
 * near-limit upgrade prompt. The product hard-caps (no surprise overage): when
 * minutes run out, new calls forward to the owner until they upgrade, so this
 * nudges the upgrade *before* that happens. Presentational; the caller loads
 * usage. During a trial pass `trialVoiceCap` so the voice row reflects the
 * trial allotment rather than the (larger) plan allotment.
 */
export function UsageMeter({
  statuses,
  planId,
  trialVoiceCap = null,
  className,
}: {
  statuses: MeterStatus[];
  planId: EffectivePlan;
  trialVoiceCap?: number | null;
  className?: string;
}) {
  // Apply the trial cap to the voice row so the count is honest mid-trial.
  const rows = statuses.map((s) =>
    s.kind === "voice_minutes" && trialVoiceCap != null
      ? { ...s, limit: trialVoiceCap }
      : s
  );

  const levels = rows.map((s) => levelFor(s.kind, s.used, s.limit));
  const worst: Level = levels.includes("over")
    ? "over"
    : levels.includes("near")
      ? "near"
      : "ok";

  // The next self-serve tier up (Elite → Enterprise = contact sales).
  const idx = PLAN_ORDER.indexOf(planId as PlanId);
  const nextPlan =
    idx >= 0 && idx < PLAN_ORDER.length - 1 ? PLAN_META[PLAN_ORDER[idx + 1]] : null;

  return (
    <Card className={cn("bg-card/60", className)}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Gauge className="size-4 text-cyan" aria-hidden />
          Usage this period
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {rows.map((s, i) => {
          const level = levels[i];
          const remaining = Math.max(0, s.limit - s.used);
          const widthPct = s.limit > 0 ? Math.min(100, (s.used / s.limit) * 100) : 0;
          return (
            <div key={s.kind}>
              <div className="flex items-baseline justify-between text-sm">
                <span className="text-muted-foreground">
                  {trialVoiceCap != null && s.kind === "voice_minutes" ? "Trial " : ""}
                  {LABEL[s.kind]}
                </span>
                <span className="font-mono text-xs text-steel">
                  <span className={NUM[level]}>{s.used.toLocaleString()}</span>
                  {" / "}
                  {s.limit.toLocaleString()}
                  <span className="ml-2 text-muted-foreground">
                    {remaining.toLocaleString()} left
                  </span>
                </span>
              </div>
              <div
                className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-night/60"
                role="progressbar"
                aria-valuenow={Math.round(widthPct)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${LABEL[s.kind]} used`}
              >
                <div
                  className={cn("h-full rounded-full transition-all duration-300", BAR[level])}
                  style={{ width: `${widthPct}%` }}
                />
              </div>
            </div>
          );
        })}

        {worst !== "ok" && (
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 rounded-lg border px-3.5 py-3",
              worst === "over"
                ? "border-red-500/30 bg-red-500/5"
                : "border-amber-500/30 bg-amber-500/5"
            )}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className={cn("mt-0.5 size-4 shrink-0", worst === "over" ? "text-red-500" : "text-amber-500")}
                aria-hidden
              />
              <p className="text-xs leading-relaxed text-foreground">
                {worst === "over" ? (
                  <>
                    You&rsquo;ve hit your monthly limit. New calls now{" "}
                    <span className="font-medium">forward to your phone</span> so nothing is
                    missed — {nextPlan ? `upgrade to ${nextPlan.name} to keep the AI answering.` : "contact us to raise your limit."}
                  </>
                ) : (
                  <>
                    You&rsquo;re close to your monthly limit.{" "}
                    {nextPlan
                      ? `Upgrade to ${nextPlan.name} for more minutes before calls start forwarding to you.`
                      : "Contact us to raise your limit before calls start forwarding to you."}
                  </>
                )}
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className={cn(
                "inline-flex h-9 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-colors",
                worst === "over"
                  ? "bg-primary text-primary-foreground hover:brightness-110"
                  : "border border-amber-500/40 text-amber-500 hover:bg-amber-500/10"
              )}
            >
              {nextPlan ? `Upgrade to ${nextPlan.name}` : "Contact sales"}
              <ArrowUpRight className="size-3.5" aria-hidden />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
