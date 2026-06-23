import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";
import { loadPromptInput } from "@/lib/voice/agent-sync";
import { TOOLS, type ToolContext } from "@/lib/voice/tools/handlers";
import { isVoiceToolName, VOICE_TOOLS } from "@/lib/voice/tools/registry";

import { buildChatSystemPrompt } from "./prompt";
import {
  getChatBusiness,
  loadHistory,
  type ConversationRow,
} from "./conversation";

const MODEL = "gpt-4.1-mini";
const MAX_TURNS = 6;

/**
 * The customer-facing §10 tools the chat AI may call. A subset of the voice
 * registry: we drop voice-only/looping tools (mark_spam, send_sms) — the
 * rest are the SAME validated handlers the receptionist uses, so chat books,
 * quotes, and captures leads under identical §5.1/§9 guardrails.
 */
const CHAT_TOOL_NAMES = new Set<string>([
  "lookup_contact",
  "create_contact",
  "search_knowledge_base",
  "check_service_area",
  "notify_staff",
  "escalate_to_human",
  "create_follow_up_task",
  "check_calendar_availability",
  "book_appointment",
  "cancel_appointment",
  "reschedule_appointment",
  "calculate_quote",
  "find_tow_destination",
]);

const CHAT_TOOLS = VOICE_TOOLS.filter((t) => CHAT_TOOL_NAMES.has(t.name)).map((t) => ({
  type: "function" as const,
  function: { name: t.name, description: t.description, parameters: t.parameters },
}));

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

export type ChatEngineResult = {
  reply: string;
  /** A contact resolved/created during the turn, to link to the thread. */
  contactId: string | null;
};

/**
 * Generate the AI's reply for a conversation. The customer's latest message
 * must already be persisted (it's read back via loadHistory). Tenant /
 * business / contact are resolved server-side from the conversation row —
 * never from the model. Tool calls run through the §10 registry and are
 * logged to tool_calls (by conversation_id).
 */
export async function generateChatReply(
  admin: SupabaseClient,
  conversation: ConversationRow
): Promise<ChatEngineResult> {
  if (!env.OPENAI_API_KEY) {
    return { reply: "Thanks! Someone from our team will follow up shortly.", contactId: null };
  }

  const business = await getChatBusiness(admin, conversation.tenant_id, conversation.business_id);
  if (!business) {
    return { reply: "Thanks for reaching out — we'll be in touch shortly.", contactId: null };
  }

  const promptInput = await loadPromptInput(admin, business);
  const system = buildChatSystemPrompt(promptInput, {
    channel: conversation.channel,
    now: new Date(),
  });

  const history = await loadHistory(admin, conversation.id);
  const turns: ChatMessage[] = history
    .filter((m) => m.role !== "system" && m.content)
    .map((m) => ({
      role: m.role === "customer" ? "user" : "assistant",
      content: m.content,
    }));
  if (turns.length === 0) {
    return { reply: "Hi! How can we help you today?", contactId: null };
  }

  const ctx: ToolContext = {
    admin,
    tenantId: conversation.tenant_id,
    businessId: business.id,
    channel: conversation.channel,
    callId: null,
    conversationId: conversation.id,
    contactId: conversation.contact_id,
    fromNumber: conversation.customer_phone ?? "",
    businessName: business.name || "our team",
  };

  const messages: ChatMessage[] = [{ role: "system", content: system }, ...turns];
  let resolvedContact: string | null = conversation.contact_id;

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: MODEL, messages, tools: CHAT_TOOLS }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[chat] openai error:", res.status, detail.slice(0, 300));
        break;
      }
      const json = (await res.json()) as { choices?: { message?: ChatMessage }[] };
      const msg = json.choices?.[0]?.message;
      if (!msg) break;

      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          const name = call.function.name;
          let args: Record<string, unknown> = {};
          try {
            args = JSON.parse(call.function.arguments || "{}");
          } catch {
            args = {};
          }
          const result = isVoiceToolName(name)
            ? await TOOLS[name].run(ctx, args)
            : { status: "error" as const, data: {}, error: `unknown tool: ${name}` };

          // Link a contact the AI just captured back to the thread + ctx.
          const cid = (result.data as { contact_id?: string }).contact_id;
          if (cid && !resolvedContact) {
            resolvedContact = cid;
            ctx.contactId = cid;
          }

          // Audit parity with voice (logged by conversation_id, not call_id).
          try {
            await admin.from("tool_calls").insert({
              tenant_id: conversation.tenant_id,
              conversation_id: conversation.id,
              tool_name: name,
              args: args ?? {},
              status: result.status,
              result: result.data ?? {},
              error: result.error ?? null,
            });
          } catch (err) {
            console.error("[chat] tool_call log failed:", err);
          }

          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result.status === "ok" ? result.data : { error: result.error, ...result.data }),
          });
        }
        continue; // let the model read tool results
      }

      return { reply: (msg.content ?? "").trim() || fallback(), contactId: resolvedContact };
    }
  } catch (err) {
    console.error("[chat] engine failed:", err);
  }
  return { reply: fallback(), contactId: resolvedContact };
}

function fallback(): string {
  return "Thanks! I've noted that and our team will follow up with you shortly.";
}
