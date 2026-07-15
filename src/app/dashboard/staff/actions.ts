"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { normalizeUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

/** Same RLS policy as the setup wizard's staff step ("members manage their
 *  staff contacts") — any signed-in member of the org can add/edit/remove,
 *  not just owner/admin. This page is just a persistent home for the same
 *  staff_contacts table the wizard's "Staff notifications" step writes to. */

async function requireBusiness() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, tenant_id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return { active, supabase, business };
}

export type StaffActionResult = { ok: boolean; error?: string };

export async function addStaffContact(formData: FormData): Promise<StaffActionResult> {
  const { active, supabase, business } = await requireBusiness();
  if (!business) return { ok: false, error: "Finish setup first." };

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    return { ok: false, error: "Enter a name." };
  }
  const phone = normalizeUsPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { ok: false, error: "Enter a valid US phone number." };

  const { error } = await supabase.from("staff_contacts").insert({
    tenant_id: active.organization_id,
    business_id: business.id,
    name,
    phone,
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/staff");
  return { ok: true };
}

/** Bound directly to a plain <form action>, so — like team/actions.ts's
 *  removeMember — this returns void rather than a result the form can't read. */
export async function removeStaffContact(formData: FormData): Promise<void> {
  const { active, supabase } = await requireBusiness();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase
    .from("staff_contacts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/staff");
}

/** Whether this staff member gets new-lead/dispatch alerts (and — since the
 *  callback IVR and dispatch-board assignment both read staff_contacts —
 *  whether they show up there too; there's no separate flag for those, so
 *  this is really "is this person an active staff contact"). */
export async function toggleNotifyOnLead(formData: FormData): Promise<StaffActionResult> {
  const { active, supabase } = await requireBusiness();
  const id = String(formData.get("id") ?? "");
  const enabled = formData.get("notify_on_lead") === "true";
  if (!id) return { ok: false, error: "Missing id." };

  const { error } = await supabase
    .from("staff_contacts")
    .update({ notify_on_lead: enabled })
    .eq("id", id)
    .eq("tenant_id", active.organization_id);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/dashboard/staff");
  return { ok: true };
}
