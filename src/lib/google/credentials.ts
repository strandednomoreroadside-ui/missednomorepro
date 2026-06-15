import "server-only";

import { env } from "@/lib/env";

/**
 * Google OAuth client credentials, parsed from GOOGLE_OAUTH_CREDENTIALS —
 * the base64 of the "OAuth client" JSON you download from Google Cloud
 * Console (Web application type). Shape:
 *
 *   { "web": { "client_id": "...", "client_secret": "...", ... } }
 *
 * We compute the redirect URI from NEXT_PUBLIC_APP_URL rather than reading
 * it from the file, so it always matches the running environment (and is
 * the value you register in the console).
 */

export interface GoogleCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

/** Scopes: events to create bookings, readonly for free/busy lookups,
 *  openid+email so the callback can record which Google account connected. */
export const GOOGLE_SCOPES = [
  "openid",
  "email",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
];

let cached: GoogleCredentials | null | undefined;

export function googleRedirectUri(): string {
  return `${env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/api/google/callback`;
}

/** Parsed credentials, or null when GOOGLE_OAUTH_CREDENTIALS isn't set /
 *  is malformed. Callers treat null as "calendar not configured". */
export function getGoogleCredentials(): GoogleCredentials | null {
  if (cached !== undefined) return cached;
  cached = parse();
  return cached;
}

export function isGoogleConfigured(): boolean {
  return getGoogleCredentials() !== null;
}

function parse(): GoogleCredentials | null {
  if (!env.GOOGLE_OAUTH_CREDENTIALS) return null;
  try {
    const json = Buffer.from(env.GOOGLE_OAUTH_CREDENTIALS, "base64").toString("utf8");
    const obj = JSON.parse(json) as {
      web?: { client_id?: string; client_secret?: string };
      installed?: { client_id?: string; client_secret?: string };
    };
    const block = obj.web ?? obj.installed;
    if (!block?.client_id || !block?.client_secret) {
      console.error("[google] GOOGLE_OAUTH_CREDENTIALS missing client_id/client_secret.");
      return null;
    }
    return {
      clientId: block.client_id,
      clientSecret: block.client_secret,
      redirectUri: googleRedirectUri(),
    };
  } catch (err) {
    console.error("[google] GOOGLE_OAUTH_CREDENTIALS is not valid base64 JSON:", err);
    return null;
  }
}
