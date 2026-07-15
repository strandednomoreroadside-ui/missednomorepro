"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { isOrgManager, requireActiveOrg } from "@/lib/auth";
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
  // The AI kill switch silences the whole business's receptionist — owner/admin
  // only, so a plain member (e.g. a field tech) can't turn it off.
  if (!isOrgManager(active.role)) redirect("/dashboard/settings?error=permission");
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

/** Callback IVR — "call your own business number to place a call from it."
 *  Owner/admin only: it's a shared PIN that lets ANY staff member on file
 *  place outbound calls billed to the business, so only a manager should be
 *  able to turn it on or change the PIN. */
export async function updateCallbackIvr(formData: FormData) {
  const { active } = await requireActiveOrg();
  if (!isOrgManager(active.role)) redirect("/dashboard/settings?error=permission");
  const supabase = await createClient();

  const enabled = formData.get("callback_ivr_enabled") === "on";
  const rawPin = String(formData.get("callback_ivr_pin") ?? "").trim();
  const pin = rawPin.replace(/\D/g, "");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  // Blank PIN means "leave it unchanged" — the field is prefilled with the
  // saved PIN, so blank only happens if it was never set. Either way,
  // maybeStartCallbackIvr() already refuses to activate without a PIN, so
  // this checkbox alone can never open the gate with no second factor.
  const patch: Record<string, unknown> = { callback_ivr_enabled: enabled };
  if (rawPin) {
    if (pin.length < 4 || pin.length > 8) {
      redirect("/dashboard/settings?error=bad_pin");
    }
    patch.callback_ivr_pin = pin;
  }

  await supabase
    .from("sms_settings")
    .update(patch)
    .eq("business_id", business.id)
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

/**
 * Update the immediate-dispatch confirmation + ETA settings. The ETA the
 * caller is texted = base + per-job × (open jobs on today's board). Members
 * may manage their own sms_settings (RLS).
 */
export async function updateDispatchEta(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const enabled = formData.get("dispatch_confirmation_enabled") === "on";
  const template = String(formData.get("dispatch_confirmation_template") ?? "").trim();
  const baseRaw = Number(formData.get("eta_base_minutes"));
  const perJobRaw = Number(formData.get("eta_per_job_minutes"));
  const baseMinutes =
    Number.isFinite(baseRaw) && baseRaw >= 0 && baseRaw <= 1440 ? Math.round(baseRaw) : null;
  const perJobMinutes =
    Number.isFinite(perJobRaw) && perJobRaw >= 0 && perJobRaw <= 240 ? Math.round(perJobRaw) : null;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) return;

  const patch: Record<string, unknown> = { dispatch_confirmation_enabled: enabled };
  if (template) patch.dispatch_confirmation_template = template;
  if (baseMinutes != null) patch.eta_base_minutes = baseMinutes;
  if (perJobMinutes != null) patch.eta_per_job_minutes = perJobMinutes;

  await supabase
    .from("sms_settings")
    .update(patch)
    .eq("business_id", business.id)
    .eq("tenant_id", active.organization_id);

  revalidatePath("/dashboard/settings");
}

/** Toggle the weekly value email (Later backlog). Members may manage their
 *  own sms_settings (RLS). */
export async function updateWeeklyReport(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const enabled = formData.get("weekly_report_enabled") === "on";

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
    .update({ weekly_report_enabled: enabled })
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

/** Update the email channel settings (part of the Omnichannel add-on):
 *  the AI-answers-email toggle + the reply signature. Members manage their
 *  own sms_settings (RLS). The forward token is server-managed, not editable. */
export async function updateEmailSettings(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const emailEnabled = formData.get("email_inbound_enabled") === "on";
  const signature = String(formData.get("email_signature") ?? "").trim().slice(0, 400);

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
    .update({ email_inbound_enabled: emailEnabled, email_signature: signature || null })
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
  const { active } = await requireActiveOrg();
  // Connecting a calendar controls booking for the whole business (and points
  // it at someone's personal Google account) — owner/admin only.
  if (!isOrgManager(active.role)) redirect("/dashboard/settings?error=permission");
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
  if (!isOrgManager(active.role)) redirect("/dashboard/settings?error=permission");
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
