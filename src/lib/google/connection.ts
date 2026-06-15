import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptText, encryptText, hasEncryptionKey } from "@/lib/crypto";

import { refreshAccessToken, revokeToken, type TokenSet } from "./oauth";

/**
 * Google Calendar connection storage. ALWAYS called with the service-role
 * client — these rows hold encrypted OAuth tokens the authenticated role
 * cannot read (column grants in the M9 migration). Access tokens are
 * refreshed on demand and re-persisted.
 */

export interface CalendarConnectionRow {
  id: string;
  tenant_id: string;
  business_id: string;
  google_account_email: string | null;
  google_calendar_id: string;
  status: "connected" | "revoked" | "error";
  refresh_token_encrypted: string | null;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
}

const SELECT =
  "id, tenant_id, business_id, google_account_email, google_calendar_id, status, " +
  "refresh_token_encrypted, access_token_encrypted, access_token_expires_at";

/** Full connection row (incl. encrypted tokens) for a business, or null. */
export async function getConnection(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string
): Promise<CalendarConnectionRow | null> {
  const { data } = await admin
    .from("calendar_connections")
    .select(SELECT)
    .eq("tenant_id", tenantId)
    .eq("business_id", businessId)
    .maybeSingle();
  return (data as CalendarConnectionRow | null) ?? null;
}

/** True when a business has a usable Google Calendar connection. */
export function isConnected(row: CalendarConnectionRow | null): boolean {
  return Boolean(row && row.status === "connected" && row.refresh_token_encrypted);
}

/**
 * A valid access token for this connection, refreshing + persisting if the
 * cached one is missing or within 60s of expiry. Returns null when there's
 * no connection, no refresh token, or the refresh fails (status flipped to
 * 'error' in that case).
 */
export async function getValidAccessToken(
  admin: SupabaseClient,
  row: CalendarConnectionRow
): Promise<string | null> {
  if (row.status !== "connected" || !row.refresh_token_encrypted) return null;

  const skewMs = 60_000;
  const cached = row.access_token_encrypted
    ? decryptText(row.access_token_encrypted)
    : null;
  const expiresAt = row.access_token_expires_at
    ? new Date(row.access_token_expires_at).getTime()
    : 0;
  if (cached && expiresAt - skewMs > Date.now()) return cached;

  const refreshToken = decryptText(row.refresh_token_encrypted);
  if (!refreshToken) {
    await admin
      .from("calendar_connections")
      .update({ status: "error", last_error: "refresh token unreadable" })
      .eq("id", row.id);
    return null;
  }

  try {
    const fresh = await refreshAccessToken(refreshToken);
    await admin
      .from("calendar_connections")
      .update({
        access_token_encrypted: encryptText(fresh.accessToken),
        access_token_expires_at: new Date(fresh.expiresAt).toISOString(),
        // Google occasionally rotates the refresh token.
        ...(fresh.refreshToken
          ? { refresh_token_encrypted: encryptText(fresh.refreshToken) }
          : {}),
        last_synced_at: new Date().toISOString(),
        last_error: null,
      })
      .eq("id", row.id);
    return fresh.accessToken;
  } catch (err) {
    console.error("[google] token refresh failed:", err);
    await admin
      .from("calendar_connections")
      .update({ status: "error", last_error: String(err).slice(0, 300) })
      .eq("id", row.id);
    return null;
  }
}

/** Upsert a connection after a successful OAuth exchange. */
export async function saveConnection(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId: string;
    tokens: TokenSet;
    calendarId?: string;
  }
): Promise<{ ok: boolean; error?: string }> {
  if (!hasEncryptionKey()) {
    return { ok: false, error: "TRANSCRIPT_ENCRYPTION_KEY is not set — cannot store tokens." };
  }
  if (!opts.tokens.refreshToken) {
    return {
      ok: false,
      error: "Google did not return a refresh token. Disconnect this app in your Google account, then reconnect.",
    };
  }
  const { error } = await admin.from("calendar_connections").upsert(
    {
      tenant_id: opts.tenantId,
      business_id: opts.businessId,
      provider: "google",
      google_account_email: opts.tokens.email,
      google_calendar_id: opts.calendarId ?? "primary",
      scopes: opts.tokens.scope,
      refresh_token_encrypted: encryptText(opts.tokens.refreshToken),
      access_token_encrypted: encryptText(opts.tokens.accessToken),
      access_token_expires_at: new Date(opts.tokens.expiresAt).toISOString(),
      status: "connected",
      last_error: null,
      connected_at: new Date().toISOString(),
      last_synced_at: new Date().toISOString(),
    },
    { onConflict: "business_id" }
  );
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

/** Disconnect: revoke at Google (best-effort) and delete our row. */
export async function deleteConnection(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string
): Promise<void> {
  const row = await getConnection(admin, tenantId, businessId);
  if (row?.refresh_token_encrypted) {
    const token = decryptText(row.refresh_token_encrypted);
    if (token) await revokeToken(token);
  }
  await admin
    .from("calendar_connections")
    .delete()
    .eq("tenant_id", tenantId)
    .eq("business_id", businessId);
}
