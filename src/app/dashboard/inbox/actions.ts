"use server";

import { revalidatePath } from "next/cache";

import { persistChatMessage, touchConversation } from "@/lib/chat/conversation";
import { requireActiveOrg } from "@/lib/auth";
import { sendCustomerSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";

type ConvoLite = {
  id: string;
  tenant_id: string;
  business_id: string | null;
  channel: "web" | "sms";
  customer_phone: string | null;
  contact_id: string | null;
};

async function loadOwnedConversation(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  conversationId: string
): Promise<ConvoLite | null> {
  const { data } = await admin
    .from("conversations")
    .select("id, tenant_id, business_id, channel, customer_phone, contact_id")
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as ConvoLite | null) ?? null;
}

/** Staff replies in a thread. Web → lands in the thread (widget polls it up).
 *  SMS → also delivered via the gated sender (STOP still wins). */
export async function sendStaffReply(formData: FormData) {
  const { user, active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const conversationId = String(formData.get("conversationId") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!conversationId || !body) return;

  const admin = createAdminClient();
  const convo = await loadOwnedConversation(admin, tenantId, conversationId);
  if (!convo) return;

  await persistChatMessage(admin, {
    tenantId,
    conversationId,
    role: "staff",
    body,
    authorId: user.id,
  });
  await touchConversation(admin, { tenantId, conversationId, preview: body });

  if (convo.channel === "sms" && convo.customer_phone) {
    await sendCustomerSms(admin, {
      tenantId,
      businessId: convo.business_id,
      contactId: convo.contact_id,
      toPhone: convo.customer_phone,
      body,
      kind: "manual",
      requireConsent: false,
    });
  }

  revalidatePath("/dashboard/inbox");
}

/** Take over (AI off) or hand back (AI on) a conversation. */
export async function toggleConversationAi(formData: FormData) {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const conversationId = String(formData.get("conversationId") ?? "");
  const enabled = formData.get("ai_enabled") === "on";
  if (!conversationId) return;

  const admin = createAdminClient();
  await admin
    .from("conversations")
    .update({ ai_enabled: enabled })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId);

  revalidatePath("/dashboard/inbox");
}

/** Close (or reopen) a conversation. */
export async function setConversationStatus(formData: FormData) {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const conversationId = String(formData.get("conversationId") ?? "");
  const status = formData.get("status") === "open" ? "open" : "closed";
  if (!conversationId) return;

  const admin = createAdminClient();
  await admin
    .from("conversations")
    .update({ status })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId);

  revalidatePath("/dashboard/inbox");
}

/** Reset the unread badge when staff opens a thread. */
export async function markConversationRead(conversationId: string) {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  if (!conversationId) return;
  const admin = createAdminClient();
  await admin
    .from("conversations")
    .update({ unread_count: 0 })
    .eq("id", conversationId)
    .eq("tenant_id", tenantId);
}
