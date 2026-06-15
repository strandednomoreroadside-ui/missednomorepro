import "server-only";

import { getGoogleCredentials, GOOGLE_SCOPES } from "./credentials";

/**
 * Google OAuth 2.0 — raw REST (no SDK). We need only the auth-code grant,
 * a refresh-token grant, and revoke. Endpoints per Google's OAuth docs.
 */

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const REVOKE_ENDPOINT = "https://oauth2.googleapis.com/revoke";

export interface TokenSet {
  accessToken: string;
  /** Present only on the first consent (access_type=offline + prompt=consent). */
  refreshToken: string | null;
  /** Epoch ms when the access token expires. */
  expiresAt: number;
  scope: string | null;
  email: string | null;
}

/** Build the consent URL to redirect the owner to. `state` is our CSRF +
 *  business binding token (validated in the callback). */
export function buildConsentUrl(state: string): string | null {
  const creds = getGoogleCredentials();
  if (!creds) return null;
  const params = new URLSearchParams({
    client_id: creds.clientId,
    redirect_uri: creds.redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES.join(" "),
    access_type: "offline",
    prompt: "consent", // force a refresh_token even on re-connect
    include_granted_scopes: "true",
    state,
  });
  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

/** Decode the email claim from an id_token JWT without verifying the
 *  signature — fine here because the token came straight from Google's
 *  token endpoint over TLS in response to our authenticated request. */
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null;
  try {
    const payload = idToken.split(".")[1];
    if (!payload) return null;
    const json = Buffer.from(payload, "base64url").toString("utf8");
    const claims = JSON.parse(json) as { email?: string };
    return claims.email ?? null;
  } catch {
    return null;
  }
}

interface GoogleTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

async function tokenRequest(body: URLSearchParams): Promise<GoogleTokenResponse> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const json = (await res.json().catch(() => ({}))) as GoogleTokenResponse;
  if (!res.ok || !json.access_token) {
    const msg = json.error_description ?? json.error ?? `http_${res.status}`;
    throw new Error(`google token request failed: ${msg}`);
  }
  return json;
}

/** Exchange an authorization code (from the callback) for tokens. */
export async function exchangeCode(code: string): Promise<TokenSet> {
  const creds = getGoogleCredentials();
  if (!creds) throw new Error("Google is not configured.");
  const json = await tokenRequest(
    new URLSearchParams({
      code,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      redirect_uri: creds.redirectUri,
      grant_type: "authorization_code",
    })
  );
  return {
    accessToken: json.access_token!,
    refreshToken: json.refresh_token ?? null,
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    scope: json.scope ?? null,
    email: emailFromIdToken(json.id_token),
  };
}

/** Trade a stored refresh token for a fresh access token. */
export async function refreshAccessToken(refreshToken: string): Promise<TokenSet> {
  const creds = getGoogleCredentials();
  if (!creds) throw new Error("Google is not configured.");
  const json = await tokenRequest(
    new URLSearchParams({
      refresh_token: refreshToken,
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
      grant_type: "refresh_token",
    })
  );
  return {
    accessToken: json.access_token!,
    refreshToken: json.refresh_token ?? null, // usually absent on refresh
    expiresAt: Date.now() + (json.expires_in ?? 3600) * 1000,
    scope: json.scope ?? null,
    email: emailFromIdToken(json.id_token),
  };
}

/** Best-effort revoke (on disconnect). Never throws. */
export async function revokeToken(token: string): Promise<void> {
  try {
    await fetch(REVOKE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ token }),
    });
  } catch (err) {
    console.warn("[google] token revoke failed (ignored):", err);
  }
}
