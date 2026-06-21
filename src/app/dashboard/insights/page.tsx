import type { Metadata } from "next";
import Link from "next/link";
import { Lightbulb, LineChart, Sparkles, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import type { CallIntelMetrics } from "@/lib/insights/call-intelligence";
import { createClient } from "@/lib/supabase/server";

import { generateInsightsNow } from "./actions";

export const metadata: Metadata = { title: "Insights" };

type Report = {
  period_start: string;
  period_end: string;
  created_at: string;
  payload: { metrics: CallIntelMetrics; summary: string; recommendations: string[] };
};

export default async function InsightsPage() {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);

  if (!ent.has("call_intelligence")) {
    return (
      <div className="mx-auto max-w-3xl">
        <Header />
        <Card className="mt-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-amber-500">
              <TriangleAlert className="size-4" aria-hidden />
              Add-on required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <strong>AI Call Intelligence</strong> is a +$19/mo add-on — a weekly read on what your
            calls are telling you, with recommendations. Turn it on from the{" "}
            <Link href="/dashboard/billing" className="text-cyan hover:underline">
              billing page
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("insight_reports")
    .select("period_start, period_end, created_at, payload")
    .eq("tenant_id", tenantId)
    .eq("kind", "call_intelligence")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const report = data as Report | null;
  const m = report?.payload.metrics;

  const cards: [string, string][] = m
    ? [
        ["Calls", `${m.calls}`],
        ["Answer rate", `${m.answer_rate}%`],
        ["Booking rate", `${m.booking_rate}%`],
        ["Bookings", `${m.bookings}`],
        ["Quotes given", `${m.quotes}`],
        ["Transfers", `${m.transfers}`],
        ["New leads", `${m.new_leads}`],
        ["Jobs completed", `${m.jobs_completed}`],
        ["Pipeline value", `$${m.pipeline_value.toLocaleString()}`],
        ["Collected", `$${m.revenue_collected.toLocaleString()}`],
      ]
    : [];

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header />
        <form action={generateInsightsNow}>
          <Button type="submit" size="sm" variant="outline">
            <Sparkles className="size-4" aria-hidden />
            Refresh report
          </Button>
        </form>
      </div>

      {!report ? (
        <Card className="mt-6 bg-card/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No report yet. We generate one automatically each week — or hit{" "}
            <strong>Refresh report</strong> to build this week&rsquo;s now.
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="mt-4 text-xs text-steel">
            Week of{" "}
            {new Date(report.period_start).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            {" – "}
            {new Date(report.period_end).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </p>

          {report.payload.summary && (
            <Card className="mt-3 border-cyan/30 bg-cyan/5">
              <CardContent className="flex items-start gap-3 py-4">
                <Sparkles className="mt-0.5 size-5 shrink-0 text-cyan" aria-hidden />
                <p className="text-sm text-foreground">{report.payload.summary}</p>
              </CardContent>
            </Card>
          )}

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {cards.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-border/60 bg-card/50 px-4 py-3">
                <div className="font-mono text-[10px] uppercase tracking-wider text-steel">{label}</div>
                <div className="mt-1 font-mono text-xl font-semibold text-foreground">{value}</div>
              </div>
            ))}
          </div>

          {report.payload.recommendations?.length > 0 && (
            <Card className="mt-6 bg-card/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Lightbulb className="size-4 text-cyan" aria-hidden />
                  Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2.5">
                  {report.payload.recommendations.map((r, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                      <span className="mt-0.5 font-mono text-xs text-cyan">{i + 1}</span>
                      {r}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <LineChart className="size-6 text-cyan" aria-hidden />
        Call Intelligence
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        What your week of calls is telling you — and what to do about it.
      </p>
    </div>
  );
}
