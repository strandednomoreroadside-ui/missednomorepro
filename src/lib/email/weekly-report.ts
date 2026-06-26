import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { logAudit } from "@/lib/audit";
import { env } from "@/lib/env";
import { computeMetrics, type CallIntelMetrics } from "@/lib/insights/call-intelligence";

import { ownerEmail } from "./owner";
import { emailLayout, isEmailConfigured, sendEmail } from "./resend";

/**
 * Weekly value email (Later backlog — retention). Every Monday the daily
 * cron calls sendWeeklyReports: each active/trialing tenant gets a plain
 * recap of what their AI did this week, and Call Intelligence add-on
 * holders also get the AI-written digest (reusing the report the same cron
 * already generated — no extra LLM cost). Skips quiet weeks (zero activity)
 * so we never nag with an all-zeros email.
 *
 * Margin: one email per active tenant per week + (add-on only) the LLM call
 * that already happens. Idempotent via an audit-log marker so a re-run or
 * retry on the same Monday can't double-send.
 */

/** Subscriptions that mean a live customer worth a weekly recap. */
const ACTIVE_STATUSES = ["active", "trialing", "past_due"];
const AUDIT_ACTION = "weekly_report.sent";
/** Don't re-send within this window (guards multiple Monday cron runs). */
const DEDUPE_DAYS = 6;

// ── One-click unsubscribe (tokenized so it works without login) ──

function sign(businessId: string): string | null {
  if (!env.INTERNAL_API_SECRET) return null;
  return createHmac("sha256", env.INTERNAL_API_SECRET)
    .update(`weekly:${businessId}`)
    .digest("base64url");
}

/** Public unsubscribe URL for a business, or null if signing isn't available. */
export function weeklyUnsubscribeUrl(businessId: string): string | null {
  const token = sign(businessId);
  if (!token) return null;
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return `${base}/api/email/unsubscribe?b=${encodeURIComponent(businessId)}&t=${encodeURIComponent(token)}`;
}

