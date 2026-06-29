"use server";

import { revalidatePath } from "next/cache";

import { persistChatMessage, touchConversation } from "@/lib/chat/conversation";
import { requireActiveOrg } from "@/lib/auth";
import { sendConversationEmail } from "@/lib/email/conversation-email";
import { sendCustomerSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";

type ConvoLite = {
  id: string;
  tenant_id: string;
  business_id: string | null;
  channel: "web" | "sms" | "email";
  customer_phone: string | null;
  customer_email: string | null;
  subject: string | null;
  contact_id: string | null;
};

async function loadOwnedConversation(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  conversationId: string
): Promise<ConvoLite | null> {
  const { data } = await admin
    .from("conversations")
    .select(
      "id, tenant_id, business_id, channel, customer_phone, customer_email, subject, contact_id"
    )
    .eq("id", conversationId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  return (data as ConvoLite | null) ?? null;
}

/** Deliver a staff reply over email — same identity/threading as the AI. */
async function sendStaffEmail(
  admin: ReturnType<typeof createAdminClient>,
  convo: ConvoLite,
  body: string
): Promise<void> {
  if (!convo.customer_email) return;

  let sQ = admin
    .from("sms_settings")
    .select("email_inbound_token, email_signature")
    .eq("tenant_id", convo.tenant_id);
  sQ = convo.business_id
    ? sQ.eq("business_id", convo.business_id)
    : sQ.order("created_at", { ascending: true });
  const { data: settings } = await sQ.limit(1).maybeSingle();
  const token = (settings?.email_inbound_token as string | null) ?? null;
  if (!token) return;

  let bQ = admin.from("businesses").select("name").eq("tenant_id", convo.tenant_id);
  bQ = convo.business_id
    ? bQ.eq("id", convo.business_id)
    : bQ.order("created_at", { ascending: true });
  const { data: biz } = await bQ.limit(1).maybeSingle();

  // Thread under the customer's most recent message.
  const { data: lastInbound } = await admin
    .from("conversation_messages")
    .select("external_id")
    .eq("conversation_id", convo.id)
    .eq("role", "customer")
    .not("external_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  await sendConversationEmail({
    to: convo.customer_email,
    businessName: (biz?.name as string | undefined) || "Support",
    token,
    subject: convo.subject || "your message",
    body,
    signature: (settings?.email_signature as string | null) ?? null,
    inReplyTo: (lastInbound?.external_id as string | null) ?? null,
  });
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
  } else if (convo.channel === "email") {
    await sendStaffEmail(admin, convo, body);
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
