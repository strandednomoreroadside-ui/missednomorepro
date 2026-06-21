import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEntitlementsWith } from "@/lib/billing/entitlements";
import { redactPii } from "@/lib/redact";
import { sendCustomerSms, sendStaffSms } from "@/lib/sms/outbound";

/**
 * AI Reputation Manager (+$29 add-on, `reputation_manager`). A reputation
 * gate over SMS: after a job is done we text the customer "how did we do?
 * Reply 1-5"; happy customers (4-5) get the public review link (Google
 * Business Profile, else Facebook), unhappy ones (1-3) are routed to PRIVATE
 * feedback that goes straight to the owner — never auto-posted publicly.
 *
 * Margin/compliance: at most a request + one reply text per job; the request
 * runs the full consent gate (STOP wins); replies are transactional (the
 * customer just texted us). Tracked in `reviews`.
 */

const REVIEW_WINDOW_DAYS = 14;

type ReputationSettings = {
  reputation_enabled: boolean;
  review_request_template: string;
  review_facebook_url: string | null;
  business_id: string | null;
};

function render(template: string, vars: { name: string; business: string }): string {
  return template
    .replaceAll("{name}", vars.name || "there")
    .replaceAll("{business}", vars.business || "us");
}

/** Pull a digit 1-5 out of a reply ("5", "5 stars", "5/5") — null otherwise. */
function parseRating(body: string): number | null {
  const trimmed = body.trim();
  if (/^[1-5]$/.test(trimmed)) return Number(trimmed);
  const m = trimmed.match(/(?<!\d)([1-5])(?!\d)/);
  return m ? Number(m[1]) : null;
}

async function loadSettings(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string | null
): Promise<ReputationSettings | null> {
  let q = admin
    .from("sms_settings")
    .select("reputation_enabled, review_request_template, review_facebook_url, business_id")
    .eq("tenant_id", tenantId);
  q = businessId ? q.eq("business_id", businessId) : q.order("created_at", { ascending: true });
  const { data } = await q.limit(1).maybeSingle();
  return (data as ReputationSettings | null) ?? null;
}

/** The public review destination: Google Business Profile preferred, else Facebook. */
async function reviewLink(
  admin: SupabaseClient,
  businessId: string | null,
  facebookUrl: string | null
): Promise<string | null> {
  if (businessId) {
    const { data } = await admin
      .from("businesses")
      .select("gbp_url")
      .eq("id", businessId)
      .maybeSingle();
    const gbp = (data?.gbp_url as string | null) ?? null;
    if (gbp) return gbp;
  }
  return facebookUrl ?? null;
}

