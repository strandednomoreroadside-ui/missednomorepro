import { NextResponse } from "next/server";

import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { env } from "@/lib/env";
import { ASSISTANT_TOOLS, runAssistantTool, type AssistantCtx } from "@/lib/assistant/tools";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "gpt-4.1-mini";
const MAX_TURNS = 5;

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
  tool_call_id?: string;
};

export async function POST(req: Request) {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;

  // Gate: the AI Business Assistant add-on (or a plan that includes it).
  const ent = await getEntitlements(tenantId);
  if (!ent.has("business_assistant")) {
    return NextResponse.json({ error: "not_entitled" }, { status: 403 });
  }
  if (!env.OPENAI_API_KEY) {
    return NextResponse.json({ error: "assistant not configured" }, { status: 503 });
  }

  const body = (await req.json().catch(() => null)) as { messages?: ChatMessage[] } | null;
  const history = (body?.messages ?? [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content }));
  if (history.length === 0) {
    return NextResponse.json({ error: "no message" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, timezone")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const ctx: AssistantCtx = {
    supabase,
    tenantId,
    businessId: (business?.id as string) ?? null,
    tz: (business?.timezone as string) || "America/New_York",
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: ctx.tz,
  });

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: `You are the business assistant for ${business?.name ?? "this business"}, a local service company. Today is ${today}.
Answer the owner's questions about their business using ONLY the tools provided — never invent numbers, names, or facts. If a tool returns nothing, say so plainly. Be concise and conversational (a sentence or two, or a short list). Money and rates come straight from the tools. You are read-only: if asked to change, send, or book something, explain that you can report but not take that action here.`,
    },
    ...history,
  ];

  try {
    for (let turn = 0; turn < MAX_TURNS; turn++) {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({ model: MODEL, messages, tools: ASSISTANT_TOOLS }),
      });
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        console.error("[assistant] openai error:", res.status, detail.slice(0, 300));
        return NextResponse.json({ error: "assistant_error" }, { status: 502 });
      }
      const json = (await res.json()) as {
        choices?: { message?: ChatMessage }[];
      };
      const msg = json.choices?.[0]?.message;
      if (!msg) return NextResponse.json({ error: "assistant_error" }, { status: 502 });

      if (msg.tool_calls?.length) {
        messages.push(msg);
        for (const call of msg.tool_calls) {
          let parsedArgs: Record<string, unknown> = {};
          try {
            parsedArgs = JSON.parse(call.function.arguments || "{}");
          } catch {
            parsedArgs = {};
          }
          const result = await runAssistantTool(call.function.name, parsedArgs, ctx);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: JSON.stringify(result),
          });
        }
        continue; // let the model read the tool results
      }

      return NextResponse.json({ reply: msg.content ?? "" });
    }
    return NextResponse.json({
      reply: "I dug through a few things but couldn't wrap that up — try asking it a simpler way.",
    });
  } catch (err) {
    console.error("[assistant] failed:", err);
    return NextResponse.json({ error: "assistant_error" }, { status: 500 });
  }
}
