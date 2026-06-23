import { NextResponse } from "next/server";

import { decryptText } from "@/lib/crypto";
import { runChatTurn } from "@/lib/chat/handle";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Public website-chat widget endpoint (Phase 10). Reached by the embeddable
 * widget on a customer's own site, so it's CORS-open and authenticated only
 * by a per-business widget_key — the tenant is resolved from that key in OUR
 * DB (service role), never from the client. Gated on the omnichannel_chat
 * add-on inside runChatTurn. A prompt-injected model can't reach another
 * tenant: every tool runs with a server-built context.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 30;

const MAX_MESSAGE_LEN = 1000;

// Best-effort in-memory throttle (per serverless instance): one visitor can't
// hammer the LLM. Resets on cold start — fine as basic abuse mitigation.
const HITS = new Map<string, number[]>();
const WINDOW_MS = 60_000;
const MAX_PER_WINDOW = 15;

function rateLimited(visitorId: string): boolean {
  const now = Date.now();
  const arr = (HITS.get(visitorId) ?? []).filter((t) => now - t < WINDOW_MS);
  arr.push(now);
  HITS.set(visitorId, arr);
  return arr.length > MAX_PER_WINDOW;
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: CORS });

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

type Settings = {
  tenant_id: string;
  business_id: string;
  web_chat_enabled: boolean;
  web_greeting: string;
  widget_accent: string;
};

async function resolveByKey(key: string): Promise<Settings | null> {
  if (!key) return null;
  const admin = createAdminClient();
  const { data } = await admin
    .from("sms_settings")
    .select("tenant_id, business_id, web_chat_enabled, web_greeting, widget_accent")
    .eq("widget_key", key)
    .maybeSingle();
  return (data as Settings | null) ?? null;
}

/** GET: widget config (no conversationId) or poll for new messages. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get("key") ?? "";
  const settings = await resolveByKey(key);
  if (!settings) return json({ ok: false, error: "unknown widget" }, 404);

  const conversationId = url.searchParams.get("conversationId");
  const visitorId = url.searchParams.get("visitorId") ?? "";

  // Config request (widget bootstrap).
  if (!conversationId) {
    return json({
      ok: true,
      enabled: settings.web_chat_enabled,
      greeting: settings.web_greeting,
      accent: settings.widget_accent,
    });
  }

  // Poll request — return AI/staff messages since `after`, scoped to this
  // visitor's own thread (a leaked conversationId from another tenant or
  // visitor won't resolve).
  const admin = createAdminClient();
  const { data: convo } = await admin
    .from("conversations")
    .select("id, web_visitor_id")
    .eq("id", conversationId)
    .eq("tenant_id", settings.tenant_id)
    .maybeSingle();
  // Require the visitor to present their own id, and require it to match the
  // thread's. (The widget always sends it.) This stops reading a thread by a
  // leaked/guessed conversationId alone.
  if (!convo || !visitorId || (convo.web_visitor_id && convo.web_visitor_id !== visitorId)) {
    return json({ ok: false, error: "not found" }, 404);
  }

  const after = url.searchParams.get("after");
  let q = admin
    .from("conversation_messages")
    .select("id, role, body_encrypted, body_redacted, created_at")
    .eq("conversation_id", conversationId)
    .in("role", ["ai", "staff"])
    .order("created_at", { ascending: true })
    .limit(50);
  if (after) q = q.gt("created_at", after);
  const { data: rows } = await q;

  return json({
    ok: true,
    messages: (rows ?? []).map((r) => ({
      role: r.role,
      body: (r.body_encrypted ? decryptText(r.body_encrypted) : null) ?? r.body_redacted ?? "",
      at: r.created_at,
    })),
  });
}

/** POST: a customer message → AI reply. */
export async function POST(request: Request) {
  let body: { key?: string; visitorId?: string; message?: string } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return json({ ok: false, error: "invalid json" }, 400);
  }

  const key = (body.key ?? "").trim();
  const visitorId = (body.visitorId ?? "").trim();
  const message = (body.message ?? "").trim().slice(0, MAX_MESSAGE_LEN);
  if (!visitorId || !message) return json({ ok: false, error: "missing fields" }, 400);
  if (rateLimited(visitorId)) return json({ ok: false, error: "rate_limited" }, 429);

  const settings = await resolveByKey(key);
  if (!settings) return json({ ok: false, error: "unknown widget" }, 404);
  if (!settings.web_chat_enabled) return json({ ok: false, error: "chat disabled" }, 403);

  const admin = createAdminClient();
  const result = await runChatTurn(admin, {
    tenantId: settings.tenant_id,
    businessId: settings.business_id,
    channel: "web",
    webVisitorId: visitorId,
    text: message,
  });

  if (!result.ok) {
    const status = result.reason === "not_entitled" ? 403 : 500;
    return json({ ok: false, error: result.reason ?? "error" }, status);
  }

  return json({
    ok: true,
    conversationId: result.conversation?.id ?? null,
    reply: result.reply ?? null,
  });
}
