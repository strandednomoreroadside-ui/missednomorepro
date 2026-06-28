"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * Interactive missed-call ROI calculator (landing conversion). The visitor
 * sets every assumption — missed calls, job value, and how many would book —
 * so the number is theirs, not a fabricated claim. Self-contained, no deps.
 */

const WEEKS_PER_MONTH = 4.33;

function money(n: number): string {
  return "$" + Math.round(n).toLocaleString("en-US");
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format: (v: number) => string;
}) {
  return (
    <label className="block">
      <div className="flex items-baseline justify-between">
        <span className="text-sm text-muted-foreground">{label}</span>
        <span className="font-mono text-base font-semibold text-cyan">{format(value)}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 w-full accent-cyan"
        aria-label={label}
      />
    </label>
  );
}

export function RoiCalculator() {
  const [missedPerWeek, setMissedPerWeek] = useState(10);
  const [avgJob, setAvgJob] = useState(150);
  const [bookRate, setBookRate] = useState(40);

  const monthlyMissedCalls = Math.round(missedPerWeek * WEEKS_PER_MONTH);
  const walkingAway = monthlyMissedCalls * avgJob;
  const recovered = walkingAway * (bookRate / 100);

  return (
    <div className="rounded-2xl border border-cyan/25 bg-card/60 p-6 sm:p-8">
      <div className="grid gap-8 lg:grid-cols-2">
        <div className="space-y-6">
          <Slider
            label="Missed calls per week"
            value={missedPerWeek}
            min={1}
            max={50}
            step={1}
            onChange={setMissedPerWeek}
            format={(v) => String(v)}
          />
          <Slider
            label="Average job value"
            value={avgJob}
            min={50}
            max={1500}
            step={10}
            onChange={setAvgJob}
            format={money}
          />
          <Slider
            label="How many would book?"
            value={bookRate}
            min={10}
            max={80}
            step={5}
            onChange={setBookRate}
            format={(v) => `${v}%`}
          />
        </div>

        <div className="flex flex-col justify-center rounded-xl border border-border/60 bg-night/40 p-6 text-center">
          <div className="text-xs font-medium uppercase tracking-widest text-steel">
            Walking to a competitor
          </div>
          <div className="mt-1 font-mono text-4xl font-bold text-foreground sm:text-5xl">
            {money(walkingAway)}
            <span className="text-xl text-muted-foreground">/mo</span>
          </div>
          <div className="mt-5 border-t border-border/60 pt-5 text-xs font-medium uppercase tracking-widest text-steel">
            Your AI could recover
          </div>
          <div className="mt-1 font-mono text-4xl font-bold text-cyan sm:text-5xl">
            {money(recovered)}
            <span className="text-xl text-muted-foreground">/mo</span>
          </div>
          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            That&rsquo;s from <span className="text-foreground">{monthlyMissedCalls} missed calls a month</span>,
            answered 24/7 — against a plan that starts at $99/mo.
          </p>
          <Link
            href="/signup"
            className="mt-5 inline-flex items-center justify-center rounded-lg bg-cyan px-5 py-2.5 text-sm font-semibold text-night transition-opacity hover:opacity-90"
          >
            Start free trial
          </Link>
        </div>
      </div>
    </div>
  );
}
