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
  approxCalls?: string;
  extras: string[];
  popular?: boolean;
};

// Rough call-count proxy for the abstract "AI minutes" unit, based on a
// ~3-minute average call (greet, qualify, quote, book) — an estimate, not a
// guarantee, and labeled as such next to the definition below.
const AVG_CALL_MINUTES = 3;
const approxCalls = (minutes: number) =>
  `≈${Math.round(minutes / AVG_CALL_MINUTES / 5) * 5} calls/mo`;

const PLANS: Plan[] = [
  {
    name: "Starter",
    monthly: 79,
    blurb: "Solo operators who never want to miss a call",
    minutes: "250 AI minutes",
    approxCalls: approxCalls(250),
    extras: [
      "Booking, cancel & reschedule",
      "Human transfer + Google Calendar",
      "Website chat + AI business insights",
      "Review requests",
      "1 user",
    ],
  },
  {
    name: "Growth",
    monthly: 159,
    blurb: "Teams that want more leads converted",
    minutes: "500 AI minutes",
    approxCalls: approxCalls(500),
    extras: ["Lead pipeline + timeline", "AI follow-ups & reminders", "Payment requests + analytics", "3 users"],
  },
  {
    name: "Professional",
    monthly: 279,
    blurb: "Growing teams that dispatch and need insight",
    minutes: "900 AI minutes",
    approxCalls: approxCalls(900),
    extras: ["Dispatch board + team calendar", "Make & Zapier integrations", "10 users"],
    popular: true,
  },
  {
    name: "Elite",
    monthly: 479,
    blurb: "Higher-volume teams ready for advanced automation",
    minutes: "1,500 AI minutes",
    approxCalls: approxCalls(1500),
    extras: ["Additional business numbers", "Membership management", "API access", "25 users"],
  },
  {
    name: "Enterprise",
    monthly: null,
    blurb: "Organizations needing custom volume and support",
    minutes: "Custom minutes",
    extras: ["Dedicated onboarding", "Custom integrations", "Priority support"],
  },
];

export function Pricing({ founderSlotsTaken }: { founderSlotsTaken?: number }) {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20 lg:py-28">
      <SectionHeading
        eyebrow="Pricing"
        title="Plans that pay for themselves"
        sub="Start with a 7-day free trial. One recovered job usually covers the month — switch to annual and save 20%."
      />

      <div className="mx-auto mt-8 flex max-w-2xl flex-col items-center gap-4 rounded-2xl border border-cyan/30 bg-cyan/5 px-6 py-5 text-center sm:flex-row sm:justify-between sm:text-left">
        <div>
          <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-cyan sm:justify-start">
            <span>First ten businesses</span>
            {typeof founderSlotsTaken === "number" && (
              <span className="rounded-full border border-cyan/40 bg-night/40 px-2 py-0.5 text-cyan">
                {founderSlotsTaken} of 10 taken
              </span>
            )}
          </p>
          <p className="mt-1 font-display text-xl font-semibold text-foreground">
            Founding customers get every add-on free
          </p>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            No discount code, no special price — pick any plan below. The first 10 businesses
            to become paying customers get every paid add-on — right now, that&rsquo;s AI Outbound
            Assistant, plus anything we add later — free for the lifetime of their subscription,
            as long as it stays continuously active.
          </p>
        </div>
        <a
          href="#plans"
          className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110"
        >
          See plans
        </a>
      </div>

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

      <p className="mx-auto mt-5 w-fit rounded-full border border-cyan/25 bg-cyan/5 px-4 py-1.5 text-center text-xs text-steel">
        <span className="font-medium text-foreground">7-day free trial</span> on every plan —
        card required, cancel anytime before it ends and you&rsquo;re not charged.
      </p>
      <p className="mx-auto mt-3 max-w-lg text-center text-xs leading-relaxed text-steel">
        <span className="font-medium text-foreground">What&rsquo;s an &ldquo;AI minute&rdquo;?</span>{" "}
        One minute your AI receptionist is actually on the phone talking to a caller — not hold
        time, not texts. The call counts on each plan below are an estimate based on a ~3-minute
        average call.
      </p>

      <div id="plans" className="mt-10 scroll-mt-24 grid gap-5 md:grid-cols-2 xl:grid-cols-5">
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
                  {plan.approxCalls && (
                    <span className="font-normal text-muted-foreground">({plan.approxCalls})</span>
                  )}
                </li>
                {plan.extras.map((extra) => (
                  <li key={extra} className="flex items-center gap-2">
                    <Check className="size-3.5 shrink-0 text-cyan/70" strokeWidth={3} aria-hidden />
                    {extra}
                  </li>
                ))}
              </ul>
              <a
                href={
                  plan.monthly == null
                    ? EARLY_ACCESS_MAILTO
                    : `/signup?plan=${plan.name.toLowerCase()}`
                }
                className={cn(
                  "mt-5 inline-flex h-10 cursor-pointer items-center justify-center rounded-lg text-sm font-semibold transition-all",
                  plan.popular
                    ? "bg-primary text-primary-foreground hover:brightness-110"
                    : "border border-border text-foreground hover:border-cyan/50 hover:text-cyan"
                )}
              >
                {plan.monthly == null ? "Talk to us" : "Start free trial"}
              </a>
            </div>
          );
        })}
      </div>

      <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-relaxed text-muted-foreground">
        All plans include call summaries, transcripts, and SMS compliance (STOP/HELP). Every plan is
        a <span className="text-foreground">hard cap — no surprise overage charges, ever</span>. We
        warn you before you run low and prompt an upgrade; if you do hit your limit, calls forward
        straight to your phone so you never miss one.
      </p>
    </section>
  );
}
