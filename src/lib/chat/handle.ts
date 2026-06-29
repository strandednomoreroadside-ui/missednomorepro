import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEntitlementsWith } from "@/lib/billing/entitlements";

import {
  getChatBusiness,
  persistChatMessage,
  touchConversation,
  upsertConversation,
  type ChatChannel,
  type ConversationRow,
} from "./conversation";
import { generateChatReply } from "./engine";

export type TurnResult = {
  ok: boolean;
  reason?: string;
  conversation?: ConversationRow;
  /** The AI reply, or null when the AI didn't run (taken over / skipped). */
  reply?: string | null;
};

/**
 * One inbound customer message → (optional) AI reply, for BOTH channels.
 * Gated on the omnichannel_chat add-on. Persists the customer turn, then —
 * unless the AI is off for the thread or the caller asks us to skip it —
 * generates and persists the AI reply. Delivery differs per channel: the
 * web route returns `reply` in the response; the SMS webhook sends it via
 * the gated sender. Tenant is always resolved server-side by the caller.
 */
export async function runChatTurn(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId?: string | null;
    channel: ChatChannel;
    webVisitorId?: string | null;
    customerPhone?: string | null;
    customerEmail?: string | null;
    customerName?: string | null;
    subject?: string | null;
    /** Inbound provider Message-ID (email) — stored for idempotency. */
    externalId?: string | null;
    text: string;
    /** Skip the AI even if the thread allows it (e.g. SMS opted-out). */
    skipAi?: boolean;
  }
): Promise<TurnResult> {
  const ent = await getEntitlementsWith(admin, opts.tenantId);
  if (!ent.has("omnichannel_chat")) return { ok: false, reason: "not_entitled" };

  const business = await getChatBusiness(admin, opts.tenantId, opts.businessId);
  const businessId = business?.id ?? opts.businessId ?? null;

  // Tie the thread to an existing contact up front: SMS by number, email by
  // address (so an inbound email lands on the right CRM record + timeline).
  let contactId: string | null = null;
  if (opts.channel === "sms" && opts.customerPhone) {
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", opts.tenantId)
      .eq("phone", opts.customerPhone)
      .maybeSingle();
    contactId = (data?.id as string | undefined) ?? null;
  } else if (opts.channel === "email" && opts.customerEmail) {
    // Case-insensitive exact match: escape ilike's _/% wildcards so an email
    // with an underscore can't match the wrong contact.
    const pattern = opts.customerEmail.replace(/([\\%_])/g, "\\$1");
    const { data } = await admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", opts.tenantId)
      .ilike("email", pattern)
      .maybeSingle();
    contactId = (data?.id as string | undefined) ?? null;
  }

  const conversation = await upsertConversation(admin, {
    tenantId: opts.tenantId,
    businessId,
    channel: opts.channel,
    webVisitorId: opts.webVisitorId,
    customerPhone: opts.customerPhone,
    customerEmail: opts.customerEmail,
    customerName: opts.customerName,
    subject: opts.subject,
    contactId,
  });
  if (!conversation) return { ok: false, reason: "no_conversation" };

  await persistChatMessage(admin, {
    tenantId: opts.tenantId,
    conversationId: conversation.id,
    role: "customer",
    body: opts.text,
    externalId: opts.externalId,
  });
  await touchConversation(admin, {
    tenantId: opts.tenantId,
    conversationId: conversation.id,
    preview: opts.text,
    incUnread: 1,
  });

  if (opts.skipAi || !conversation.ai_enabled) {
    return { ok: true, conversation, reply: null };
  }

  const { reply, contactId: resolved } = await generateChatReply(admin, conversation);
  await persistChatMessage(admin, {
    tenantId: opts.tenantId,
    conversationId: conversation.id,
    role: "ai",
    body: reply,
  });
  await touchConversation(admin, {
    tenantId: opts.tenantId,
    conversationId: conversation.id,
    preview: reply,
    contactId: resolved ?? undefined,
  });

  return { ok: true, conversation, reply };
}