async function businessName(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string | null
): Promise<string> {
  if (businessId) {
    const { data } = await admin.from("businesses").select("name").eq("id", businessId).maybeSingle();
    if (data?.name) return data.name as string;
  }
  const { data } = await admin
    .from("businesses")
    .select("name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.name as string) ?? "our team";
}

/** Text the owner/lead-staff about a low rating or private feedback. */
async function notifyOwner(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string | null,
  body: string
): Promise<void> {
  let q = admin
    .from("staff_contacts")
    .select("phone")
    .eq("tenant_id", tenantId)
    .eq("notify_on_lead", true);
  if (businessId) q = q.eq("business_id", businessId);
  const { data } = await q;
  for (const s of (data ?? []) as { phone: string }[]) {
    if (s.phone) await sendStaffSms(admin, { tenantId, businessId, toPhone: s.phone, body });
  }
}

/**
 * Fire a review request after a completed job. Gated on the add-on AND the
 * per-business reputation toggle. Creates a `reviews` row (status 'requested')
 * and sends the request through the consent gate. No-op when not entitled /
 * disabled / the contact has no phone. Idempotent: skips if a request for
 * this job already exists.
 */
export async function requestReview(
  admin: SupabaseClient,
  opts: { tenantId: string; businessId: string | null; contactId: string; jobId: string | null }
): Promise<void> {
  try {
    const ent = await getEntitlementsWith(admin, opts.tenantId);
    if (!ent.has("reputation_manager")) return;

    const settings = await loadSettings(admin, opts.tenantId, opts.businessId);
    if (!settings?.reputation_enabled) return;

    // Don't double-request for the same job.
    if (opts.jobId) {
      const { data: existing } = await admin
        .from("reviews")
        .select("id")
        .eq("tenant_id", opts.tenantId)
        .eq("job_id", opts.jobId)
        .maybeSingle();
      if (existing) return;
    }

    const { data: contact } = await admin
      .from("contacts")
      .select("name, phone")
      .eq("id", opts.contactId)
      .eq("tenant_id", opts.tenantId)
      .maybeSingle();
    if (!contact?.phone) return;

    const biz = await businessName(admin, opts.tenantId, opts.businessId);
    const body = render(settings.review_request_template, {
      name: (contact.name as string) ?? "",
      business: biz,
    });

    const res = await sendCustomerSms(admin, {
      tenantId: opts.tenantId,
      businessId: opts.businessId,
      contactId: opts.contactId,
      toPhone: contact.phone as string,
      body,
      kind: "review",
      requireConsent: true, // review asks are non-transactional; STOP always wins
    });
    if (!res.sent) return; // blocked/failed — don't open a review we can't gate

    await admin.from("reviews").insert({
      tenant_id: opts.tenantId,
      business_id: opts.businessId,
      contact_id: opts.contactId,
      job_id: opts.jobId,
      status: "requested",
    });
  } catch (err) {
    console.error("[reputation] requestReview failed:", err);
  }
}

export interface ReviewReplyResult {
  handled: boolean;
  reply?: string;
}

/**
 * Run the reputation gate against an inbound SMS. Called from the Twilio
 * inbound webhook BEFORE the two-way AI branch so a rating reply isn't
 * swallowed by chat. Returns { handled:false } when there's no open review
 * for this contact (the message falls through to normal handling).
 */
export async function handleReviewReply(
  admin: SupabaseClient,
  opts: { tenantId: string; businessId: string | null; contactId: string | null; body: string }
): Promise<ReviewReplyResult> {
  if (!opts.contactId) return { handled: false };

  const since = new Date(Date.now() - REVIEW_WINDOW_DAYS * 86_400_000).toISOString();
  const { data: review } = await admin
    .from("reviews")
    .select("id, status, business_id, feedback_redacted")
    .eq("tenant_id", opts.tenantId)
    .eq("contact_id", opts.contactId)
    .in("status", ["requested", "feedback"])
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!review) return { handled: false };

  const bizId = (review.business_id as string | null) ?? opts.businessId;

  // Low rating already given → capture the next message as private feedback.
  if (review.status === "feedback" && !review.feedback_redacted) {
    await admin
      .from("reviews")
      .update({ feedback_redacted: redactPii(opts.body).redacted })
      .eq("id", review.id);
    const biz = await businessName(admin, opts.tenantId, bizId);
    await notifyOwner(
      admin,
      opts.tenantId,
      bizId,
      `${biz} feedback from an unhappy customer: "${redactPii(opts.body).redacted}". Reach out to make it right.`
    );
    return {
      handled: true,
      reply: "Thank you — we've sent this straight to the owner and someone will follow up to make it right.",
    };
  }

  // Awaiting a rating.
  if (review.status === "requested") {
    const rating = parseRating(opts.body);
    if (rating === null) return { handled: false }; // not a rating — let normal handling run

    if (rating >= 4) {
      const settings = await loadSettings(admin, opts.tenantId, bizId);
      const link = await reviewLink(admin, bizId, settings?.review_facebook_url ?? null);
      await admin
        .from("reviews")
        .update({
          status: "rated",
          rating,
          rated_at: new Date().toISOString(),
          public_url_sent: Boolean(link),
        })
        .eq("id", review.id);
      const reply = link
        ? `So glad we hit the mark! Would you mind sharing that in a quick review? ${link} Thank you!`
        : "So glad we hit the mark — thank you for choosing us!";
      return { handled: true, reply };
    }

    // 1-3 → route to private feedback, never a public link.
    await admin
      .from("reviews")
      .update({ status: "feedback", rating, rated_at: new Date().toISOString() })
      .eq("id", review.id);
    const biz = await businessName(admin, opts.tenantId, bizId);
    await notifyOwner(
      admin,
      opts.tenantId,
      bizId,
      `${biz}: a customer rated their job ${rating}/5. Asking them for details now — follow up to make it right.`
    );
    return {
      handled: true,
      reply: "We're sorry we didn't hit the mark. Could you reply with what we could've done better? It goes straight to the owner.",
    };
  }

  return { handled: false };
}
