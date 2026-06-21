"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { generateCallIntelligence } from "@/lib/insights/call-intelligence";
import { createAdminClient } from "@/lib/supabase/admin";

/** Generate this week's Call Intelligence report on demand (the cron does it
 *  weekly; this lets the owner refresh it now). Gated on the add-on. */
export async function generateInsightsNow(): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);
  if (!ent.has("call_intelligence")) return;

  await generateCallIntelligence(createAdminClient(), tenantId);
  revalidatePath("/dashboard/insights");
}
