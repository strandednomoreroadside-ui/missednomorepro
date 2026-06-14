"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Update the missed-call text-back settings (M8). Members may manage their
 *  own sms_settings (RLS), so this runs on the user-scoped client. */
export async function updateTextBack(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const enabled = formData.get("text_back_enabled") === "on";
  const template = String(formData.get("text_back_template") ?? "").trim();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const patch: Record<string, unknown> = { text_back_enabled: enabled };
  if (template) patch.text_back_template = template;

  await supabase
    .from("sms_settings")
    .update(patch)
    .eq("business_id", business.id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/settings");
}
