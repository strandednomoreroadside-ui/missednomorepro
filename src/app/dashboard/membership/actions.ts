"use server";

import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { createPaymentCheckout } from "@/lib/billing/payments";
import { advancePeriodEnd, isMembershipInterval, periodEndFromToday } from "@/lib/membership/queries";
import { getOrigin } from "@/lib/request";
import { sendCustomerSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const text = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

/** Membership is an Elite-tier feature (the `membership` plan flag). */
async function requireMembership(tenantId: string, back: string) {
  const ent = await getEntitlements(tenantId);
  if (!ent.has("membership")) {
    failTo(back, "Membership plans are on the Elite plan.");
  }
}

/** First business for the tenant (same resolution the payments flow uses). */
async function firstBusinessId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tenantId: string,
  back: string
): Promise<string> {
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) failTo(back, "Set up your business first.");
  return business.id as string;
}

/** Split a textarea into a clean list of benefit lines (<= 12, <= 120 chars). */
function parseBenefits(raw: string): string[] {
  return raw
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && l.length <= 120)
    .slice(0, 12);
}

// ── Plan catalog (on /dashboard/membership) ──────────────────────

export async function createPlan(formData: FormData) {
  const { active, user } = await requireActiveOrg();
  const back = "/dashboard/membership";
  await requireMembership(active.organization_id, back);
  const supabase = await createClient();

  const name = text(formData, "name");
  if (name.length < 1 || name.length > 80) failTo(back, "Enter a plan name (1-80 characters).");

  const dollars = Number(text(formData, "price"));
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 100000) {
    failTo(back, "Enter a valid monthly price.");
  }
  const interval = text(formData, "interval");
  if (!isMembershipInterval(interval)) failTo(back, "Pick a billing interval.");

  const businessId = await firstBusinessId(supabase, active.organization_id, back);

  const { error } = await supabase.from("membership_plans").insert({
    tenant_id: active.organization_id,
    business_id: businessId,
    name,
    description: text(formData, "description") || null,
    price_cents: Math.round(dollars * 100),
    interval,
    benefits: parseBenefits(text(formData, "benefits")),
    created_by: user.id,
  });
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}

export async function togglePlanActive(formData: FormData) {
  const { active } = await requireActiveOrg();
  const back = "/dashboard/membership";
  await requireMembership(active.organization_id, back);
  const supabase = await createClient();

  const id = text(formData, "id");
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("active")
    .eq("id", id)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!plan) failTo(back, "Plan not found.");

  const { error } = await supabase
    .from("membership_plans")
    .update({ active: !plan.active })
    .eq("id", id)
    .eq("tenant_id", active.organization_id);
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}

// ── Enrollment (from the contact page) ───────────────────────────

export async function enrollMembership(formData: FormData) {
  const { active, user } = await requireActiveOrg();
  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;
  await requireMembership(active.organization_id, back);
  const supabase = await createClient();

  const planId = text(formData, "plan_id");
  const { data: plan } = await supabase
    .from("membership_plans")
    .select("id, interval, active")
    .eq("id", planId)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!plan || !plan.active) failTo(back, "That plan is unavailable.");
  if (!isMembershipInterval(plan.interval)) failTo(back, "Plan has an invalid interval.");

  // One active enrollment per (contact, plan).
  const { data: existing } = await supabase
    .from("customer_memberships")
    .select("id")
    .eq("contact_id", contactId)
    .eq("plan_id", planId)
    .eq("status", "active")
    .maybeSingle();
  if (existing) failTo(back, "This customer is already enrolled in that plan.");

  const businessId = await firstBusinessId(supabase, active.organization_id, back);

  const { error } = await supabase.from("customer_memberships").insert({
    tenant_id: active.organization_id,
    business_id: businessId,
    contact_id: contactId,
    plan_id: planId,
    current_period_end: periodEndFromToday(plan.interval),
    created_by: user.id,
  });
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}

export async function cancelMembership(formData: FormData) {
  const { active } = await requireActiveOrg();
  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;
  await requireMembership(active.organization_id, back);
  const supabase = await createClient();

  const { error } = await supabase
    .from("customer_memberships")
    .update({ status: "canceled" })
    .eq("id", text(formData, "membership_id"))
    .eq("tenant_id", active.organization_id);
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}

/**
 * Send a renewal: create a Stripe payment link for the plan price, text it to
 * the customer, and roll current_period_end forward one interval. V1 assisted
 * recurring (no auto-charge) — reuses the Phase-8 payments path.
 */
export async function sendRenewal(formData: FormData) {
  const { active, user } = await requireActiveOrg();
  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;
  await requireMembership(active.organization_id, back);
  const supabase = await createClient();

  const membershipId = text(formData, "membership_id");
  const { data: membership } = await supabase
    .from("customer_memberships")
    .select("id, business_id, contact_id, current_period_end, plan_id")
    .eq("id", membershipId)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!membership) failTo(back, "Membership not found.");

  const { data: plan } = await supabase
    .from("membership_plans")
    .select("name, price_cents, interval")
    .eq("id", membership.plan_id)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!plan || !isMembershipInterval(plan.interval)) failTo(back, "Plan unavailable.");

  const { data: contact } = await supabase
    .from("contacts")
    .select("phone")
    .eq("id", contactId)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!contact) failTo(back, "Contact not found.");

  const description = `${plan.name} membership renewal`;
  const { data: payment, error: insErr } = await supabase
    .from("payments")
    .insert({
      tenant_id: active.organization_id,
      business_id: membership.business_id,
      contact_id: contactId,
      kind: "payment",
      amount_cents: plan.price_cents,
      description,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insErr || !payment) failTo(back, insErr?.message ?? "Could not create the renewal.");

  try {
    const origin = await getOrigin();
    const { url, sessionId } = await createPaymentCheckout({
      paymentId: payment.id,
      tenantId: active.organization_id,
      amountCents: plan.price_cents,
      currency: "usd",
      description,
      origin,
    });
    await supabase
      .from("payments")
      .update({ stripe_session_id: sessionId, payment_url: url })
      .eq("id", payment.id)
      .eq("tenant_id", active.organization_id);

    if (contact.phone) {
      const admin = createAdminClient();
      await sendCustomerSms(admin, {
        tenantId: active.organization_id,
        businessId: membership.business_id,
        contactId,
        toPhone: contact.phone as string,
        body: `Here's your secure link to renew your ${plan.name} membership: ${url}`,
        kind: "payment",
        requireConsent: false,
      });
    }

    // Roll the next-due date forward from the current one (assume they pay).
    await supabase
      .from("customer_memberships")
      .update({
        last_payment_id: payment.id,
        current_period_end: advancePeriodEnd(
          new Date(`${membership.current_period_end}T00:00:00Z`),
          plan.interval
        ),
      })
      .eq("id", membershipId)
      .eq("tenant_id", active.organization_id);
  } catch (err) {
    console.error("[membership] sendRenewal failed:", err);
    failTo(back, "Could not create the renewal link. Try again.");
  }

  redirect(`${back}?saved=1`);
}
