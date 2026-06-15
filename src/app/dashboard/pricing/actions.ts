"use server";

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
