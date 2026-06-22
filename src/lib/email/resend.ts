import "server-only";

import { env } from "@/lib/env";

/**
 * Thin Resend client (raw fetch — mirrors src/lib/maps/client.ts and the
 * Google clients, no SDK). Used for transactional email only: usage alerts
 * (alongside SMS) and billing receipts. Auth emails still come from
 * Supabase. No-ops gracefully when Resend isn't configured so nothing
 * breaks before the operator sets up the account at M10.
 */

export type EmailResult = { ok: boolean; id: string | null; error: string | null };

const DEFAULT_FROM = "Missed No More Pro <onboarding@resend.dev>";

/** True once an API key + a from address are available. */
export function isEmailConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
  /** Optional plain-text fallback; derived from html if omitted. */
  text?: string;
}): Promise<EmailResult> {
  if (!env.RESEND_API_KEY) {
    // Not an error — email just isn't wired yet.
    return { ok: false, id: null, error: "resend_not_configured" };
  }
  if (!opts.to) return { ok: false, id: null, error: "no_recipient" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.RESEND_FROM || DEFAULT_FROM,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text ?? opts.html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      id?: string;
      message?: string;
    };
    if (!res.ok) {
      const error = json?.message ?? `http_${res.status}`;
      console.error(`[resend] send failed (${res.status}): ${error}`);
      return { ok: false, id: null, error: String(error) };
    }
    return { ok: true, id: json?.id ?? null, error: null };
  } catch (err) {
    console.error("[resend] send error:", err);
    return { ok: false, id: null, error: String(err) };
  }
}

/** Minimal branded wrapper so alert/receipt emails look consistent. */
export function emailLayout(opts: { heading: string; bodyHtml: string }): string {
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:560px;margin:0 auto;color:#0A1B3D">
  <div style="background:#020817;color:#fff;padding:20px 24px;border-radius:12px 12px 0 0">
    <span style="font-size:18px;font-weight:700">Missed No More Pro</span>
  </div>
  <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:24px">
    <h1 style="font-size:18px;margin:0 0 12px">${opts.heading}</h1>
    ${opts.bodyHtml}
    <p style="font-size:12px;color:#6b7280;margin-top:24px">
      You're receiving this because you run a business on Missed No More Pro.
    </p>
  </div>
</div>`;
}
