import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { StepId } from "@/lib/setup/steps";

export type Business = {
  id: string;
  tenant_id: string;
  name: string;
  industry: string | null;
  phone: string | null;
  website_url: string | null;
  gbp_url: string | null;
  address: string | null;
  timezone: string;
  status: "setup" | "live" | "paused";
};

export type Service = {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
};

export type PricingRule = {
  id: string;
  service_id: string;
  rule_type: "flat" | "base_fee";
  config_json: { amount?: number; note?: string };
  requires_human_approval: boolean;
  active: boolean;
};

export type ServiceArea = {
  id: string;
  type: "zip" | "city";
  zip_code: string | null;
  city: string | null;
  state: string | null;
  active: boolean;
};

export type BusinessHour = {
  id: string;
  day_of_week: number;
  closed: boolean;
  opens_at: string | null;
  closes_at: string | null;
};

export type StaffContact = {
  id: string;
  name: string;
  phone: string;
  notify_on_lead: boolean;
};

export type SmsSettings = {
  id: string;
  ask_consent_on_call: boolean;
  consent_script: string;
  transactional_only: boolean;
};

export type Faq = {
  id: string;
  question: string;
  answer: string;
  active: boolean;
};

export type SetupState = {
  id: string;
  business_id: string;
  current_step: string;
  pricing_approved_at: string | null;
  hours_approved_at: string | null;
  area_approved_at: string | null;
  launched_at: string | null;
};

export type SetupData = {
  business: Business;
  state: SetupState;
  services: Service[];
  pricingRules: PricingRule[];
  areas: ServiceArea[];
  hours: BusinessHour[];
  staff: StaffContact[];
  sms: SmsSettings | null;
  faqs: Faq[];
};

/**
 * The active org's business row (one per org in the MVP), created on
 * first wizard visit. The DB trigger creates its setup_states row.
 */
export async function getOrCreateBusiness(
  tenantId: string,
  orgName: string
): Promise<Business> {
  const supabase = await createClient();
  const { data: existing, error } = await supabase
    .from("businesses")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`Failed to load business: ${error.message}`);
  if (existing) return existing as Business;

  const { data: created, error: insertErr } = await supabase
    .from("businesses")
    .insert({ tenant_id: tenantId, organization_id: tenantId, name: orgName })
    .select("*")
    .single();
  if (insertErr) throw new Error(`Failed to create business: ${insertErr.message}`);
  return created as Business;
}

/** Everything the wizard shows, in one round of parallel queries. */
export async function getSetupData(
  tenantId: string,
  orgName: string
): Promise<SetupData> {
  const business = await getOrCreateBusiness(tenantId, orgName);
  const supabase = await createClient();

  const [state, services, pricingRules, areas, hours, staff, sms, faqs] =
    await Promise.all([
      supabase
        .from("setup_states")
        .select("*")
        .eq("business_id", business.id)
        .single(),
      supabase
        .from("services")
        .select("id, name, description, active")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("pricing_rules")
        .select("id, service_id, rule_type, config_json, requires_human_approval, active")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true }),
      supabase
        .from("service_areas")
        .select("id, type, zip_code, city, state, active")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("business_hours")
        .select("id, day_of_week, closed, opens_at, closes_at")
        .eq("business_id", business.id)
        .order("day_of_week", { ascending: true }),
      supabase
        .from("staff_contacts")
        .select("id, name, phone, notify_on_lead")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("sms_settings")
        .select("id, ask_consent_on_call, consent_script, transactional_only")
        .eq("business_id", business.id)
        .maybeSingle(),
      supabase
        .from("faqs")
        .select("id, question, answer, active")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true }),
    ]);

  const firstError =
    state.error ?? services.error ?? pricingRules.error ?? areas.error ??
    hours.error ?? staff.error ?? sms.error ?? faqs.error;
  if (firstError) throw new Error(`Failed to load setup data: ${firstError.message}`);

  return {
    business,
    state: state.data as SetupState,
    services: (services.data ?? []) as Service[],
    pricingRules: (pricingRules.data ?? []) as PricingRule[],
    areas: (areas.data ?? []) as ServiceArea[],
    hours: (hours.data ?? []) as BusinessHour[],
    staff: (staff.data ?? []) as StaffContact[],
    sms: (sms.data ?? null) as SmsSettings | null,
    faqs: (faqs.data ?? []) as Faq[],
  };
}

/**
 * Per-step completeness, mirroring app.setup_complete() in the M4
 * migration. The database is the enforcer; this powers the UI.
 */
export function stepCompletion(data: SetupData): Record<StepId, boolean> {
  const activeServices = data.services.filter((s) => s.active);
  const ruledServiceIds = new Set(
    data.pricingRules.filter((r) => r.active).map((r) => r.service_id)
  );
  return {
    profile: Boolean(data.business.name && data.business.phone && data.business.timezone),
    industry: Boolean(data.business.industry),
    services: activeServices.length > 0,
    pricing:
      activeServices.length > 0 &&
      activeServices.every((s) => ruledServiceIds.has(s.id)),
    "service-area": data.areas.some((a) => a.active),
    hours:
      data.hours.length === 7 && data.hours.some((h) => !h.closed),
    notifications: data.staff.some((c) => c.notify_on_lead),
    sms: data.sms !== null,
    faqs: true, // optional step
    launch: data.business.status === "live",
  };
}

export type Approvals = {
  pricing: boolean;
  hours: boolean;
  area: boolean;
};

export function approvals(state: SetupState): Approvals {
  return {
    pricing: state.pricing_approved_at !== null,
    hours: state.hours_approved_at !== null,
    area: state.area_approved_at !== null,
  };
}

/** True when every required step is done and all approvals are in. */
export function readyToLaunch(data: SetupData): boolean {
  const steps = stepCompletion(data);
  const ok = approvals(data.state);
  return (
    steps.profile &&
    steps.industry &&
    steps.services &&
    steps.pricing &&
    steps["service-area"] &&
    steps.hours &&
    steps.notifications &&
    steps.sms &&
    ok.pricing &&
    ok.hours &&
    ok.area
  );
}
