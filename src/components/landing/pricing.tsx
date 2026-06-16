"use client";

import { useState } from "react";
import { Check } from "lucide-react";

import { cn } from "@/lib/utils";

import { EARLY_ACCESS_MAILTO, SectionHeading } from "./primitives";

type Plan = {
  name: string;
  monthly: number | null; // null = custom
  blurb: string;
  minutes: string;
  extras: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    name: "Starter",
    monthly: 99,
    blurb: "Solo operators who never want to miss a call",
    minutes: "250 AI minutes",
    extras: ["Booking, cancel & reschedule", "Human transfer + Google Calendar", "Review requests", "1 user"],
  },
  {
    name: "Growth",
    monthly: 199,
    blurb: "Teams that want more leads converted",
    minutes: "500 AI minutes",
    extras: ["Lead pipeline + timeline", "AI follow-ups & reminders", "Payment requests + analytics", "3 users"],
  },
  {
    name: "Professional",
    monthly: 349,
    blurb: "Growing teams that dispatch and need insight",
    minutes: "900 AI minutes",
    extras: ["Dispatch board + team calendar", "AI business insights", "Make/Zapier + website chat", "10 users"],
    popular: true,
  },
  {
    name: "Elite",
    monthly: 599,
    blurb: "Multi-location operations at scale",
    minutes: "1,500 AI minutes",
    extras: ["Multiple locations & numbers", "Membership management", "API access", "25 users"],
  },
  {
    name: "Enterprise",
    monthly: null,
    blurb: "Large & multi-location organizations",
    minutes: "Custom minutes",
    extras: ["Dedicated onboarding", "Custom integrations", "Priority support"],
  },
];

export function Pricing() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <SectionHeading
        eyebrow="Pricing"
        title="Plans that pay for themselves"
        sub="One recovered job usually covers the month. Switch to annual and save 20%."
      />

      {/* Billing toggle */}
      <div className="mt-8 flex items-center justify-center gap-3">
        <span className={cn("text-sm", !annual ? "text-foreground" : "text-muted-foreground")}>Monthly</span>
        <button
          type="button"
          role="switch"
          aria-checked={annual}
          aria-label="Toggle annual billing"
          onClick={() => setAnnual((v) => !v)}
          className="relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border border-border bg-night/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <span
            className={cn(
              "inline-block size-5 transform rounded-full bg-cyan shadow transition-transform duration-200",
              annual ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
        <span className={cn("text-sm", annual ? "text-foreground" : "text-muted-foreground")}>
          Annual
          <span className="ml-1.5 rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">
            −20%
          </span>
        </span>
      </div>

      <div className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
        {PLANS.map((plan) => {
          const price =
            plan.monthly == null ? "Custom" : `$${annual ? Math.round(plan.monthly * 0.8) : plan.monthly}`;
          return (
            <div
              key={plan.name}
              className={cn(
                "relative flex flex-col rounded-xl p-6",
                plan.popular ? "border-glow shadow-[0_16px_60px_-20px_rgba(0,229,255,0.4)]" : "border border-border bg-card/60"
              )}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-primary-foreground">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="font-display text-3xl font-bold">{price}</span>
                {plan.monthly != null && <span className="text-sm text-muted-foreground">/mo</span>}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.blurb}</p>
              <ul className="mt-4 flex-1 space-y-2 border-t border-border/70 pt-4 text-sm text-muted-foreground">
                <li className="flex items-center gap-2 font-medium text-foreground">
                  <Check className="size-3.5 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
                  {plan.minutes}
                </li>
                {plan.extras.map((extra) => (
                  <li key={extra} className="flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-cyan/70" strokeWidth={3} aria-hidden />
                    {extra}
                  </li>
                ))}
              </ul>
              <a
                href={EARLY_ACCESS_MAILTO}
                className={cn(
                  "mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-all",
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "border border-border text-foreground hover:border-cyan/50 hover:text-cyan"
                )}
              >
                {plan.monthly == null ? "Talk to us" : "Get early access"}
              </a>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        All plans include call summaries, transcripts, SMS compliance (STOP/HELP), and usage
        protection. Go over your minutes? Overage is metered at about $0.20/min and $0.02/text — no
        surprise lockouts, no overpaying for minutes you don&rsquo;t use.
      </p>
    </section>
  );
}
