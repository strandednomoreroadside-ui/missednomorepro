"use server";

import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { normalizeUsPhone } from "@/lib/phone";
import { getOrCreateBusiness } from "@/lib/setup/queries";
import { NICHES, STEP_ORDER, US_TIMEZONES, isStepId, type StepId } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

/** Resolves the signed-in user's active org + business for mutations. */
async function requireBusiness() {
  const { user, active } = await requireActiveOrg();
  const business = await getOrCreateBusiness(
    active.organization_id,
    active.organizations.name
  );
  return { user, active, business, supabase: await createClient() };
}

function fail(step: StepId, message: string): never {
  redirect(`/dashboard/setup/${step}?error=${encodeURIComponent(message)}`);
}

function done(step: StepId): never {
  redirect(`/dashboard/setup/${step}?saved=1`);
}

/** Advances the saved bookmark and moves to the next step. */
async function advance(businessId: string, from: StepId): Promise<never> {
  const next = STEP_ORDER[Math.min(STEP_ORDER.indexOf(from) + 1, STEP_ORDER.length - 1)];
  const supabase = await createClient();
  await supabase.rpc("save_setup_progress", { biz: businessId, step: next });
  redirect(`/dashboard/setup/${next}`);
}

const text = (formData: FormData, key: string) =>
  String(formData.get(key) ?? "").trim();

// ── Step 1: business profile ─────────────────────────────────────

export async function saveProfile(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const name = text(formData, "name");
  if (name.length < 1 || name.length > 120) {
    fail("profile", "Enter a business name (1–120 characters).");
  }
  const phone = normalizeUsPhone(text(formData, "phone"));
  if (!phone) fail("profile", "Enter a valid US phone number, like (440) 555-0123.");
  const timezone = text(formData, "timezone");
  if (!US_TIMEZONES.some((t) => t.value === timezone)) {
    fail("profile", "Pick your timezone from the list.");
  }

  const { error } = await supabase
    .from("businesses")
    .update({
      name,
      phone,
      timezone,
      website_url: text(formData, "website_url") || null,
      gbp_url: text(formData, "gbp_url") || null,
      address: text(formData, "address") || null,
    })
    .eq("id", business.id);
  if (error) fail("profile", error.message);

  await advance(business.id, "profile");
}

// ── Step 2: industry ─────────────────────────────────────────────

export async function saveIndustry(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const industry = text(formData, "industry");
  if (!(NICHES as readonly string[]).includes(industry)) {
    fail("industry", "Pick the trade that matches your business.");
  }

  const { error } = await supabase
    .from("businesses")
    .update({ industry })
    .eq("id", business.id);
  if (error) fail("industry", error.message);

  await advance(business.id, "industry");
}

// ── Step 3: services ─────────────────────────────────────────────

export async function addService(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const name = text(formData, "name");
  if (name.length < 1 || name.length > 120) {
    fail("services", "Give the service a name (1–120 characters).");
  }

  const { error } = await supabase.from("services").insert({
    tenant_id: business.tenant_id,
    business_id: business.id,
    name,
    description: text(formData, "description") || null,
  });
  if (error) fail("services", error.message);

  done("services");
}

export async function removeService(formData: FormData) {
  const { supabase } = await requireBusiness();
  const id = text(formData, "id");
  const { error } = await supabase.from("services").delete().eq("id", id);
  if (error) fail("services", error.message);
  done("services");
}

export async function finishServices() {
  const { business } = await requireBusiness();
  await advance(business.id, "services");
}

// ── Step 4: pricing rules ────────────────────────────────────────

export async function savePricingRule(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const serviceId = text(formData, "service_id");
  const ruleType = text(formData, "rule_type");
  if (ruleType !== "flat" && ruleType !== "base_fee") {
    fail("pricing", "Pick a price type.");
  }
  const amount = Number.parseFloat(text(formData, "amount"));
  if (!Number.isFinite(amount) || amount < 0 || amount > 100000) {
    fail("pricing", "Enter a dollar amount, like 75 or 129.50.");
  }
  // Checkbox: present when checked. Default (unchecked) stays TRUE —
  // a human approves every quote unless the owner opts out (§5.1).
  const requiresApproval = formData.get("auto_quote") !== "on";

  // One rule per service in the MVP: replace any existing rule.
  const { error: delErr } = await supabase
    .from("pricing_rules")
    .delete()
    .eq("service_id", serviceId);
  if (delErr) fail("pricing", delErr.message);

  const { error } = await supabase.from("pricing_rules").insert({
    tenant_id: business.tenant_id,
    service_id: serviceId,
    rule_type: ruleType,
    config_json: { amount: Math.round(amount * 100) / 100 },
    requires_human_approval: requiresApproval,
  });
  if (error) fail("pricing", error.message);

  done("pricing");
}

export async function finishPricing() {
  const { business } = await requireBusiness();
  await advance(business.id, "pricing");
}

// ── Step 5: service area ─────────────────────────────────────────

export async function addServiceArea(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const type = text(formData, "type");
  let row: Record<string, unknown>;
  if (type === "zip") {
    const zip = text(formData, "zip_code");
    if (!/^\d{5}$/.test(zip)) fail("service-area", "ZIP codes are 5 digits, like 44060.");
    row = { type, zip_code: zip };
  } else if (type === "city") {
    const city = text(formData, "city");
    const state = text(formData, "state").toUpperCase();
    if (!city) fail("service-area", "Enter the city name.");
    if (!/^[A-Z]{2}$/.test(state)) fail("service-area", "Use the 2-letter state code, like OH.");
    row = { type, city, state };
  } else {
    fail("service-area", "Pick ZIP code or city.");
  }

  const { error } = await supabase.from("service_areas").insert({
    tenant_id: business.tenant_id,
    business_id: business.id,
    ...row,
  });
  if (error) fail("service-area", error.message);

  done("service-area");
}

