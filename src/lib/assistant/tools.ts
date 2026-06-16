import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import {
  addDays,
  formatSlotLabel,
  todayInZone,
  zonedTimeToUtc,
} from "@/lib/calendar/timezone";
import { STAGE_META, type PipelineStage } from "@/lib/crm/pipeline";

/**
 * AI Business Assistant — READ-ONLY tools over the signed-in tenant's CRM.
 * The route resolves tenant/business from the session and passes them here;
 * the LLM never supplies them. Every query is tenant-scoped (RLS client +
 * explicit .eq) and only ever SELECTs — the assistant cannot mutate data.
 */

export type AssistantCtx = {
  supabase: SupabaseClient;
  tenantId: string;
  businessId: string | null;
  tz: string;
};

export const ASSISTANT_TOOLS = [
  {
    type: "function",
    function: {
      name: "get_overview",
      description:
        "Headline business metrics over the last N days: calls, AI answer rate, bookings/booking rate, new leads, open pipeline value, and revenue collected. Use for 'how are we doing', conversions, totals.",
      parameters: {
        type: "object",
        properties: {
          days: { type: "number", description: "Look-back window in days (e.g. 7 for this week, 30 default)." },
        },
        required: [],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_today_appointments",
      description: "Today's confirmed appointments (business-local), with time and customer.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "list_leads_by_stage",
      description:
        "Leads currently in a pipeline stage. Stages: new_lead, quoted (quoted but not converted), scheduled, completed, follow_up (need follow-up), repeat, lost.",
      parameters: {
        type: "object",
        properties: {
          stage: {
            type: "string",
            enum: ["new_lead", "quoted", "scheduled", "completed", "follow_up", "repeat", "lost"],
          },
        },
        required: ["stage"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_unpaid",
      description: "Outstanding (pending) payment requests that haven't been paid yet.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  {
    type: "function",
    function: {
      name: "search_contacts",
      description: "Find customers by name or phone.",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Name or phone fragment." } },
        required: ["query"],
      },
    },
  },
] as const;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;
const pct = (part: number, whole: number) =>
  whole > 0 ? `${Math.round((part / whole) * 100)}%` : "n/a";

export async function runAssistantTool(
  name: string,
  args: Record<string, unknown>,
  ctx: AssistantCtx
): Promise<unknown> {
  switch (name) {
    case "get_overview": {
      const days = Math.min(Math.max(Number(args.days) || 30, 1), 365);
      const since = new Date(Date.now() - days * 86_400_000).toISOString();
      const [{ data: calls }, { count: leadCount }, { data: leads }, { data: paid }] =
        await Promise.all([
          ctx.supabase
            .from("calls")
            .select("ai_handled, disposition")
            .eq("tenant_id", ctx.tenantId)
            .gte("created_at", since),
          ctx.supabase
            .from("leads")
            .select("id", { count: "exact", head: true })
            .eq("tenant_id", ctx.tenantId)
            .gte("created_at", since),
          ctx.supabase
            .from("leads")
            .select("status, estimated_value")
            .eq("tenant_id", ctx.tenantId),
          ctx.supabase
            .from("payments")
            .select("amount_cents")
            .eq("tenant_id", ctx.tenantId)
            .eq("status", "paid")
            .gte("paid_at", since),
        ]);
      const c = (calls ?? []) as { ai_handled: boolean; disposition: string | null }[];
      const total = c.length;
      const aiHandled = c.filter((x) => x.ai_handled).length;
      const booked = c.filter((x) => x.disposition === "booked").length;
      const pipelineCents =
        ((leads ?? []) as { status: string; estimated_value: number | null }[])
          .filter((l) => ["quoted", "scheduled", "completed", "repeat"].includes(l.status))
          .reduce((s, l) => s + Number(l.estimated_value ?? 0), 0) * 100;
      const collected = ((paid ?? []) as { amount_cents: number }[]).reduce(
        (s, p) => s + Number(p.amount_cents ?? 0),
        0
      );
      return {
        window_days: days,
        calls: total,
        ai_answer_rate: pct(aiHandled, total),
        bookings: booked,
        booking_rate: pct(booked, total),
        new_leads: leadCount ?? 0,
        open_pipeline_value: money(pipelineCents),
        revenue_collected: money(collected),
      };
    }

    case "list_today_appointments": {
      if (!ctx.businessId) return { appointments: [] };
      const t = todayInZone(ctx.tz);
      const next = addDays(t, 1);
      const dayStart = zonedTimeToUtc(t.year, t.month, t.day, 0, 0, ctx.tz).toISOString();
      const dayEnd = zonedTimeToUtc(next.year, next.month, next.day, 0, 0, ctx.tz).toISOString();
      const { data } = await ctx.supabase
        .from("appointments")
        .select("title, starts_at, status, contacts ( name )")
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "confirmed")
        .gte("starts_at", dayStart)
        .lt("starts_at", dayEnd)
        .order("starts_at", { ascending: true });
      return {
        appointments: (data ?? []).map((a) => ({
          when: formatSlotLabel(new Date(a.starts_at as string), ctx.tz),
          title: a.title,
          customer: one(a.contacts)?.name ?? null,
        })),
      };
    }

    case "list_leads_by_stage": {
      const stage = String(args.stage ?? "") as PipelineStage;
      if (!STAGE_META[stage]) return { error: "unknown stage" };
      const { data } = await ctx.supabase
        .from("leads")
        .select("service_needed, estimated_value, created_at, contacts ( name )")
        .eq("tenant_id", ctx.tenantId)
        .eq("status", stage)
        .order("created_at", { ascending: false })
        .limit(25);
      return {
        stage: STAGE_META[stage].label,
        count: data?.length ?? 0,
        leads: (data ?? []).map((l) => ({
          customer: one(l.contacts)?.name ?? null,
          service: l.service_needed,
          value: l.estimated_value != null ? `$${Number(l.estimated_value).toLocaleString()}` : null,
          age_days: Math.floor((Date.now() - new Date(l.created_at as string).getTime()) / 86_400_000),
        })),
      };
    }

    case "list_unpaid": {
      const { data } = await ctx.supabase
        .from("payments")
        .select("amount_cents, description, created_at, contacts ( name )")
        .eq("tenant_id", ctx.tenantId)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(25);
      return {
        count: data?.length ?? 0,
        unpaid: (data ?? []).map((p) => ({
          customer: one(p.contacts)?.name ?? null,
          amount: money(Number(p.amount_cents)),
          for: p.description,
          age_days: Math.floor((Date.now() - new Date(p.created_at as string).getTime()) / 86_400_000),
        })),
      };
    }

    case "search_contacts": {
      const q = String(args.query ?? "").trim();
      if (!q) return { contacts: [] };
      const { data } = await ctx.supabase
        .from("contacts")
        .select("name, phone, tags, created_at")
        .eq("tenant_id", ctx.tenantId)
        .or(`name.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(10);
      return {
        contacts: (data ?? []).map((c) => ({
          name: c.name,
          phone: c.phone,
          tags: c.tags,
        })),
      };
    }

    default:
      return { error: `unknown tool: ${name}` };
  }
}

function one<T>(v: T | T[] | null | undefined): T | null {
  return Array.isArray(v) ? (v[0] ?? null) : (v ?? null);
}
