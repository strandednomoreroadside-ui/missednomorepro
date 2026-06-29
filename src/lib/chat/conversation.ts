import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { decryptText, encryptText } from "@/lib/crypto";
import { redactPii } from "@/lib/redact";
import type { AgentBusiness } from "@/lib/voice/agent-sync";

export type ChatChannel = "web" | "sms" | "email";
export type MessageRole = "customer" | "ai" | "staff" | "system";

export type ConversationRow = {
  id: string;
  tenant_id: string;
  business_id: string | null;
  contact_id: string | null;
  channel: ChatChannel;
  status: "open" | "closed";
  ai_enabled: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  web_visitor_id: string | null;
  subject: string | null;
};

/** The first business for a tenant (or a specific one) in the AgentBusiness
 *  shape loadPromptInput/buildChatSystemPrompt expect. */
export async function getChatBusiness(
  admin: SupabaseClient,
  tenantId: string,
  businessId?: string | null
): Promise<AgentBusiness | null> {
  let q = admin
    .from("businesses")
    .select("id, tenant_id, name, industry, timezone, status")
    .eq("tenant_id", tenantId);
  if (businessId) q = q.eq("id", businessId);
  else q = q.order("created_at", { ascending: true }).limit(1);
  const { data } = await q.maybeSingle();
  return (data as AgentBusiness | null) ?? null;
}

/** Find-or-create the OPEN conversation for a web visitor or an SMS number.
 *  Relies on the partial-unique indexes for the open thread per channel. */
export async function upsertConversation(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId: string | null;
    channel: ChatChannel;
    webVisitorId?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    contactId?: string | null;
    customerName?: string | null;
    subject?: string | null;
  }
): Promise<ConversationRow | null> {
  const cols =
    "id, tenant_id, business_id, contact_id, channel, status, ai_enabled, customer_name, customer_phone, customer_email, web_visitor_id, subject";

  // Look for an existing open thread first.
  let find = admin
    .from("conversations")
    .select(cols)
    .eq("tenant_id", opts.tenantId)
    .eq("channel", opts.channel)
    .eq("status", "open");
  if (opts.channel === "web") find = find.eq("web_visitor_id", opts.webVisitorId ?? "");
  else if (opts.channel === "email")
    // customer_email is always stored lowercased for email threads, so an
    // exact match is correct (and avoids ilike's _/% wildcard pitfalls).
    find = find.eq("customer_email", (opts.customerEmail ?? "").toLowerCase());
  else find = find.eq("customer_phone", opts.customerPhone ?? "");
  const { data: existing } = await find.maybeSingle();
  if (existing) {
    // Attach a contact we resolved since the thread opened.
    if (opts.contactId && !(existing as ConversationRow).contact_id) {
      await admin
        .from("conversations")
        .update({ contact_id: opts.contactId })
        .eq("id", (existing as ConversationRow).id)
        .eq("tenant_id", opts.tenantId);
      (existing as ConversationRow).contact_id = opts.contactId;
    }
    return existing as ConversationRow;
  }

  const { data: created, error } = await admin
    .from("conversations")
    .insert({
      tenant_id: opts.tenantId,
      business_id: opts.businessId,
      channel: opts.channel,
      status: "open",
      contact_id: opts.contactId ?? null,
      customer_phone: opts.customerPhone ?? null,
      customer_email: opts.customerEmail ? opts.customerEmail.toLowerCase() : null,
      web_visitor_id: opts.webVisitorId ?? null,
      customer_name: opts.customerName ?? null,
      subject: opts.subject ?? null,
    })
    .select(cols)
    .single();
  if (error) {
    console.error("[chat] upsertConversation failed:", error.message);
    return null;
  }
  return created as ConversationRow;
}

/** Persist a message (encrypted at rest + redacted display copy, like SMS). */
export async function persistChatMessage(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    conversationId: string;
    role: MessageRole;
    body: string;
    authorId?: string | null;
    /** Provider Message-ID (email), stored for idempotency + threading. */
    externalId?: string | null;
  }
): Promise<void> {
  await admin.from("conversation_messages").insert({
    tenant_id: opts.tenantId,
    conversation_id: opts.conversationId,
    role: opts.role,
    body_redacted: redactPii(opts.body).redacted,
    body_encrypted: encryptText(opts.body),
    author_id: opts.authorId ?? null,
    external_id: opts.externalId ?? null,
  });
}

/** True if we've already stored an inbound message with this provider id
 *  (email Message-ID) — so a Worker/provider retry never double-replies. */
export async function messageExistsByExternalId(
  admin: SupabaseClient,
  tenantId: string,
  externalId: string
): Promise<boolean> {
  if (!externalId) return false;
  const { data } = await admin
    .from("conversation_messages")
    .select("id")
    .eq("tenant_id", tenantId)
    .eq("external_id", externalId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}

/** Recent turns for the model, oldest→newest. Decrypts when possible, else
 *  falls back to the redacted copy. */
export async function loadHistory(
  admin: SupabaseClient,
  conversationId: string,
  limit = 16
): Promise<{ role: MessageRole; content: string }[]> {
  const { data } = await admin
    .from("conversation_messages")
    .select("role, body_encrypted, body_redacted, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []).reverse() as {
    role: MessageRole;
    body_encrypted: string | null;
    body_redacted: string | null;
  }[];
  return rows.map((r) => ({
    role: r.role,
    content:
      (r.body_encrypted ? decryptText(r.body_encrypted) : null) ?? r.body_redacted ?? "",
  }));
}

/** Update the inbox-facing summary fields after a new message. */
export async function touchConversation(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    conversationId: string;
    preview: string;
    incUnread?: number;
    contactId?: string | null;
  }
): Promise<void> {
  const patch: Record<string, unknown> = {
    last_message_at: new Date().toISOString(),
    last_message_preview: redactPii(opts.preview).redacted.slice(0, 160),
  };
  if (opts.contactId) patch.contact_id = opts.contactId;
  if (opts.incUnread) {
    const { data } = await admin
      .from("conversations")
      .select("unread_count")
      .eq("id", opts.conversationId)
      .maybeSingle();
    patch.unread_count = ((data?.unread_count as number | null) ?? 0) + opts.incUnread;
  }
  await admin
    .from("conversations")
    .update(patch)
    .eq("id", opts.conversationId)
    .eq("tenant_id", opts.tenantId);
}
