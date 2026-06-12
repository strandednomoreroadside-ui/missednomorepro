import "server-only";

import { headers } from "next/headers";

import { env } from "@/lib/env";

/** Origin of the current request (works locally and behind Vercel's proxy). */
export async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : env.NEXT_PUBLIC_APP_URL;
}
