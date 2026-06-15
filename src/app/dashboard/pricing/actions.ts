"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { geocodeAddress } from "@/lib/maps/client";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

async function firstBusinessId(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/**
 * Approve pricing → turns AI quoting on. Geocodes the home base first (the
 * engine needs coordinates); if that can't happen, it bounces back with a
 * reason instead of enabling a half-configured engine.
 */
export async function approvePricing() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const businessId = await firstBusinessId(supabase, active.organization_id);
  if (!businessId) redirect("/dashboard/pricing?pricing=nobiz");

  const { data: settings } = await supabase
    .from("pricing_settings")
    .select("base_address, base_lat, base_lng")
    .eq("business_id", businessId)
    .maybeSingle();
  if (!settings?.base_address) redirect("/dashboard/pricing?pricing=nobase");

  let lat = settings.base_lat as number | null;
  let lng = settings.base_lng as number | null;
  if (lat == null || lng == null) {
    const geo = await geocodeAddress(settings.base_address as string);
    if (!geo) redirect("/dashboard/pricing?pricing=nogeo");
    lat = geo.lat;
    lng = geo.lng;
  }

  await supabase
    .from("pricing_settings")
    .update({ approved_at: new Date().toISOString(), base_lat: lat, base_lng: lng })
    .eq("business_id", businessId)
    .eq("tenant_id", active.organization_id);

  redirect("/dashboard/pricing?pricing=approved");
}

/** Set the service-area radius (miles from home base) used for quoting +
 *  the radius-based check_service_area. */
export async function updateServiceRadius(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const businessId = await firstBusinessId(supabase, active.organization_id);
  if (!businessId) return;

  const miles = Number(formData.get("max_service_miles"));
  if (!Number.isFinite(miles) || miles <= 0 || miles > 200) return;

  await supabase
    .from("pricing_settings")
    .update({ max_service_miles: miles })
    .eq("business_id", businessId)
    .eq("tenant_id", active.organization_id);
  revalidatePath("/dashboard/pricing");
}

/** Turn AI quoting back off (revert to "owner will text a quote"). */
export async function unapprovePricing() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const businessId = await firstBusinessId(supabase, active.organization_id);
  if (!businessId) redirect("/dashboard/pricing?pricing=nobiz");

  await supabase
    .from("pricing_settings")
    .update({ approved_at: null })
    .eq("business_id", businessId)
    .eq("tenant_id", active.organization_id);

  redirect("/dashboard/pricing?pricing=off");
}

// ── Prices & Services manager (member-managed CRUD) ────────────

function num(formData: FormData, key: string): number | null {
  const raw = formData.get(key);
  if (raw == null || String(raw).trim() === "") return null;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

async function ctx() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const businessId = await firstBusinessId(supabase, active.organization_id);
  return { tenantId: active.organization_id, supabase, businessId };
}

async function deleteRow(table: string, formData: FormData) {
  const { tenantId, supabase } = await ctx();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase.from(table).delete().eq("id", id).eq("tenant_id", tenantId);
  revalidatePath("/dashboard/pricing");
}

/** Set/replace the home base address. Clears coords so the next Approve
 *  re-geocodes (and quoting stays off until that happens). */
export async function setHomeBase(formData: FormData) {
  const { tenantId, supabase, businessId } = await ctx();
  if (!businessId) return;
  const base = String(formData.get("base_address") ?? "").trim();
  if (!base) return;
  await supabase.from("pricing_settings").upsert(
    {
      tenant_id: tenantId,
      business_id: businessId,
      base_address: base,
      base_lat: null,
      base_lng: null,
      approved_at: null,
    },
    { onConflict: "business_id" }
  );
  revalidatePath("/dashboard/pricing");
}

/** Add a service (flat fee, or a tow with hook + per-mile). */
export async function addService(formData: FormData) {
  const { tenantId, supabase, businessId } = await ctx();
  if (!businessId) return;
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  if (!name) return;
  const pricingType = formData.get("pricing_type") === "tow" ? "tow" : "flat";
  const variablePart = String(formData.get("variable_part") ?? "").trim() || null;
  const start = String(formData.get("available_start") ?? "").trim() || null;
  const end = String(formData.get("available_end") ?? "").trim() || null;

  await supabase.from("service_pricing").insert({
    tenant_id: tenantId,
    business_id: businessId,
    name,
    pricing_type: pricingType,
    service_fee: pricingType === "flat" ? num(formData, "service_fee") ?? 0 : 0,
    hook_fee: pricingType === "tow" ? num(formData, "hook_fee") : null,
    per_mile_rate: pricingType === "tow" ? num(formData, "per_mile_rate") : null,
    free_miles: pricingType === "tow" ? num(formData, "free_miles") ?? 0 : 0,
    variable_part: variablePart,
    available_start: start,
    available_end: end,
  });
  revalidatePath("/dashboard/pricing");
}

export async function toggleService(formData: FormData) {
  const { tenantId, supabase } = await ctx();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("service_pricing")
    .update({ active: formData.get("active") === "true" })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  revalidatePath("/dashboard/pricing");
}

export async function deleteService(formData: FormData) {
  await deleteRow("service_pricing", formData);
}

/** Add a distance-banded dispatch zone. */
export async function addZone(formData: FormData) {
  const { tenantId, supabase, businessId } = await ctx();
  if (!businessId) return;
  const zoneNumber = num(formData, "zone_number");
  const minMiles = num(formData, "min_miles");
  const maxMiles = num(formData, "max_miles");
  const fee = num(formData, "dispatch_fee");
  if (zoneNumber == null || minMiles == null || maxMiles == null || fee == null) return;
  if (maxMiles <= minMiles) return;
  await supabase.from("pricing_zones").insert({
    tenant_id: tenantId,
    business_id: businessId,
    zone_number: Math.round(zoneNumber),
    min_miles: minMiles,
    max_miles: maxMiles,
    dispatch_fee: fee,
  });
  revalidatePath("/dashboard/pricing");
}

export async function deleteZone(formData: FormData) {
  await deleteRow("pricing_zones", formData);
}

/** Add a surcharge (auto by time window, or conditional/mentioned). */
export async function addSurcharge(formData: FormData) {
  const { tenantId, supabase, businessId } = await ctx();
  if (!businessId) return;
  const name = String(formData.get("name") ?? "").trim().slice(0, 160);
  const amount = num(formData, "amount");
  if (!name || amount == null) return;
  const applyType = formData.get("apply_type") === "auto_time" ? "auto_time" : "conditional";
  await supabase.from("pricing_surcharges").insert({
    tenant_id: tenantId,
    business_id: businessId,
    name,
    amount,
    apply_type: applyType,
    window_start: applyType === "auto_time" ? String(formData.get("window_start") ?? "").trim() || null : null,
    window_end: applyType === "auto_time" ? String(formData.get("window_end") ?? "").trim() || null : null,
  });
  revalidatePath("/dashboard/pricing");
}

export async function deleteSurcharge(formData: FormData) {
  await deleteRow("pricing_surcharges", formData);
}