export function verifyWeeklyUnsubscribeToken(businessId: string, token: string): boolean {
  const expected = sign(businessId);
  if (!expected || !token) return false;
  const a = Buffer.from(expected);
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

// ── HTML ──

function kpiCell(label: string, value: string): string {
  return `<td style="padding:6px" width="50%">
    <div style="border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px">
      <div style="font-size:24px;font-weight:700;color:#020817;font-variant-numeric:tabular-nums">${value}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:2px">${label}</div>
    </div>
  </td>`;
}

function kpiGrid(cells: { label: string; value: string }[]): string {
  let html = '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0">';
  for (let i = 0; i < cells.length; i += 2) {
    html += "<tr>";
    html += kpiCell(cells[i].label, cells[i].value);
    html += cells[i + 1] ? kpiCell(cells[i + 1].label, cells[i + 1].value) : '<td width="50%"></td>';
    html += "</tr>";
  }
  return html + "</table>";
}

function digestSection(summary: string, recommendations: string[]): string {
  const recs = recommendations.length
    ? `<ul style="margin:8px 0 0;padding-left:18px;color:#0A1B3D;font-size:14px">${recommendations
        .map((r) => `<li style="margin:4px 0">${escapeHtml(r)}</li>`)
        .join("")}</ul>`
    : "";
  return `<div style="border-top:1px solid #e5e7eb;margin-top:20px;padding-top:16px">
    <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#006BFF">AI Call Intelligence</div>
    <p style="font-size:14px;color:#0A1B3D;margin:8px 0 0">${escapeHtml(summary)}</p>
    ${recs}
  </div>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function reportBody(opts: {
  businessName: string;
  metrics: CallIntelMetrics;
  textbacksRecovered: number;
  digest: { summary: string; recommendations: string[] } | null;
  unsubscribeUrl: string | null;
}): string {
  const m = opts.metrics;
  const cells = [
    { label: "Calls answered", value: String(m.calls) },
    { label: "AI answer rate", value: `${m.answer_rate}%` },
    { label: "Appointments booked", value: String(m.bookings) },
    { label: "New leads", value: String(m.new_leads) },
    { label: "Missed calls recovered", value: String(opts.textbacksRecovered) },
    { label: "Collected", value: `$${m.revenue_collected.toLocaleString()}` },
  ];

  const manage = `<a href="${env.NEXT_PUBLIC_APP_URL}/dashboard" style="color:#006BFF">Open your dashboard →</a>`;
  const unsub = opts.unsubscribeUrl
    ? `<a href="${opts.unsubscribeUrl}" style="color:#9ca3af">Unsubscribe from weekly reports</a>`
    : `<a href="${env.NEXT_PUBLIC_APP_URL}/dashboard/settings" style="color:#9ca3af">Manage email preferences</a>`;

  return (
    `<p style="font-size:14px;color:#0A1B3D;margin:0 0 4px">Here's what your AI front office did for <strong>${escapeHtml(
      opts.businessName
    )}</strong> over the last 7 days.</p>` +
    kpiGrid(cells) +
    (opts.digest ? digestSection(opts.digest.summary, opts.digest.recommendations) : "") +
    `<p style="font-size:14px;margin:20px 0 0">${manage}</p>` +
    `<p style="font-size:12px;color:#9ca3af;margin:16px 0 0">${unsub}</p>`
  );
}

// ── Cron entry ──

type DigestPayload = { summary?: string; recommendations?: string[] };

/**
 * Send the weekly value email to every active/trialing tenant that hasn't
 * opted out and had activity this week. Returns the number of emails sent.
 */
export async function sendWeeklyReports(admin: SupabaseClient): Promise<number> {
  if (!isEmailConfigured()) return 0;

  const { data: subs } = await admin
    .from("subscriptions")
    .select("tenant_id, status")
    .in("status", ACTIVE_STATUSES);
  const tenantIds = [...new Set(((subs ?? []) as { tenant_id: string }[]).map((s) => s.tenant_id))];
  if (tenantIds.length === 0) return 0;

  // Which of these have the Call Intelligence add-on (for the digest section)?
  const { data: addonRows } = await admin
    .from("tenant_addons")
    .select("tenant_id")
    .eq("addon_key", "call_intelligence")
    .eq("status", "active")
    .in("tenant_id", tenantIds);
  const withDigest = new Set(((addonRows ?? []) as { tenant_id: string }[]).map((r) => r.tenant_id));

  const sinceIso = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const dedupeIso = new Date(Date.now() - DEDUPE_DAYS * 86_400_000).toISOString();
  let sent = 0;

  for (const tenantId of tenantIds) {
    try {
      // Already sent this week? (guards multiple Monday cron runs / retries)
      const { data: prior } = await admin
        .from("audit_logs")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("action", AUDIT_ACTION)
        .gte("created_at", dedupeIso)
        .limit(1)
        .maybeSingle();
      if (prior) continue;

      const { data: business } = await admin
        .from("businesses")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      const biz = business as { id: string; name: string } | null;
      if (!biz) continue;

      // Opt-out (default on when the column/row is missing).
      const { data: settings } = await admin
        .from("sms_settings")
        .select("weekly_report_enabled")
        .eq("business_id", biz.id)
        .maybeSingle();
      if ((settings as { weekly_report_enabled?: boolean } | null)?.weekly_report_enabled === false) {
        continue;
      }

      const metrics = await computeMetrics(admin, tenantId, sinceIso);

      const { count: textbacksRecovered } = await admin
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("kind", "text_back")
        .gte("created_at", sinceIso);

      // Quiet week — skip rather than send a demotivating all-zeros email.
      const recovered = textbacksRecovered ?? 0;
      if (
        metrics.calls === 0 &&
        metrics.new_leads === 0 &&
        metrics.bookings === 0 &&
        recovered === 0 &&
        metrics.revenue_collected === 0
      ) {
        continue;
      }

      const to = await ownerEmail(admin, tenantId);
      if (!to) continue;

      // AI digest for add-on holders: reuse the report this cron just made.
      let digest: { summary: string; recommendations: string[] } | null = null;
      if (withDigest.has(tenantId)) {
        const { data: report } = await admin
          .from("insight_reports")
          .select("payload")
          .eq("tenant_id", tenantId)
          .eq("kind", "call_intelligence")
          .order("period_end", { ascending: false })
          .limit(1)
          .maybeSingle();
        const payload = (report as { payload?: DigestPayload } | null)?.payload;
        if (payload?.summary) {
          digest = {
            summary: payload.summary,
            recommendations: Array.isArray(payload.recommendations)
              ? payload.recommendations
              : [],
          };
        }
      }

      const html = emailLayout({
        heading: `Your week with the AI — ${biz.name}`,
        bodyHtml: reportBody({
          businessName: biz.name,
          metrics,
          textbacksRecovered: recovered,
          digest,
          unsubscribeUrl: weeklyUnsubscribeUrl(biz.id),
        }),
      });

      const result = await sendEmail({
        to,
        subject: `Your week with the AI: ${metrics.calls} calls, ${metrics.bookings} booked`,
        html,
      });
      if (!result.ok) continue;

      await logAudit({
        tenantId,
        action: AUDIT_ACTION,
        entityType: "email",
        entityId: result.id ?? undefined,
        metadata: { calls: metrics.calls, bookings: metrics.bookings, has_digest: !!digest },
      });
      sent++;
    } catch (err) {
      console.error("[weekly-report] failed for", tenantId, err);
    }
  }

  return sent;
}
