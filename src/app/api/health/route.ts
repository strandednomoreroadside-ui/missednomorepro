import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public health check for uptime monitoring (reliability bundle). A free
 * external monitor (UptimeRobot, BetterStack, etc.) pings this every minute
 * and alerts if it stops returning 200 — so we hear about an outage before a
 * customer does. See docs/uptime-monitoring.md.
 *
 * It also does one cheap DB read so a database outage (which would 500 every
 * real request) shows up as 503 here, not a misleading 200. No auth — a
 * monitor must reach it unauthenticated — and it returns no tenant data, just
 * up/down + latency. The middleware matcher skips this path so each ping
 * doesn't trigger a session lookup.
 */

export const dynamic = "force-dynamic";

export async function GET() {
  const started = Date.now();

  let db: "ok" | "down" = "down";
  try {
    const admin = createAdminClient();
    // Tiny, always-seeded, indexed table — a fast "is the DB reachable" probe.
    const { error } = await admin.from("plan_limits").select("plan").limit(1);
    db = error ? "down" : "ok";
  } catch {
    db = "down";
  }

  const ok = db === "ok";
  return NextResponse.json(
    {
      status: ok ? "ok" : "degraded",
      db,
      ms: Date.now() - started,
      time: new Date().toISOString(),
    },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } }
  );
}
