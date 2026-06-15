import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { requireActiveOrg } from "@/lib/auth";
import { env } from "@/lib/env";
import { saveConnection } from "@/lib/google/connection";
import { exchangeCode } from "@/lib/google/oauth";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Google OAuth callback (M9). Google redirects the owner here with an auth
 * code. We validate the CSRF state cookie set in the connect action,
 * exchange the code for tokens, and store the (encrypted) connection
 * against the signed-in user's active business. Booking turns on for that
 * business on its next call (lazy agent re-sync).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");

  const back = new URL("/dashboard/settings", env.NEXT_PUBLIC_APP_URL);
  // Clear the one-time CSRF cookie on the way out (set it on the response so
  // it reliably attaches to the redirect in a route handler).
  const done = (reason: string) => {
    back.searchParams.set("calendar", reason);
    const res = NextResponse.redirect(back);
    res.cookies.delete("g_oauth_state");
    return res;
  };

  if (oauthError) return done("denied");

  const cookieStore = await cookies();
  const expected = cookieStore.get("g_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) return done("error");

  // Whose calendar is this? The signed-in user's active org's business.
  const { active } = await requireActiveOrg();
  const admin = createAdminClient();
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return done("nobusiness");

  try {
    const tokens = await exchangeCode(code);
    const res = await saveConnection(admin, {
      tenantId: active.organization_id,
      businessId: business.id as string,
      tokens,
    });
    if (!res.ok) {
      console.error("[google] saveConnection failed:", res.error);
      return done("norefresh"); // typically: no refresh_token returned
    }
    return done("connected");
  } catch (err) {
    console.error("[google] callback failed:", err);
    return done("error");
  }
}
