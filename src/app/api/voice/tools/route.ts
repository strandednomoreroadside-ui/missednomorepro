import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { isVoiceToolName } from "@/lib/voice/tools/registry";
import { TOOLS, type ToolContext } from "@/lib/voice/tools/handlers";

/**
 * AI tool router (master plan §10, BUILD_GUIDE M7 step 4). The voice
 * provider's LLM calls this during a live call to run a §10 tool.
 *
 * Security model:
 *   * Authenticated by INTERNAL_API_SECRET (header or ?key=) — only the
 *     provider, configured with our secret URL, can reach it.
 *   * The TENANT is resolved from OUR calls row by provider call id —
 *     never from the AI's arguments. A prompt-injected model cannot
 *     touch another tenant.
 *   * Every invocation is written to tool_calls for the summary UI/audit.
 */

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });

type Body = {
  name?: string;
  function_name?: string;
  call?: { call_id?: string };
  call_id?: string;
  callId?: string;
  args?: unknown;
  arguments?: unknown;
  parameters?: unknown;
};

export async function POST(request: Request) {
  const url = new URL(request.url);

  // 1) Authenticate the caller (provider with our shared secret).
  const provided =
    request.headers.get("x-internal-secret") ?? url.searchParams.get("key") ?? "";
  if (!env.INTERNAL_API_SECRET || !safeEqual(provided, env.INTERNAL_API_SECRET)) {
    return json({ error: "unauthorized" }, 401);
  }

  // 2) Parse the (provider-shaped) tool request, tolerant of field names.
  let body: Body = {};
  try {
    body = (await request.json()) as Body;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const toolName = url.searchParams.get("tool") ?? body.name ?? body.function_name ?? "";
  const providerCallId = body.call?.call_id ?? body.call_id ?? body.callId ?? null;
  const rawArgs = body.args ?? body.arguments ?? body.parameters ?? {};

  if (!isVoiceToolName(toolName)) return json({ error: `unknown tool: ${toolName}` }, 400);
  if (!providerCallId) return json({ error: "missing call id" }, 400);

  // 3) Resolve the call -> tenant. THE trust anchor (our DB, not the LLM).
  const admin = createAdminClient();
  const { data: call } = await admin
    .from("calls")
    .select("id, tenant_id, business_id, contact_id, from_number")
    .eq("provider_call_id", providerCallId)
    .maybeSingle();
  if (!call) return json({ error: "call not found" }, 404);

  // Business name for spoken staff alerts.
  let businessName = "our team";
  if (call.business_id) {
    const { data: b } = await admin
      .from("businesses")
      .select("name")
      .eq("id", call.business_id)
      .maybeSingle();
    if (b?.name) businessName = b.name;
  } else {
    const { data: b } = await admin
      .from("businesses")
      .select("name")
      .eq("tenant_id", call.tenant_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    if (b?.name) businessName = b.name;
  }

  const ctx: ToolContext = {
    admin,
    tenantId: call.tenant_id,
    businessId: call.business_id ?? null,
    callId: call.id,
    contactId: call.contact_id ?? null,
    fromNumber: call.from_number ?? "",
    businessName,
  };

  // 4) Run the tool.
  const result = await TOOLS[toolName].run(ctx, rawArgs);

  // 5) Record the invocation (never let logging break the tool response).
  try {
    await admin.from("tool_calls").insert({
      tenant_id: call.tenant_id,
      call_id: call.id,
      tool_name: toolName,
      args: rawArgs ?? {},
      status: result.status,
      result: result.data ?? {},
      error: result.error ?? null,
    });
  } catch (err) {
    console.error("[voice/tools] failed to log tool_call:", err);
  }

  // 6) Return a body the LLM can read. 200 even on blocked/error so the
  // model gets the message and can recover mid-conversation.
  if (result.status === "ok") return json(result.data);
  return json({ error: result.error ?? "tool failed", ...result.data });
}
