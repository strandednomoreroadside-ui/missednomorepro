"use server";

import { revalidatePath } from "next/cache";

import { isOrgManager, requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

/** Save Reputation Manager settings. Owner/admin only (proactive outbound
 *  review-request campaign) + gated on the add-on. */
export async function updateReputation(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  if (!isOrgManager(active.role)) return;
  const tenantId = active.organization_id;

  const ent = await getEntitlements(tenantId);
  if (!ent.has("reputation_manager")) return;

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const enabled = formData.get("reputation_enabled") === "on";
  const template = String(formData.get("review_request_template") ?? "").trim();
  const facebook = String(formData.get("review_facebook_url") ?? "").trim();

  const patch: Record<string, unknown> = {
    reputation_enabled: enabled,
    review_facebook_url: facebook || null,
  };
  if (template) patch.review_request_template = template;

  await supabase
    .from("sms_settings")
    .update(patch)
    .eq("business_id", business.id)
    .eq("tenant_id", tenantId);

  revalidatePath("/dashboard/reputation");
}