export async function removeServiceArea(formData: FormData) {
  const { supabase } = await requireBusiness();
  const { error } = await supabase
    .from("service_areas")
    .delete()
    .eq("id", text(formData, "id"));
  if (error) fail("service-area", error.message);
  done("service-area");
}

export async function finishServiceArea() {
  const { business } = await requireBusiness();
  await advance(business.id, "service-area");
}

// ── Step 6: business hours ───────────────────────────────────────

export async function saveHours(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const rows = [];
  for (let dow = 0; dow <= 6; dow++) {
    const closed = formData.get(`closed_${dow}`) === "on";
    const opens = text(formData, `opens_${dow}`);
    const closes = text(formData, `closes_${dow}`);
    if (!closed) {
      if (!opens || !closes) {
        fail("hours", "Set opening and closing times for every open day (or mark it closed).");
      }
      if (opens >= closes) {
        fail("hours", "Closing time must be after opening time on every open day.");
      }
    }
    rows.push({
      tenant_id: business.tenant_id,
      business_id: business.id,
      day_of_week: dow,
      closed,
      opens_at: closed ? null : opens,
      closes_at: closed ? null : closes,
    });
  }
  if (rows.every((r) => r.closed)) {
    fail("hours", "At least one day has to be open.");
  }

  const { error } = await supabase
    .from("business_hours")
    .upsert(rows, { onConflict: "business_id,day_of_week" });
  if (error) fail("hours", error.message);

  await advance(business.id, "hours");
}

// ── Step 7: staff notifications ──────────────────────────────────

export async function addStaffContact(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const name = text(formData, "name");
  if (!name) fail("notifications", "Enter the person's name.");
  const phone = normalizeUsPhone(text(formData, "phone"));
  if (!phone) fail("notifications", "Enter a valid US phone number.");

  const { error } = await supabase.from("staff_contacts").insert({
    tenant_id: business.tenant_id,
    business_id: business.id,
    name,
    phone,
  });
  if (error) fail("notifications", error.message);

  done("notifications");
}

export async function removeStaffContact(formData: FormData) {
  const { supabase } = await requireBusiness();
  const { error } = await supabase
    .from("staff_contacts")
    .delete()
    .eq("id", text(formData, "id"));
  if (error) fail("notifications", error.message);
  done("notifications");
}

export async function finishNotifications() {
  const { business } = await requireBusiness();
  await advance(business.id, "notifications");
}

// ── Step 8: SMS consent settings ─────────────────────────────────

export async function saveSmsSettings(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const script = text(formData, "consent_script");
  if (script.length < 10 || script.length > 500) {
    fail("sms", "The consent question should be 10–500 characters.");
  }

  const { error } = await supabase.from("sms_settings").upsert(
    {
      tenant_id: business.tenant_id,
      business_id: business.id,
      ask_consent_on_call: formData.get("ask_consent_on_call") === "on",
      consent_script: script,
      transactional_only: formData.get("transactional_only") === "on",
    },
    { onConflict: "business_id" }
  );
  if (error) fail("sms", error.message);

  await advance(business.id, "sms");
}

// ── Step 9: FAQs ─────────────────────────────────────────────────

export async function addFaq(formData: FormData) {
  const { business, supabase } = await requireBusiness();

  const question = text(formData, "question");
  const answer = text(formData, "answer");
  if (!question || !answer) fail("faqs", "Fill in both the question and the answer.");
  if (question.length > 300) fail("faqs", "Keep the question under 300 characters.");
  if (answer.length > 2000) fail("faqs", "Keep the answer under 2,000 characters.");

  const { error } = await supabase.from("faqs").insert({
    tenant_id: business.tenant_id,
    business_id: business.id,
    question,
    answer,
  });
  if (error) fail("faqs", error.message);

  done("faqs");
}

export async function removeFaq(formData: FormData) {
  const { supabase } = await requireBusiness();
  const { error } = await supabase.from("faqs").delete().eq("id", text(formData, "id"));
  if (error) fail("faqs", error.message);
  done("faqs");
}

export async function finishFaqs() {
  const { business } = await requireBusiness();
  await advance(business.id, "faqs");
}

// ── Step 10: approvals + launch ──────────────────────────────────
// Both RPCs validate the caller's role (owner/admin) and audit-log
// inside the database; the launch gate trigger re-checks completeness.

export async function approveSection(formData: FormData) {
  const { business, supabase } = await requireBusiness();
  const section = text(formData, "section");
  if (!["pricing", "hours", "area"].includes(section)) {
    fail("launch", "Unknown approval section.");
  }
  const { error } = await supabase.rpc("approve_setup_section", {
    biz: business.id,
    section,
  });
  if (error) fail("launch", error.message);
  done("launch");
}

export async function launchBusiness() {
  const { business, supabase } = await requireBusiness();
  const { error } = await supabase.rpc("launch_business", { biz: business.id });
  if (error) fail("launch", error.message);
  redirect("/dashboard?launched=1");
}

// ── Step navigation (the "Back" links use plain hrefs; this saves
// the bookmark when someone jumps via the sidebar) ────────────────

export async function goToStep(formData: FormData) {
  const { business, supabase } = await requireBusiness();
  const step = text(formData, "step");
  if (!isStepId(step)) redirect("/dashboard/setup");
  await supabase.rpc("save_setup_progress", { biz: business.id, step });
  redirect(`/dashboard/setup/${step}`);
}
