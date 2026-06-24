import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isQuotingEnabled } from "@/lib/pricing/loader";

import { getVoiceProvider } from "./index";
import { buildAgentConfig, type PromptInput } from "./prompt";
import type { ProviderAgentRef } from "./types";

/** Minimal business shape the sync needs (loaded via the service role). */
export type AgentBusiness = {
  id: string;
  tenant_id: string;
  name: string;
  industry: string | null;
  timezone: string;
  status: string;
};

/** Load the wizard data the prompt builder needs, server-side (admin). */
export async function loadPromptInput(
  admin: SupabaseClient,
  business: AgentBusiness
): Promise<PromptInput> {
  const [
    services,
    hours,
    areas,
    faqs,
    sms,
    agent,
    conn,
    quoting,
    pricing,
    transfer,
    settings,
  ] = await Promise.all([
    admin
      .from("services")
      .select("id, name, description, active")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    admin
      .from("business_hours")
      .select("id, day_of_week, closed, opens_at, closes_at")
      .eq("business_id", business.id)
      .order("day_of_week", { ascending: true }),
    admin
      .from("service_areas")
      .select("id, type, zip_code, city, state, active")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    admin
      .from("faqs")
      .select("id, question, answer, active")
      .eq("business_id", business.id)
      .order("created_at", { ascending: true }),
    admin
      .from("sms_settings")
      .select("id, ask_consent_on_call, consent_script, transactional_only")
      .eq("business_id", business.id)
      .maybeSingle(),
    admin
      .from("agents")
      .select("name, voice_id, language_settings, personality, max_call_seconds")
      .eq("tenant_id", business.tenant_id)
      .eq("business_id", business.id)
      .limit(1)
      .maybeSingle(),
    admin
      .from("calendar_connections")
      .select("status")
      .eq("tenant_id", business.tenant_id)
      .eq("business_id", business.id)
      .maybeSingle(),
    isQuotingEnabled(admin, business.tenant_id, business.id),
    admin
      .from("service_pricing")
      .select("name")
      .eq("business_id", business.id)
      .eq("active", true),
    admin
      .from("staff_contacts")
      .select("phone")
      .eq("business_id", business.id)
      .eq("notify_on_lead", true)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    admin
      .from("pricing_settings")
      .select("base_lat, base_lng, max_service_miles")
      .eq("business_id", business.id)
      .maybeSingle(),
  ]);

  // The service radius is authoritative for coverage ONLY when the home base is
  // geocoded (that's when check_service_area enforces it). Otherwise leave it
  // null and fall back to the ZIP/city list.
  const ps = settings.data as
    | { base_lat: number | null; base_lng: number | null; max_service_miles: number | null }
    | null;
  const serviceRadiusMiles =
    ps && ps.base_lat != null && ps.base_lng != null ? ps.max_service_miles : null;

  const language =
    (agent.data?.language_settings as { language?: string } | null)?.language ?? null;

  // The AI's spoken service list must reflect what the business ACTUALLY
  // offers. The M4 wizard `services` table and the `service_pricing` sheet
  // can diverge, so union them (dedupe by name) — otherwise the AI only
  // "knows" the handful of services from the original wizard setup.
  const m4Services = (services.data ?? []) as PromptInput["services"];
  const pricedNames = ((pricing.data ?? []) as { name: string }[]).map((p) => p.name);
  const haveNames = new Set(
    m4Services.filter((s) => s.active).map((s) => s.name.toLowerCase())
  );
  const mergedServices = [...m4Services];
  for (const name of pricedNames) {
    if (!haveNames.has(name.toLowerCase())) {
      mergedServices.push({ id: `price:${name}`, name, description: null, active: true });
      haveNames.add(name.toLowerCase());
    }
  }

  return {
    business: {
      name: business.name,
      industry: business.industry,
      timezone: business.timezone,
    },
    services: mergedServices,
    hours: (hours.data ?? []) as PromptInput["hours"],
    areas: (areas.data ?? []) as PromptInput["areas"],
    faqs: (faqs.data ?? []) as PromptInput["faqs"],
    sms: (sms.data ?? null) as PromptInput["sms"],
    bookingEnabled: (conn.data as { status?: string } | null)?.status === "connected",
    quotingEnabled: quoting === true,
    serviceRadiusMiles,
    transferNumber: (transfer.data as { phone?: string } | null)?.phone ?? null,
    agent: {
      name: agent.data?.name ?? null,
      voiceId: agent.data?.voice_id ?? null,
      language,
      personality: agent.data?.personality ?? null,
      maxCallSeconds: agent.data?.max_call_seconds ?? null,
    },
  };
}

export type EnsureAgentResult = {
  agentId: string;
  ref: ProviderAgentRef;
  /** True when the owner turned the AI off — caller should fall back. */
  disabled: boolean;
};

/**
 * Make sure this business's provider agent exists and reflects the current
 * wizard data, then return our agents.id + provider ref. Re-syncs with the
 * provider only on first use or when the prompt hash changed (lazy sync) —
 * so live calls always use current data without wiring sync into edits.
 */
export async function ensureAgentSynced(
  admin: SupabaseClient,
  business: AgentBusiness
): Promise<EnsureAgentResult> {
  const { data: row } = await admin
    .from("agents")
    .select("id, status, provider_agent_id, provider_llm_id, prompt_hash")
    .eq("tenant_id", business.tenant_id)
    .eq("business_id", business.id)
    .limit(1)
    .maybeSingle();

  const existingRef: ProviderAgentRef | null = row?.provider_agent_id
    ? {
        providerAgentId: row.provider_agent_id,
        providerLlmId: row.provider_llm_id,
        promptHash: row.prompt_hash,
      }
    : null;

  // Owner kill switch (foundation for the M10 admin switch).
  if (row?.status === "disabled" && existingRef) {
    return { agentId: row.id, ref: existingRef, disabled: true };
  }

  const config = buildAgentConfig(await loadPromptInput(admin, business));

  // Already current — no provider call.
  if (row && existingRef && existingRef.promptHash === config.promptHash) {
    return { agentId: row.id, ref: existingRef, disabled: false };
  }

  const synced = await getVoiceProvider().syncAgent(config, existingRef);
  const ref: ProviderAgentRef = {
    providerAgentId: synced.providerAgentId,
    providerLlmId: synced.providerLlmId,
    promptHash: synced.promptHash,
  };

  if (row) {
    await admin
      .from("agents")
      .update({
        provider_agent_id: ref.providerAgentId,
        provider_llm_id: ref.providerLlmId,
        prompt_hash: ref.promptHash,
        voice_provider: "retell",
        voice_id: config.voiceId,
        status: row.status === "draft" ? "active" : row.status,
        last_synced_at: new Date().toISOString(),
      })
      .eq("id", row.id)
      .eq("tenant_id", business.tenant_id);
    return { agentId: row.id, ref, disabled: false };
  }

  const { data: created, error } = await admin
    .from("agents")
    .insert({
      tenant_id: business.tenant_id,
      business_id: business.id,
      name: config.name,
      voice_provider: "retell",
      voice_id: config.voiceId,
      provider_agent_id: ref.providerAgentId,
      provider_llm_id: ref.providerLlmId,
      prompt_hash: ref.promptHash,
      status: "active",
      max_call_seconds: config.maxCallSeconds,
      last_synced_at: new Date().toISOString(),
    })
    .select("id")
    .single();
  if (error || !created) {
    throw new Error(`Failed to create agent row: ${error?.message ?? "unknown"}`);
  }
  return { agentId: created.id, ref, disabled: false };
}
