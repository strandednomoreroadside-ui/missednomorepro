"use server";

import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Assigns a platform-owned Twilio number to a tenant (M6). Numbers are
 * a platform resource during beta — only ADMIN_EMAILS may do this.
 */
export async function assignPhoneNumber(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    redirect("/dashboard");
  }
  const user = await getUser();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const phone = normalizeUsPhone(String(formData.get("phone_number") ?? ""));
  if (!tenantId || !phone) {
    redirect(`/admin?error=${encodeURIComponent("Pick a tenant and enter a valid US number.")}`);
  }

  const admin = createAdminClient();

  // Attach to the tenant's business when one exists (greeting uses it).
  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error } = await admin.from("phone_numbers").upsert(
    {
      tenant_id: tenantId,
      business_id: business?.id ?? null,
      phone_number: phone,
      voice_enabled: true,
      sms_enabled: true,
    },
    { onConflict: "phone_number" }
  );
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  await logAudit({
    tenantId,
    actorUserId: user?.id,
    action: "phone_number.assigned",
    entityType: "phone_number",
    entityId: phone,
  });

  redirect("/admin?assigned=1");
}
