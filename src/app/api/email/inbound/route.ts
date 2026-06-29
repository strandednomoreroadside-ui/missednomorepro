import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { runChatTurn } from "@/lib/chat/handle";
import { messageExistsByExternalId } from "@/lib/chat/conversation";
import { sendConversationEmail } from "@/lib/email/conversation-email";
import {
  parseRawEmail,
  shouldSkipAutoReply,
  tokenFromAddress,
} from "@/lib/email/inbound";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Inbound-email webhook for the email channel (Omnichannel add-on).
 *
 * A Cloudflare Email Worker forwards the raw RFC-822 message here with:
 *   - `x-email-secret`: our shared secret (the only auth — reject otherwise)
 *   - `x-mnm-to`:       the ENVELOPE recipient = {token}@inbound.…  (the MIME
 *                       To: header is the business's own address, so we must
 *                       use the envelope recipient to resolve the tenant)
 *   - body:             the raw email
 *
 * Tenant is resolved from the token in OUR DB (service role), never from the
 * email body — same discipline as the voice tools + the chat widget. The AI
 * reply runs through the shared §10 brain and is delivered via Resend.
 *
 * We almost always answer 200 (so the Worker/provider doesn't retry); the
 * status only signals delivery, not whether we chose to engage.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const ok = (extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: true, ...extra });

function secretValid(provided: string | null): boolean {
  if (!env.EMAIL_INBOUND_SECRET || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(env.EMAIL_INBOUND_SECRET);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!env.EMAIL_INBOUND_SECRET) {
    console.error("[email] EMAIL_INBOUND_SECRET not configured — rejecting");
    return new NextResponse("Not configured", { status: 503 });
  }
  if (!secretValid(request.headers.get("x-email-secret"))) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Envelope recipient → routing token. The MIME To: header is the business's
  // original address, so the Worker passes the real recipient here.
  const envelopeTo = request.headers.get("x-mnm-to") ?? "";
  const token = tokenFromAddress(envelopeTo);
  if (!token) {
    console.warn("[email] inbound with no resolvable token (x-mnm-to)");
    return ok({ skipped: "no_token" });
  }

  const raw = await request.text();
  if (!raw) return ok({ skipped: "empty" });

  let email;
  try {
    email = await parseRawEmail(raw);
  } catch (err) {
    console.error("[email] parse failed:", err);
    return ok({ skipped: "parse_error" });
  }

  const admin = createAdminClient();

  // Resolve the tenant/business from the token (never from the email body).
  const { data: settings } = await admin
    .from("sms_settings")
    .select("tenant_id, business_id, email_inbound_enabled, email_signature")
    .eq("email_inbound_token", token)
    .maybeSingle();
  if (!settings) {
    console.warn(`[email] inbound to unknown token ${token}`);
    return ok({ skipped: "unknown_token" });
  }
  const tenantId = settings.tenant_id as string;
  const businessId = (settings.business_id as string | null) ?? null;

  if (!settings.email_inbound_enabled) return ok({ skipped: "channel_off" });

  // Don't let the AI talk to robots / lists / its own loop.
  const ourDomains = [env.EMAIL_INBOUND_DOMAIN, replyDomain()].filter(Boolean) as string[];
  const guard = shouldSkipAutoReply(email, ourDomains);
  if (guard.skip) return ok({ skipped: guard.reason });

  // Idempotency — the Worker/provider can retry the same message.
  if (email.messageId && (await messageExistsByExternalId(admin, tenantId, email.messageId))) {
    return ok({ skipped: "duplicate" });
  }

  if (!email.text.trim()) return ok({ skipped: "empty_body" });

  // A human emailing the business is a real lead → make sure it lands on a
  // CRM contact (mirrors the MMS auto-create). Create only if unknown.
  await ensureContact(admin, tenantId, email.from, email.fromName);

  // Same §10 brain as voice/SMS/web. Tenant is server-resolved above.
  const result = await runChatTurn(admin, {
    tenantId,
    businessId,
    channel: "email",
    customerEmail: email.from,
    customerName: email.fromName,
    subject: email.subject,
    externalId: email.messageId,
    text: email.text,
  });
  if (!result.ok) return ok({ skipped: result.reason ?? "no_reply" });

  // Auto-reply (operator's choice). Staff can take a thread over from the Inbox,
  // which flips ai_enabled off → runChatTurn returns reply:null and we stay quiet.
  if (result.reply) {
    const businessName = await resolveBusinessName(admin, tenantId, businessId);
    const sent = await sendConversationEmail({
      to: email.from,
      businessName,
      token,
      subject: email.subject,
      body: result.reply,
      signature: (settings.email_signature as string | null) ?? null,
      inReplyTo: email.messageId,
      references: email.references,
    });
    if (!sent.ok) console.error("[email] reply send failed:", sent.error);
    return ok({ replied: sent.ok });
  }

  return ok({ replied: false });
}

/** The sending (reply) domain, for loop protection. */
function replyDomain(): string | null {
  const from = env.EMAIL_REPLY_FROM || env.RESEND_FROM || "";
  const m = /@([^>\s]+)/.exec(from);
  return m ? m[1].toLowerCase() : null;
}

async function ensureContact(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  emailAddr: string,
  name: string | null
): Promise<void> {
  if (!emailAddr) return;
  const pattern = emailAddr.replace(/([\\%_])/g, "\\$1"); // escape ilike wildcards
  const { data: existing } = await admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", tenantId)
    .ilike("email", pattern)
    .maybeSingle();
  if (existing) return;
  await admin
    .from("contacts")
    .insert({ tenant_id: tenantId, name: name || emailAddr, email: emailAddr });
}

async function resolveBusinessName(
  admin: ReturnType<typeof createAdminClient>,
  tenantId: string,
  businessId: string | null
): Promise<string> {
  let q = admin.from("businesses").select("name").eq("tenant_id", tenantId);
  q = businessId ? q.eq("id", businessId) : q.order("created_at", { ascending: true });
  const { data } = await q.limit(1).maybeSingle();
  return (data?.name as string | undefined) || "Support";
}
