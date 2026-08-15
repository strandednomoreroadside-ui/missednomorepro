import "server-only";

import { analytics } from "@heycatch/sdk";
import type { SupabaseClient } from "@supabase/supabase-js";

// Module scope, once per server bundle, key inlined — same rule as the
// client entry point (src/instrumentation-client.ts).
analytics.init({ projectKey: "hck_pk_NnsaReKMCmiHRZhKwDQ30pG5o2GyFc7w" });

export { analytics };

/**
 * The stable person id for a business event is the org owner's Supabase
 * auth user id — the SAME id the browser side identifies with
 * (src/components/analytics/identify.tsx) — since Stripe subscriptions are
 * keyed by tenant/organization, not by an individual user.
 */
export async function getTenantOwnerUserId(
  admin: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await admin
    .from("organization_members")
    .select("user_id")
    .eq("organization_id", tenantId)
    .eq("role", "owner")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.user_id as string | undefined) ?? null;
}
