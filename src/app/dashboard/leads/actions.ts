"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { isPipelineStage } from "@/lib/crm/pipeline";
import { createClient } from "@/lib/supabase/server";

/** Move a lead to a stage from the pipeline board (manual override). */
export async function moveLeadStage(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const leadId = String(formData.get("lead_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!leadId || !isPipelineStage(status)) return;

  await supabase
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/leads");
}
