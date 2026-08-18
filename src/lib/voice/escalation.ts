import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { logAudit } from "@/lib/audit";
import { formatUsPhone } from "@/lib/phone";
import { sendStaffSms } from "@/lib/sms/outbound";

/** The durable, text-only fallback for a person request. It is deliberately
 * separate from a live handoff: callers are only text-escalated after there
 * is no configured recipient or a real recipient attempt has failed. */
export async function recordHumanEscalation(input: {
  admin: SupabaseClient;
  tenantId: string;
  businessId: string | null;
  contactId: string | null;
  callId: string | null;
  businessName: string;
  fromNumber: string;
  reason: string;
  summary: string;
  source?: "ai" | "system";
}): Promise<{ taskId: string | null; sent: number }> {
  const { data: task } = await input.admin
    .from("follow_up_tasks")
    .insert({
      tenant_id: input.tenantId,
      business_id: input.businessId,
      contact_id: input.contactId,
      call_id: input.callId,
      type: "escalation",
      title: `Escalation: ${input.reason}`.slice(0, 200),
      details: input.summary.slice(0, 600),
      priority: "urgent",
      source: input.source ?? "ai",
    })
    .select("id")
    .single();

  if (input.callId) {
    await input.admin
      .from("calls")
      .update({ disposition: "escalated" })
      .eq("id", input.callId)
      .eq("tenant_id", input.tenantId);
  }

  let staffQuery = input.admin
    .from("staff_contacts")
    .select("phone")
    .eq("tenant_id", input.tenantId)
    .eq("notify_on_lead", true);
  if (input.businessId) staffQuery = staffQuery.eq("business_id", input.businessId);
  const { data: staff } = await staffQuery;

  const body =
    `URGENT - ${input.businessName}: a caller needs a person. ${input.summary.slice(0, 600)} ` +
    `Call: ${formatUsPhone(input.fromNumber)}`;
  let sent = 0;
  for (const person of staff ?? []) {
    const result = await sendStaffSms(input.admin, {
      tenantId: input.tenantId,
      businessId: input.businessId,
      toPhone: person.phone,
      body,
    });
    if (result.sent) sent += 1;
  }

  await logAudit({
    tenantId: input.tenantId,
    action: "voice.handoff.text_escalation",
    entityType: "call",
    entityId: input.callId ?? undefined,
    metadata: { reason: input.reason, staffCount: staff?.length ?? 0, sent },
  });

  return { taskId: task?.id ?? null, sent };
}
