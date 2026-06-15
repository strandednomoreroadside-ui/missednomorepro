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
