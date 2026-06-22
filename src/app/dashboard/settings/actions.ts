"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { env } from "@/lib/env";
import { deleteConnection } from "@/lib/google/connection";
import { isGoogleConfigured } from "@/lib/google/credentials";
import { buildConsentUrl } from "@/lib/google/oauth";
import { normalizeUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
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

/** Update the booking confirmation SMS template (M9). */
export async function updateBookingConfirmation(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const template = String(formData.get("booking_confirmation_template") ?? "").trim();
  if (!template) return;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  await supabase
    .from("sms_settings")
    .update({ booking_confirmation_template: template })
    .eq("business_id", business.id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/settings");
}

/** AI receptionist kill switch (M10 / §14). When off — or when a usage/
 *  spend cap trips — inbound calls forward to forward_number instead of the
 *  AI. Members may manage their own business (RLS). */
export async function updateAiSwitch(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const enabled = formData.get("ai_enabled") === "on";
  const rawForward = String(formData.get("forward_number") ?? "").trim();
  // Blank clears it; otherwise normalize to E.164 (ignore unparseable input
  // rather than saving junk the dialer can't ring).
  const forward = rawForward ? normalizeUsPhone(rawForward) : null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const patch: Record<string, unknown> = { ai_enabled: enabled };
  if (rawForward === "" || forward) patch.forward_number = forward;

  await supabase
    .from("businesses")
    .update(patch)
    .eq("id", business.id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/settings");
}

/** Update appointment-reminder settings (roadmap #3). */
export async function updateReminders(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const enabled = formData.get("reminder_enabled") === "on";
  const template = String(formData.get("reminder_template") ?? "").trim();
  const leadRaw = Number(formData.get("reminder_lead_hours"));
  const leadHours =
    Number.isFinite(leadRaw) && leadRaw >= 1 && leadRaw <= 168 ? Math.round(leadRaw) : null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const patch: Record<string, unknown> = { reminder_enabled: enabled };
  if (template) patch.reminder_template = template;
  if (leadHours != null) patch.reminder_lead_hours = leadHours;

  await supabase
    .from("sms_settings")
    .update(patch)
    .eq("business_id", business.id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/settings");
}

/** Update omnichannel chat settings (Phase 10): website widget + two-way
 *  AI SMS. Members may manage their own sms_settings (RLS). */
export async function updateChatSettings(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const webEnabled = formData.get("web_chat_enabled") === "on";
  const smsAi = formData.get("two_way_sms_ai_enabled") === "on";
  const greeting = String(formData.get("web_greeting") ?? "").trim();
  const accent = String(formData.get("widget_accent") ?? "").trim();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const patch: Record<string, unknown> = {
    web_chat_enabled: webEnabled,
    two_way_sms_ai_enabled: smsAi,
  };
  if (greeting) patch.web_greeting = greeting;
  if (/^#[0-9a-fA-F]{3,8}$/.test(accent)) patch.widget_accent = accent;

  await supabase
    .from("sms_settings")
    .update(patch)
    .eq("business_id", business.id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/settings");
}

/**
 * Start the Google Calendar OAuth flow (M9). Sets a CSRF state cookie and
 * redirects to Google's consent screen. The connection is finished in
 * /api/google/callback.
 */
export async function connectGoogleCalendar() {
  await requireActiveOrg();
  if (!isGoogleConfigured()) redirect("/dashboard/settings?calendar=unconfigured");

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("g_oauth_state", state, {
    httpOnly: true,
    secure: env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const url = buildConsentUrl(state);
  if (!url) redirect("/dashboard/settings?calendar=unconfigured");
  redirect(url);
}

/** Disconnect Google Calendar: revoke at Google + delete our row (M9). */
export async function disconnectGoogleCalendar() {
  const { active } = await requireActiveOrg();
  const admin = createAdminClient();

  const { data: business } = await admin
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (business) {
    await deleteConnection(admin, active.organization_id, business.id as string);
  }
  revalidatePath("/dashboard/settings");
}
