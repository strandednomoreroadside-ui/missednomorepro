"use server";

import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { createPaymentCheckout } from "@/lib/billing/payments";
import { parseTags } from "@/lib/contacts";
import { normalizeUsPhone } from "@/lib/phone";
import { getOrigin } from "@/lib/request";
import { sendCustomerSms } from "@/lib/sms/outbound";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { emitWebhookEvent } from "@/lib/webhooks";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

function failTo(path: string, message: string): never {
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

// ── Create (from the contacts list page) ─────────────────────────

export async function createContact(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const name = text(formData, "name");
  if (name.length < 1 || name.length > 160) {
    failTo("/dashboard/contacts", "Enter the contact's name (1–160 characters).");
  }

  let phone: string | null = null;
  const rawPhone = text(formData, "phone");
  if (rawPhone) {
    phone = normalizeUsPhone(rawPhone);
    if (!phone) failTo("/dashboard/contacts", "Enter a valid US phone number (or leave it blank).");
  }

  const { data, error } = await supabase
    .from("contacts")
    .insert({
      tenant_id: active.organization_id,
      name,
      phone,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
    })
    .select("id")
    .single();
  if (error) {
    failTo(
      "/dashboard/contacts",
      error.code === "23505"
        ? "A contact with that phone number already exists."
        : error.message
    );
  }

  redirect(`/dashboard/contacts/${data.id}`);
}

// ── Edit (from the contact detail page) ──────────────────────────

export async function updateContact(formData: FormData) {
  await requireActiveOrg();
  const supabase = await createClient();

  const id = text(formData, "id");
  const back = `/dashboard/contacts/${id}`;

  const name = text(formData, "name");
  if (name.length < 1 || name.length > 160) {
    failTo(back, "Enter the contact's name (1–160 characters).");
  }

  let phone: string | null = null;
  const rawPhone = text(formData, "phone");
  if (rawPhone) {
    phone = normalizeUsPhone(rawPhone);
    if (!phone) failTo(back, "Enter a valid US phone number (or leave it blank).");
  }

  // Consent (§8.3): record how + when it changed. The M8 send_sms
  // tool hard-blocks on consent_sms = false.
  const consent = formData.get("consent_sms") === "on";
  const { data: existing, error: readErr } = await supabase
    .from("contacts")
    .select("consent_sms")
    .eq("id", id)
    .single();
  if (readErr) failTo(back, readErr.message);
  const consentChanged = existing.consent_sms !== consent;

  const { error } = await supabase
    .from("contacts")
    .update({
      name,
      phone,
      email: text(formData, "email") || null,
      address: text(formData, "address") || null,
      notes: text(formData, "notes") || null,
      tags: parseTags(text(formData, "tags")),
      consent_sms: consent,
      ...(consentChanged && {
        consent_source: "manual",
        consent_timestamp: new Date().toISOString(),
      }),
    })
    .eq("id", id);
  if (error) {
    failTo(
      back,
      error.code === "23505"
        ? "Another contact already has that phone number."
        : error.message
    );
  }

  redirect(`${back}?saved=1`);
}

/** One-click VIP toggle (Ph13). VIP is just the "vip" tag — also auto-applied
 *  on a loyalty threshold when a job completes (see jobs/actions.ts). */
export async function toggleVip(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const id = text(formData, "id");
  const back = `/dashboard/contacts/${id}`;

  const { data: contact } = await supabase
    .from("contacts")
    .select("tags")
    .eq("id", id)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!contact) failTo(back, "Contact not found.");

  const tags = (contact.tags as string[] | null) ?? [];
  const next = tags.includes("vip")
    ? tags.filter((t) => t !== "vip")
    : [...tags, "vip"];

  const { error } = await supabase
    .from("contacts")
    .update({ tags: next })
    .eq("id", id)
    .eq("tenant_id", active.organization_id);
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}

export async function deleteContact(formData: FormData) {
  await requireActiveOrg();
  const supabase = await createClient();
  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", text(formData, "id"));
  if (error) failTo("/dashboard/contacts", error.message);
  redirect("/dashboard/contacts?deleted=1");
}

// ── Notes ────────────────────────────────────────────────────────

export async function addNote(formData: FormData) {
  const { user, active } = await requireActiveOrg();
  const supabase = await createClient();

  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;
  const note = text(formData, "note");
  if (note.length < 1 || note.length > 5000) {
    failTo(back, "Notes are 1–5,000 characters.");
  }

  const { error } = await supabase.from("customer_notes").insert({
    tenant_id: active.organization_id,
    contact_id: contactId,
    author_user_id: user.id,
    note,
  });
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}

// ── Leads ────────────────────────────────────────────────────────

