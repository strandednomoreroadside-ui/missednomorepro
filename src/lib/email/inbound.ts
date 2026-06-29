import "server-only";

import PostalMime from "postal-mime";

/**
 * Inbound-email parsing + safety guards for the email channel.
 *
 * A Cloudflare Email Worker forwards the raw RFC-822 message to
 * /api/email/inbound; we parse it here (postal-mime, runs in Node) and
 * decide whether it's a real customer message worth an AI reply.
 *
 * Email's big difference from SMS: forwarding sends us EVERYTHING — vendor
 * mail, newsletters, out-of-office auto-replies, delivery reports, our own
 * replies bouncing back. shouldSkipAutoReply() is the gate that stops the
 * AI from chatting with a robot (and from getting into a reply loop).
 */

export type ParsedEmail = {
  from: string;
  fromName: string | null;
  subject: string;
  /** The customer's latest message, with quoted history stripped. */
  text: string;
  messageId: string | null;
  inReplyTo: string | null;
  references: string | null;
  headers: Map<string, string>;
};

function headerMap(
  headers: { key: string; value: string }[] | undefined
): Map<string, string> {
  const m = new Map<string, string>();
  for (const h of headers ?? []) {
    // postal-mime lowercases keys; keep the first occurrence.
    if (!m.has(h.key.toLowerCase())) m.set(h.key.toLowerCase(), h.value ?? "");
  }
  return m;
}

/** Parse a raw RFC-822 message (string or bytes) into the fields we need. */
export async function parseRawEmail(
  raw: string | ArrayBuffer | Uint8Array
): Promise<ParsedEmail> {
  const email = await new PostalMime().parse(raw);
  const headers = headerMap(email.headers as { key: string; value: string }[]);
  const text =
    (email.text && email.text.trim()) ||
    htmlToText(email.html ?? "") ||
    "";
  return {
    from: (email.from?.address ?? "").trim().toLowerCase(),
    fromName: email.from?.name?.trim() || null,
    subject: (email.subject ?? "").trim(),
    text: extractLatestReply(text),
    messageId: email.messageId ?? null,
    inReplyTo: (email.inReplyTo as string | undefined) ?? null,
    references: (email.references as string | undefined) ?? null,
    headers,
  };
}

/** Crude HTML→text for the rare message with no text/plain part. */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*(br|\/p|\/div|\/li)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const NOREPLY_LOCAL = /(^|[._-])(no-?reply|do-?not-?reply|mailer-daemon|postmaster|bounce|notifications?|automailer|auto-?reply)([._-]|$)/i;
const AUTO_SUBJECT = /^(auto(matic)?[ -]?reply|out of office|away from|undeliverable|delivery status|mail delivery|returned mail|read receipt)/i;

/**
 * True when this message must NOT get an AI reply: machine-generated mail
 * (RFC 3834 auto-replies, bounces), bulk/list traffic (newsletters), or our
 * own outbound looping back. Errs toward skipping — a missed newsletter is
 * fine; a bot war is not.
 */
export function shouldSkipAutoReply(
  email: ParsedEmail,
  ourDomains: string[]
): { skip: boolean; reason?: string } {
  const h = email.headers;

  // RFC 3834 + common auto-responder markers.
  const autoSubmitted = (h.get("auto-submitted") ?? "").toLowerCase();
  if (autoSubmitted && autoSubmitted !== "no") return { skip: true, reason: "auto-submitted" };
  if (h.has("x-autoreply") || h.has("x-autorespond") || h.has("x-autoresponder"))
    return { skip: true, reason: "x-autoreply" };

  // Bulk / mailing-list traffic.
  const precedence = (h.get("precedence") ?? "").toLowerCase();
  if (["bulk", "list", "junk", "auto_reply"].includes(precedence))
    return { skip: true, reason: `precedence:${precedence}` };
  if (h.has("list-unsubscribe") || h.has("list-id") || h.has("list-post"))
    return { skip: true, reason: "mailing-list" };

  // No real sender / obvious robot address.
  if (!email.from || !email.from.includes("@")) return { skip: true, reason: "no-sender" };
  const local = email.from.split("@")[0] ?? "";
  if (NOREPLY_LOCAL.test(local)) return { skip: true, reason: "noreply-sender" };
  if (email.from.startsWith("mailer-daemon") || email.from.startsWith("postmaster"))
    return { skip: true, reason: "daemon" };

  // Loop protection — our own outbound coming back.
  const fromDomain = email.from.split("@")[1] ?? "";
  if (ourDomains.some((d) => d && fromDomain.endsWith(d)))
    return { skip: true, reason: "loop-own-domain" };

  // Auto-reply subjects.
  if (AUTO_SUBJECT.test(email.subject)) return { skip: true, reason: "auto-subject" };

  return { skip: false };
}

const QUOTE_MARKERS: RegExp[] = [
  /^On .+ wrote:\s*$/m, // Gmail / Apple Mail
  /^-{2,}\s*Original Message\s*-{2,}/im, // Outlook
  /^_{5,}\s*$/m, // Outlook divider
  /^From:\s.+$/m, // Outlook header block
  /^Sent from my /m, // signature noise sometimes precedes a quote
  /^>{1,}/m, // plain quoted lines
  /^El .+ escribió:\s*$/m, // localized "wrote:"
];

/**
 * Strip quoted reply history so the model reads only the customer's NEW
 * message, not the whole thread it's replying to. Best-effort: take the text
 * before the earliest quote marker; fall back to the full body if that would
 * leave nothing.
 */
export function extractLatestReply(text: string): string {
  if (!text) return "";
  let cut = text.length;
  for (const re of QUOTE_MARKERS) {
    const m = re.exec(text);
    if (m && m.index < cut) cut = m.index;
  }
  const head = text.slice(0, cut).trim();
  return head.length > 0 ? head : text.trim();
}

/** Pull the routing token from a forward address like `abc123@inbound.…`
 *  (tolerates plus-addressing `abc123+anything@…`). */
export function tokenFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const local = address.split("@")[0]?.trim().toLowerCase();
  if (!local) return null;
  const token = local.split("+")[0];
  return token || null;
}
