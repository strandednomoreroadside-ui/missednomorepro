"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { addDays, parseDateString, todayInZone, zonedTimeToUtc } from "@/lib/calendar/timezone";
import { sendStaffSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";

/** Assign (or clear) the team member on a job or appointment. Admin client
 *  with explicit tenant checks — appointments are otherwise server-only. */
export async function assignWork(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;

  const kind = String(formData.get("kind") ?? "");
  const id = String(formData.get("id") ?? "");
  const staffId = String(formData.get("assigned_to") ?? "");
  if (!id || (kind !== "job" && kind !== "appointment")) return;

  const admin = createAdminClient();

  let assigned: string | null = null;
  if (staffId) {
    const { data: staff } = await admin
      .from("staff_contacts")
      .select("id")
      .eq("id", staffId)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    if (!staff) return; // not this tenant's staff — ignore
    assigned = staffId;
  }

  const table = kind === "job" ? "jobs" : "appointments";
  await admin
    .from(table)
    .update({ assigned_to: assigned })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/dashboard/dispatch");
}

/** Text a team member their schedule for a given day (internal recipient —
 *  logged, no consent gate, via sendStaffSms). */
export async function textTechSchedule(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;

  const staffId = String(formData.get("staff_id") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  if (!staffId) return;

  const admin = createAdminClient();
  const { data: staff } = await admin
    .from("staff_contacts")
    .select("id, name, phone, business_id")
    .eq("id", staffId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!staff) return;

  const { data: biz } = await admin
    .from("businesses")
    .select("name, timezone")
    .eq("id", staff.business_id)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  const tz = (biz?.timezone as string) || "America/New_York";

  const target = parseDateString(dateStr) ?? todayInZone(tz);
  const next = addDays(target, 1);
  const fromIso = zonedTimeToUtc(target.year, target.month, target.day, 0, 0, tz).toISOString();
  const toIso = zonedTimeToUtc(next.year, next.month, next.day, 0, 0, tz).toISOString();

  const [appts, jobs] = await Promise.all([
    admin
      .from("appointments")
      .select("title, starts_at, location")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", staffId)
      .eq("status", "confirmed")
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso)
      .order("starts_at", { ascending: true }),
    admin
      .from("jobs")
      .select("title, scheduled_for, address")
      .eq("tenant_id", tenantId)
      .eq("assigned_to", staffId)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_for", fromIso)
      .lt("scheduled_for", toIso)
      .order("scheduled_for", { ascending: true }),
  ]);

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz });

  const rows = [
    ...(appts.data ?? []).map((a) => ({
      t: a.starts_at as string,
      line: `${time(a.starts_at as string)} ${a.title}${a.location ? ` @ ${a.location}` : ""}`,
    })),
    ...(jobs.data ?? [])
      .filter((j) => j.scheduled_for)
      .map((j) => ({
        t: j.scheduled_for as string,
        line: `${time(j.scheduled_for as string)} ${j.title}${j.address ? ` @ ${j.address}` : ""}`,
      })),
  ].sort((a, b) => new Date(a.t).getTime() - new Date(b.t).getTime());

  const dayLabel = new Date(fromIso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
  const body = rows.length
    ? `${biz?.name ?? "Schedule"} — ${dayLabel}:\n${rows.map((r) => `• ${r.line}`).join("\n")}`
    : `${biz?.name ?? "Schedule"} — ${dayLabel}: no jobs assigned to you.`;

  await sendStaffSms(admin, {
    tenantId,
    businessId: staff.business_id as string,
    toPhone: staff.phone as string,
    body,
  });

  revalidatePath("/dashboard/dispatch");
}
