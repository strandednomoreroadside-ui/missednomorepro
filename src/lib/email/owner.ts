import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The org owner's auth email, or null. The owner is the earliest
 * organization_members row with role 'owner'; their email lives in
 * auth.users (reachable only via the service role). Shared by billing
 * receipts, usage alerts, and the weekly value email.
 */
export async function ownerEmail(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data: ownerRow } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", tenantId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const ownerId = (ownerRow as { user_id?: string } | null)?.user_id;
  if (!ownerId) return null;
  const { data } = await admin.auth.admin.getUserById(ownerId);
  return data.user?.email ?? null;
}
