import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { PricingZone, ServicePrice, Surcharge } from "./engine";

/**
 * Load a business's pricing rules (server / service role) for the quote
 * engine, plus a cheap gate the prompt builder uses to decide whether
 * quoting is live for this tenant.
 */

export interface PricingSettings {
  base_address: string | null;
  base_lat: number | null;
  base_lng: number | null;
  max_service_miles: number;
  currency: string;
  approved_at: string | null;
}

export interface PricingBundle {
  settings: PricingSettings | null;
  zones: PricingZone[];
  services: ServicePrice[];
  surcharges: Surcharge[];
}

export async function loadPricing(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string
): Promise<PricingBundle> {
  const [settings, zones, services, surcharges] = await Promise.all([
    admin
      .from("pricing_settings")
      .select("base_address, base_lat, base_lng, max_service_miles, currency, approved_at")
      .eq("tenant_id", tenantId)
      .eq("business_id", businessId)
      .maybeSingle(),
    admin
      .from("pricing_zones")
      .select("zone_number, min_miles, max_miles, dispatch_fee")
      .eq("business_id", businessId)
      .eq("active", true),
    admin
      .from("service_pricing")
      .select(
        "name, pricing_type, service_fee, hook_fee, per_mile_rate, free_miles, variable_part, available_start, available_end"
      )
      .eq("business_id", businessId)
      .eq("active", true),
    admin
      .from("pricing_surcharges")
      .select("name, amount, apply_type, window_start, window_end")
      .eq("business_id", businessId)
      .eq("active", true),
  ]);

  return {
    settings: (settings.data as PricingSettings | null) ?? null,
    zones: (zones.data ?? []) as PricingZone[],
    services: (services.data ?? []) as ServicePrice[],
    surcharges: (surcharges.data ?? []) as Surcharge[],
  };
}

/** Quoting is live only once the owner has approved real, geocoded rules. */
export function bundleQuotingEnabled(b: PricingBundle): boolean {
  return Boolean(
    b.settings?.approved_at &&
      b.settings.base_lat != null &&
      b.settings.base_lng != null &&
      b.zones.length > 0 &&
      b.services.length > 0
  );
}

/** Cheap gate for the prompt builder (avoids loading every rule). */
export async function isQuotingEnabled(
  admin: SupabaseClient,
  tenantId: string,
  businessId: string
): Promise<boolean> {
  const { data: settings } = await admin
    .from("pricing_settings")
    .select("approved_at, base_lat, base_lng")
    .eq("tenant_id", tenantId)
    .eq("business_id", businessId)
    .maybeSingle();
  if (!settings?.approved_at || settings.base_lat == null || settings.base_lng == null) {
    return false;
  }
  const [{ count: zoneCount }, { count: svcCount }] = await Promise.all([
    admin
      .from("pricing_zones")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("active", true),
    admin
      .from("service_pricing")
      .select("id", { count: "exact", head: true })
      .eq("business_id", businessId)
      .eq("active", true),
  ]);
  return (zoneCount ?? 0) > 0 && (svcCount ?? 0) > 0;
}