export async function createLead(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;
  const urgency = text(formData, "urgency");

  const serviceNeeded = text(formData, "service_needed") || null;
  const { data: created, error } = await supabase
    .from("leads")
    .insert({
      tenant_id: active.organization_id,
      contact_id: contactId,
      source: "manual",
      service_needed: serviceNeeded,
      urgency: ["low", "normal", "high", "emergency"].includes(urgency)
        ? urgency
        : null,
    })
    .select("id")
    .maybeSingle();
  if (error) failTo(back, error.message);

  // Outbound webhook (integration escape hatch) — only if subscribed. Before
  // redirect (redirect throws by design).
  await emitWebhookEvent({
    tenantId: active.organization_id,
    event: "lead.created",
    data: {
      lead_id: (created as { id?: string } | null)?.id ?? null,
      contact_id: contactId,
      service_needed: serviceNeeded,
      source: "manual",
    },
  });

  redirect(`${back}?saved=1`);
}

// ── Payments (Phase 8) ──────────────────────────────────────────

/** Create a Stripe payment link for a customer and text it to them. */
export async function requestPayment(formData: FormData) {
  const { active, user } = await requireActiveOrg();
  const supabase = await createClient();

  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;

  // Gate: payment requests need the Growth plan (or higher).
  const ent = await getEntitlements(active.organization_id);
  if (!ent.has("payment_requests")) {
    failTo(back, "Payment requests are on the Growth plan and up.");
  }

  const dollars = Number(text(formData, "amount"));
  if (!Number.isFinite(dollars) || dollars <= 0 || dollars > 100000) {
    failTo(back, "Enter a valid amount.");
  }
  const amountCents = Math.round(dollars * 100);
  const kind = text(formData, "kind");
  const safeKind = ["deposit", "invoice", "payment"].includes(kind) ? kind : "payment";
  const description =
    text(formData, "description") ||
    `${safeKind === "deposit" ? "Deposit" : safeKind === "invoice" ? "Invoice" : "Payment"} request`;

  const { data: contact } = await supabase
    .from("contacts")
    .select("id, phone")
    .eq("id", contactId)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!contact) failTo(back, "Contact not found.");

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!business) failTo(back, "Set up your business first.");

  // Insert the pending payment, then create the Stripe link with its id.
  const { data: payment, error: insErr } = await supabase
    .from("payments")
    .insert({
      tenant_id: active.organization_id,
      business_id: business.id,
      contact_id: contactId,
      kind: safeKind,
      amount_cents: amountCents,
      description,
      created_by: user.id,
    })
    .select("id")
    .single();
  if (insErr || !payment) failTo(back, insErr?.message ?? "Could not create the request.");

  try {
    const origin = await getOrigin();
    const { url, sessionId } = await createPaymentCheckout({
      paymentId: payment.id,
      tenantId: active.organization_id,
      amountCents,
      currency: "usd",
      description,
      origin,
    });
    await supabase
      .from("payments")
      .update({ stripe_session_id: sessionId, payment_url: url })
      .eq("id", payment.id)
      .eq("tenant_id", active.organization_id);

    // Text the customer the link (transactional — they're paying us; STOP wins).
    if (contact.phone) {
      const admin = createAdminClient();
      await sendCustomerSms(admin, {
        tenantId: active.organization_id,
        businessId: business.id,
        contactId,
        toPhone: contact.phone as string,
        body: `Here's your secure payment link for ${description}: ${url}`,
        kind: "payment",
        requireConsent: false,
      });
    }
  } catch (err) {
    console.error("[payments] requestPayment failed:", err);
    failTo(back, "Could not create the payment link. Try again.");
  }

  redirect(`${back}?saved=1`);
}

/** Cancel a pending payment request. */
export async function cancelPayment(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const contactId = text(formData, "contact_id");
  const paymentId = text(formData, "payment_id");

  await supabase
    .from("payments")
    .update({ status: "canceled" })
    .eq("id", paymentId)
    .eq("tenant_id", active.organization_id)
    .eq("status", "pending");

  redirect(`/dashboard/contacts/${contactId}?saved=1`);
}

export async function updateLeadStatus(formData: FormData) {
  await requireActiveOrg();
  const supabase = await createClient();

  const contactId = text(formData, "contact_id");
  const back = `/dashboard/contacts/${contactId}`;
  const status = text(formData, "status");
  if (
    !["new_lead", "quoted", "scheduled", "completed", "follow_up", "repeat", "lost"].includes(
      status
    )
  ) {
    failTo(back, "Unknown lead status.");
  }

  const { error } = await supabase
    .from("leads")
    .update({ status })
    .eq("id", text(formData, "lead_id"));
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
}
