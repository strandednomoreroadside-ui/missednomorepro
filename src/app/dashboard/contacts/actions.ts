"use server";

import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { normalizeUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

/** Parses "vip, repeat customer" → ['vip', 'repeat customer'] (≤ 10). */
function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40)
    ),
  ].slice(0, 10);
}

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

  const { error } = await supabase.from("leads").insert({
    tenant_id: active.organization_id,
    contact_id: contactId,
    source: "manual",
    service_needed: text(formData, "service_needed") || null,
    urgency: ["low", "normal", "high", "emergency"].includes(urgency)
      ? urgency
      : null,
  });
  if (error) failTo(back, error.message);

  redirect(`${back}?saved=1`);
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
