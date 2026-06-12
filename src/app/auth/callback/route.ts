import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Handles Supabase email links (signup confirmation, password recovery).
 * Exchanges the one-time code for a session, then forwards the user on.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const rawNext = searchParams.get("next") ?? "/dashboard";
  const next =
    rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${next}`);
  }

  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent(
      "That link was invalid or expired. Please try again."
    )}`
  );
}
