import { NextResponse } from "next/server";

import { sweepUsageAlerts } from "@/lib/billing/usage-alerts";
import { env } from "@/lib/env";
import { generateWeeklyInsights } from "@/lib/insights/call-intelligence";
import { processOutboundQueue } from "@/lib/sms/outbound-engine";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily outbound follow-up cron (vercel.json). Sends due, opt-in, consent-
 * gated follow-up texts. Bearer-authed with CRON_SECRET like the reminders
 * cron — it sends real texts, so it must not be publicly callable.
 */
function authorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) return env.NODE_ENV !== "production";
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const admin = createAdminClient();
    const result = await processOutboundQueue(admin);

    // Daily usage-alert sweep (§15) — catches SMS-driven thresholds and
    // idle tenants the per-call check wouldn't have reached.
    const alertsSwept = await sweepUsageAlerts(admin);

    // Weekly Call Intelligence digests piggyback this daily cron (Vercel
    // Hobby allows only 2 crons). Generate on Mondays for entitled tenants.
    let insights = 0;
    if (new Date().getUTCDay() === 1) {
      insights = await generateWeeklyInsights(admin);
    }

    return NextResponse.json({ ok: true, ...result, alertsSwept, insights });
  } catch (err) {
    const message = err instanceof Error ? err.message : "outbound run failed";
    console.error("[cron/outbound]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
