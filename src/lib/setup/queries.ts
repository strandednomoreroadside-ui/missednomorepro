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

export type PricingSettings = {
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  max_service_miles: number | null;
  approved_at: string | null;
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
  /** Active services that live only in the pricing sheet (service_pricing),
   *  not the wizard `services` table — shown read-only so the owner sees the
   *  full list the AI actually speaks. Managed on /dashboard/pricing. */
  pricedServiceNames: string[];
  areas: ServiceArea[];
  hours: BusinessHour[];
  staff: StaffContact[];
  sms: SmsSettings | null;
  faqs: Faq[];
  pricingSettings: PricingSettings | null;
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

  const [state, services, priced, areas, hours, staff, sms, faqs, pricingSettings] =
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
        .from("service_pricing")
        .select("name")
        .eq("business_id", business.id)
        .eq("active", true)
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
      supabase
        .from("pricing_settings")
        .select("base_address, base_lat, base_lng, max_service_miles, approved_at")
        .eq("business_id", business.id)
        .maybeSingle(),
    ]);

  const firstError =
    state.error ?? services.error ?? priced.error ?? areas.error ??
    hours.error ?? staff.error ?? sms.error ?? faqs.error ?? pricingSettings.error;
  if (firstError) throw new Error(`Failed to load setup data: ${firstError.message}`);

  // The full service list the AI speaks = wizard `services` ∪ priced services
  // (dedupe by name). Surface the priced-only names so the owner isn't
  // confused when the wizard shows fewer than they actually offer.
  const serviceData = (services.data ?? []) as Service[];
  const haveNames = new Set(
    serviceData.filter((s) => s.active).map((s) => s.name.toLowerCase())
  );
  const pricedServiceNames = ((priced.data ?? []) as { name: string }[])
    .map((p) => p.name)
    .filter((n) => !haveNames.has(n.toLowerCase()));

  return {
    business,
    state: state.data as SetupState,
    services: serviceData,
    pricedServiceNames,
    areas: (areas.data ?? []) as ServiceArea[],
    hours: (hours.data ?? []) as BusinessHour[],
    staff: (staff.data ?? []) as StaffContact[],
    sms: (sms.data ?? null) as SmsSettings | null,
    faqs: (faqs.data ?? []) as Faq[],
    pricingSettings: (pricingSettings.data ?? null) as PricingSettings | null,
  };
}

/**
 * Per-step completeness, mirroring app.setup_complete() in the M4
 * migration. The database is the enforcer; this powers the UI.
 */
export function stepCompletion(data: SetupData): Record<StepId, boolean> {
  const activeServices = data.services.filter((s) => s.active);
  return {
    profile: Boolean(data.business.name && data.business.phone && data.business.timezone),
    industry: Boolean(data.business.industry),
    services: activeServices.length > 0,
    // Informational step — real pricing/quoting setup + approval lives on
    // /dashboard/pricing, independent of the wizard and launch.
    pricing: true,
    // Plug-and-play: a geocoded home base + radius is the real coverage
    // mechanism (powers radius check_service_area + the spoken answer). We
    // also keep the DB launch gate's requirement of ≥1 active area row —
    // saveHomeBase auto-seeds the home city so this is satisfied in one save.
    "service-area":
      Boolean(data.pricingSettings?.base_address) && data.areas.some((a) => a.active),
    hours:
      data.hours.length === 7 && data.hours.some((h) => !h.closed),
    notifications: data.staff.some((c) => c.notify_on_lead),
    sms: data.sms !== null,
    faqs: true, // optional step
    launch: data.business.status === "live",
  };
}

export type Approvals = {
  hours: boolean;
  area: boolean;
};

export function approvals(state: SetupState): Approvals {
  return {
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
    steps["service-area"] &&
    steps.hours &&
    steps.notifications &&
    steps.sms &&
    ok.hours &&
    ok.area
  );
}
