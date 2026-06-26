import { createAdminClient } from "@/lib/supabase/admin";
import { verifyWeeklyUnsubscribeToken } from "@/lib/email/weekly-report";

/**
 * One-click unsubscribe from the weekly value email. The link carries a
 * business id + an HMAC token (signed in weekly-report.ts), so it works
 * without login and can't be forged. It only flips one boolean off — no
 * data is exposed — and is written via the service role since sms_settings
 * is the tenant's row.
 */

export const dynamic = "force-dynamic";

function page(message: string): Response {
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Missed No More Pro</title></head>
<body style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:#020817;color:#fff;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0">
  <div style="max-width:420px;text-align:center;padding:32px">
    <div style="font-size:18px;font-weight:700;margin-bottom:12px">Missed No More Pro</div>
    <p style="color:#A7B0C0;font-size:15px;line-height:1.5">${message}</p>
  </div>
</body></html>`;
  return new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const businessId = url.searchParams.get("b") ?? "";
  const token = url.searchParams.get("t") ?? "";

  if (!businessId || !verifyWeeklyUnsubscribeToken(businessId, token)) {
    return page("This unsubscribe link is invalid or has expired. You can manage email preferences in your dashboard Settings.");
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("sms_settings")
    .update({ weekly_report_enabled: false })
    .eq("business_id", businessId);
  if (error) {
    console.error("[unsubscribe] update failed:", error.message);
    return page("Something went wrong. Please try again, or turn off weekly reports in your dashboard Settings.");
  }

  return page("You've been unsubscribed from the weekly report email. You can turn it back on anytime in your dashboard Settings.");
}
