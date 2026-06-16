import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { sendDueReminders } from "@/lib/sms/reminders";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Daily appointment-reminder cron (configured in vercel.json). Vercel Cron
 * calls this with `Authorization: Bearer <CRON_SECRET>` when CRON_SECRET is
 * set. We require that match in production so the endpoint can't be hit by
 * anyone else (it sends real texts).
 */
function authorized(request: Request): boolean {
  const secret = env.CRON_SECRET;
  if (!secret) {
    // No secret configured: allow only outside production (local testing).
    return env.NODE_ENV !== "production";
  }
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const admin = createAdminClient();
    const result = await sendDueReminders(admin);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "reminder run failed";
    console.error("[cron/reminders]", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
