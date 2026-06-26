import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on everything except static assets and the uptime health check
     * (skipped so each monitor ping doesn't trigger a session lookup).
     * Auth-protected prefixes are enforced inside updateSession.
     */
    "/((?!_next/static|_next/image|favicon.ico|brand/|api/health|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt|xml)$).*)",
  ],
};
