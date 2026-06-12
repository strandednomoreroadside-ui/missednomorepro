import Link from "next/link";
import { Check, CircleDashed, Rocket } from "lucide-react";

import { cn } from "@/lib/utils";
import { STEP_META, STEP_ORDER, type StepId } from "@/lib/setup/steps";
import { stepCompletion, type SetupData } from "@/lib/setup/queries";

/**
 * Wizard chrome: a step rail (with live completion marks) beside the
 * current step's form. Every step is a link — data is saved per step,
 * so jumping around never loses anything.
 */
export function WizardShell({
  data,
  current,
  children,
}: {
  data: SetupData;
  current: StepId;
  children: React.ReactNode;
}) {
  const completion = stepCompletion(data);
  const meta = STEP_META[current];

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-widest text-steel">
            Setup wizard · step {STEP_ORDER.indexOf(current) + 1} of {STEP_ORDER.length}
          </p>
          <h1 className="mt-1 font-display text-2xl font-bold tracking-tight">
            {meta.title}
          </h1>
          <p className="mt-1 max-w-xl text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
        {data.business.status === "live" && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/10 px-2.5 py-1 text-xs text-success">
            <Rocket className="size-3.5" aria-hidden /> Live
          </span>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <nav aria-label="Setup steps" className="lg:w-60 lg:shrink-0">
          <ol className="flex flex-wrap gap-1 lg:flex-col">
            {STEP_ORDER.map((step, i) => {
              const isCurrent = step === current;
              const isDone = step === "launch" ? completion.launch : completion[step];
              return (
                <li key={step}>
                  <Link
                    href={`/dashboard/setup/${step}`}
                    aria-current={isCurrent ? "step" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                      isCurrent
                        ? "bg-accent/60 font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/40 hover:text-foreground"
                    )}
                  >
                    {isDone ? (
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/10">
                        <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <CircleDashed
                        className={cn("size-5 shrink-0", isCurrent ? "text-cyan" : "text-steel/50")}
                        aria-hidden
                      />
                    )}
                    <span className="hidden lg:inline">{STEP_META[step].title}</span>
                    <span className="lg:hidden">{i + 1}</span>
                  </Link>
                </li>
              );
            })}
          </ol>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
