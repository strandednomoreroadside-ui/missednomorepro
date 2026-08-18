import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { getEntitlementsWith } from "@/lib/billing/entitlements";
import { env } from "@/lib/env";

/**
 * AI Call Intelligence (`call_intelligence`, included free on every plan as
 * of July 2026). A weekly read on what the week's calls are telling the
 * business — computed from existing call/lead/job/tool data (no new infra)
 * plus one cheap LLM digest for the plain-English recommendations. Stored in
 * insight_reports; surfaced in-app on /dashboard/insights. Margin: one
 * gpt-4.1-mini call per tenant per week.
 */

const MODEL = "gpt-4.1-mini";

export type CallIntelMetrics = {
  calls: number;
  answer_rate: number; // %
  bookings: number;
  booking_rate: number; // %
  transfers: number;
  escalations: number;
  quotes: number;
  new_leads: number;
  jobs_completed: number;
  pipeline_value: number; // dollars
  revenue_collected: number; // dollars
};

const pct = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : 0);

export async function computeMetrics(
  admin: SupabaseClient,
  tenantId: string,
  sinceIso: string
): Promise<CallIntelMetrics> {
  const [{ data: calls }, { data: tools }, { data: handoffs }, { count: leadCount }, { data: leads }, { count: jobsDone }, { data: paid }] =
    await Promise.all([
      admin.from("calls").select("ai_handled, disposition").eq("tenant_id", tenantId).gte("created_at", sinceIso),
      admin.from("tool_calls").select("tool_name").eq("tenant_id", tenantId).gte("created_at", sinceIso),
      admin.from("voice_handoffs").select("outcome").eq("tenant_id", tenantId).gte("created_at", sinceIso),
      admin.from("leads").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).gte("created_at", sinceIso),
      admin.from("leads").select("status, estimated_value").eq("tenant_id", tenantId),
      admin.from("jobs").select("id", { count: "exact", head: true }).eq("tenant_id", tenantId).eq("status", "completed").gte("created_at", sinceIso),
      admin.from("payments").select("amount_cents").eq("tenant_id", tenantId).eq("status", "paid").gte("paid_at", sinceIso),
    ]);

  const c = (calls ?? []) as { ai_handled: boolean; disposition: string | null }[];
  const total = c.length;
  const aiHandled = c.filter((x) => x.ai_handled).length;
  const booked = c.filter((x) => x.disposition === "booked").length;

  const t = (tools ?? []) as { tool_name: string }[];
  const transfers = ((handoffs ?? []) as { outcome: string }[]).filter(
    (handoff) => handoff.outcome === "bridged"
  ).length;
  const escalations = t.filter((x) => x.tool_name === "escalate_to_human").length;
  const quotes = t.filter((x) => x.tool_name === "calculate_quote").length;

  const pipelineCents =
    ((leads ?? []) as { status: string; estimated_value: number | null }[])
      .filter((l) => ["quoted", "scheduled", "completed", "repeat"].includes(l.status))
      .reduce((s, l) => s + Number(l.estimated_value ?? 0), 0) * 100;
  const collected = ((paid ?? []) as { amount_cents: number }[]).reduce((s, p) => s + Number(p.amount_cents ?? 0), 0);

  return {
    calls: total,
    answer_rate: pct(aiHandled, total),
    bookings: booked,
    booking_rate: pct(booked, total),
    transfers,
    escalations,
    quotes,
    new_leads: leadCount ?? 0,
    jobs_completed: jobsDone ?? 0,
    pipeline_value: Math.round(pipelineCents / 100),
    revenue_collected: Math.round(collected / 100),
  };
}

/** One short LLM digest: 1-line summary + up to 4 recommendations. */
async function digest(
  businessName: string,
  m: CallIntelMetrics
): Promise<{ summary: string; recommendations: string[] }> {
  if (!env.OPENAI_API_KEY) {
    return { summary: "Here's your week at a glance.", recommendations: [] };
  }
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You are an operations analyst for a local service business. Given one week of metrics, return JSON {\"summary\": string (one encouraging, specific sentence), \"recommendations\": string[] (2-4 concrete, plain-English actions to book more jobs / recover missed ones)}. Use ONLY the numbers given — never invent data. Be concise and practical.",
          },
          { role: "user", content: `Business: ${businessName}\nWeekly metrics: ${JSON.stringify(m)}` },
        ],
      }),
    });
    if (!res.ok) return { summary: "Here's your week at a glance.", recommendations: [] };
    const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const parsed = JSON.parse(json.choices?.[0]?.message?.content ?? "{}") as {
      summary?: string;
      recommendations?: string[];
    };
    return {
      summary: parsed.summary ?? "Here's your week at a glance.",
      recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations.slice(0, 4) : [],
    };
  } catch (err) {
    console.error("[insights] digest failed:", err);
    return { summary: "Here's your week at a glance.", recommendations: [] };
  }
}

/** Generate + store one tenant's weekly Call Intelligence report. */
export async function generateCallIntelligence(
  admin: SupabaseClient,
  tenantId: string
): Promise<void> {
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - 7 * 86_400_000);

  const { data: business } = await admin
    .from("businesses")
    .select("id, name")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const metrics = await computeMetrics(admin, tenantId, periodStart.toISOString());
  const { summary, recommendations } = await digest((business?.name as string) ?? "your business", metrics);

  await admin.from("insight_reports").insert({
    tenant_id: tenantId,
    business_id: (business?.id as string) ?? null,
    kind: "call_intelligence",
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    payload: { metrics, summary, recommendations },
  });
}

/** Cron entry: generate weekly reports for every tenant entitled to
 *  call_intelligence — included free on every real plan now, so in practice
 *  this is every active/trialing/past_due tenant. */
export async function generateWeeklyInsights(admin: SupabaseClient): Promise<number> {
  const { data } = await admin.from("subscriptions").select("tenant_id");
  const tenantIds = [...new Set(((data ?? []) as { tenant_id: string }[]).map((r) => r.tenant_id))];
  let made = 0;
  for (const tid of tenantIds) {
    try {
      const ent = await getEntitlementsWith(admin, tid);
      if (!ent.has("call_intelligence")) continue;
      await generateCallIntelligence(admin, tid);
      made++;
    } catch (err) {
      console.error("[insights] generate failed for", tid, err);
    }
  }
  return made;
}
