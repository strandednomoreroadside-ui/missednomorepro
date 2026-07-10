"use server";

import { redirect } from "next/navigation";

import { logAudit } from "@/lib/audit";
import { getUser, isPlatformAdmin } from "@/lib/auth";
import { env } from "@/lib/env";
import { normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { configureNumberWebhooks, isTwilioConfigured } from "@/lib/twilio/numbers";

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

  // Point the number's Twilio webhooks at the app so the AI answers it right
  // away — without this the number is assigned in our DB but still on Twilio's
  // defaults (the "assigned but dead" trap). Best-effort; store the sid if we
  // get it. Voice works regardless of the A2P SMS attach inside this helper.
  let twilioSid: string | null = null;
  if (isTwilioConfigured()) {
    const cfg = await configureNumberWebhooks({ phoneNumber: phone, appUrl: env.NEXT_PUBLIC_APP_URL });
    if (cfg.ok) twilioSid = cfg.sid ?? null;
    else console.error(`[admin] assigned ${phone} but webhook config failed: ${cfg.error}`);
  }

  const { error } = await admin.from("phone_numbers").upsert(
    {
      tenant_id: tenantId,
      business_id: business?.id ?? null,
      phone_number: phone,
      // Only overwrite the sid when we actually resolved one this run.
      ...(twilioSid ? { twilio_sid: twilioSid } : {}),
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

/**
 * Platform kill switch (M10 / §15): force a tenant's AI receptionist off
 * (their calls forward to the owner) or back on — for a misbehaving or
 * abusive tenant. Only ADMIN_EMAILS may do this.
 */
export async function setTenantAiEnabled(formData: FormData) {
  if (!(await isPlatformAdmin())) {
    redirect("/dashboard");
  }
  const user = await getUser();

  const tenantId = String(formData.get("tenant_id") ?? "").trim();
  const enabled = String(formData.get("enabled") ?? "") === "1";
  if (!tenantId) redirect("/admin");

  const admin = createAdminClient();
  const { error } = await admin
    .from("businesses")
    .update({ ai_enabled: enabled })
    .eq("tenant_id", tenantId);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  await logAudit({
    tenantId,
    actorUserId: user?.id,
    action: enabled ? "ai.enabled_by_admin" : "ai.disabled_by_admin",
    entityType: "business",
    entityId: tenantId,
  });

  redirect("/admin");
}
