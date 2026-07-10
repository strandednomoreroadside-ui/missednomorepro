"use server";

import { revalidatePath } from "next/cache";

import { isOrgManager, requireActiveOrg } from "@/lib/auth";
import { AUTOMATION_DEFAULTS, AUTOMATION_KINDS, type AutomationKind } from "@/lib/sms/outbound-engine";
import { createClient } from "@/lib/supabase/server";

/** Save one follow-up automation's config. Owner/admin only — automations
 *  drive proactive outbound texting (cost + TCPA compliance surface). */
export async function saveAutomation(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  if (!isOrgManager(active.role)) return;
  const supabase = await createClient();

  const kind = String(formData.get("kind") ?? "") as AutomationKind;
  if (!AUTOMATION_KINDS.includes(kind)) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const def = AUTOMATION_DEFAULTS[kind];
  const enabled = formData.get("enabled") === "on";
  const template = String(formData.get("template") ?? "").trim() || def.template;
  const delayRaw = Number(formData.get("delay"));
  const delay = Number.isFinite(delayRaw) && delayRaw > 0 ? Math.round(delayRaw) : def.delay;

  const patch: Record<string, unknown> = {
    tenant_id: active.organization_id,
    business_id: business.id,
    kind,
    enabled,
    template,
    delay_hours: def.unit === "hours" ? Math.min(delay, 720) : null,
    delay_days: def.unit === "days" ? Math.min(delay, 730) : null,
  };

  await supabase
    .from("automations")
    .upsert(patch, { onConflict: "business_id,kind" });

  revalidatePath("/dashboard/automations");
}
