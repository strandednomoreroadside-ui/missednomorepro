import "server-only";

import { env } from "@/lib/env";

import { sendEmail, type EmailResult } from "./resend";

/**
 * Send an AI/staff reply in an email conversation.
 *
 * Identity (operator's "forward your inbox" choice): the reply is DKIM-signed
 * from our verified sending domain but shows the BUSINESS name, and the
 * Reply-To is the business's inbound token address so the customer's reply
 * routes back to Cloudflare → /api/email/inbound. Threading headers make the
 * customer's mail client file our reply under their original email.
 *
 * §5.1 is unchanged — the body is produced by the same tool brain as voice/
 * SMS/web; this module only delivers it.
 */

/** Bare address used as the envelope/From address (must be Resend-verified). */
function replyFromAddress(): string | null {
  if (env.EMAIL_REPLY_FROM) return extractAddress(env.EMAIL_REPLY_FROM);
  if (env.RESEND_FROM) return extractAddress(env.RESEND_FROM);
  return null;
}

/** Pull `a@b.com` out of either a bare address or `Name <a@b.com>`. */
function extractAddress(value: string): string {
  const m = /<([^>]+)>/.exec(value);
  return (m ? m[1] : value).trim();
}

/** RFC-5322 display-name quoting: strip characters that would break the header. */
function fromHeader(businessName: string, address: string): string {
  const safe = businessName.replace(/["\\\r\n]/g, "").trim() || "Support";
  return `${safe} <${address}>`;
}

function ensureReSubject(subject: string): string {
  const s = (subject || "").trim();
  if (!s) return "Re: your message";
  return /^re:/i.test(s) ? s : `Re: ${s}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Plain-text reply → simple, clean HTML (no heavy branding — it should read
 *  like a normal email from the business). */
function bodyHtml(text: string, signature: string | null): string {
  const paras = escapeHtml(text.trim())
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 12px">${p.replace(/\n/g, "<br>")}</p>`)
    .join("");
  const sig = signature
    ? `<p style="margin:16px 0 0;color:#475569">${escapeHtml(signature).replace(/\n/g, "<br>")}</p>`
    : "";
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;font-size:15px;line-height:1.55;color:#0A1B3D">${paras}${sig}</div>`;
}

export async function sendConversationEmail(opts: {
  to: string;
  businessName: string;
  /** The per-business inbound token → Reply-To {token}@{EMAIL_INBOUND_DOMAIN}. */
  token: string;
  subject: string;
  /** The reply text the AI/staff produced. */
  body: string;
  signature?: string | null;
  /** The customer's last Message-ID, for threading. */
  inReplyTo?: string | null;
  references?: string | null;
}): Promise<EmailResult> {
  const address = replyFromAddress();
  if (!address) return { ok: false, id: null, error: "no_reply_from" };
  if (!opts.token) return { ok: false, id: null, error: "no_token" };

  const replyTo = `${opts.token}@${env.EMAIL_INBOUND_DOMAIN}`;
  const headers: Record<string, string> = {};
  if (opts.inReplyTo) {
    headers["In-Reply-To"] = opts.inReplyTo;
    headers["References"] = [opts.references, opts.inReplyTo].filter(Boolean).join(" ");
  }

  const text = opts.signature ? `${opts.body.trim()}\n\n${opts.signature.trim()}` : opts.body.trim();

  return sendEmail({
    to: opts.to,
    from: fromHeader(opts.businessName, address),
    replyTo,
    subject: ensureReSubject(opts.subject),
    html: bodyHtml(opts.body, opts.signature ?? null),
    text,
    headers,
  });
}
