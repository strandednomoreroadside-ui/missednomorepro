import type { Metadata } from "next";
import { Check, CircleDashed } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";

export const metadata: Metadata = { title: "Dashboard" };

const STATS = [
  { label: "Calls answered", value: "0", hint: "arrives at M7 — AI receptionist" },
  { label: "Leads captured", value: "0", hint: "arrives at M5 — CRM" },
  { label: "Jobs booked", value: "0", hint: "arrives at M9 — booking" },
  { label: "Revenue recovered", value: "$0", hint: "arrives at M7+" },
];

const PROGRESS: { label: string; done: boolean }[] = [
  { label: "M1 — Branded site live", done: true },
  { label: "M2 — Accounts & secure workspaces", done: true },
  { label: "M3 — Billing & plans", done: false },
  { label: "M4 — Setup wizard", done: false },
  { label: "M5 — CRM", done: false },
  { label: "M6/M7 — Phone + AI receptionist", done: false },
];

export default async function DashboardPage() {
  const { active } = await requireActiveOrg();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Welcome, {active.organizations.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your AI front office is under construction — here&rsquo;s the live
        picture as modules come online.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
