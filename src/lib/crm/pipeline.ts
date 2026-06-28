import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { emitWebhookEvent } from "@/lib/webhooks";

/**
 * Lead pipeline (vision stages). The AI auto-advances a lead as it quotes,
 * books, and as jobs complete; staff move it manually on the board.
 */
export const PIPELINE_STAGES = [
  "new_lead",
  "quoted",
  "scheduled",
  "completed",
  "repeat",
  "follow_up",
  "lost",
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export function isPipelineStage(v: string): v is PipelineStage {
  return (PIPELINE_STAGES as readonly string[]).includes(v);
}

export const STAGE_META: Record<
  PipelineStage,
  { label: string; className: string }
> = {
  new_lead: { label: "New Lead", className: "border-cyan/30 text-cyan" },
  quoted: { label: "Quoted", className: "border-blue-400/40 text-blue-400" },
  scheduled: { label: "Scheduled", className: "border-amber-400/40 text-amber-400" },
  completed: { label: "Completed", className: "border-success/40 text-success" },
  repeat: { label: "Repeat Customer", className: "border-success/50 text-success" },
  follow_up: { label: "Follow-Up", className: "border-amber-500/40 text-amber-500" },
  lost: { label: "Lost", className: "border-border/70 text-steel" },
};

/** Funnel order for forward-only advancement. Side states (follow_up, lost)
 *  are not ranked — they're set explicitly, never via auto-advance. */
const FUNNEL_RANK: Partial<Record<PipelineStage, number>> = {
  new_lead: 0,
  quoted: 1,
  scheduled: 2,
  completed: 3,
  repeat: 4,
};

/** Columns shown on the kanban board, in order. */
export const BOARD_STAGES: PipelineStage[] = [
  "new_lead",
  "quoted",
  "scheduled",
  "completed",
  "repeat",
  "follow_up",
];

/**
 * Move the caller's most recent open lead to `toStage`. Forward-only for
 * funnel stages (never demotes); side states (follow_up) are always set.
 * Best-effort — never throws into a voice tool. No-op without a contact.
 */
export async function advanceLead(
  admin: SupabaseClient,
  tenantId: string,
  contactId: string | null,
  toStage: PipelineStage,
  fields?: { service?: string | null; estimatedValue?: number | null }
): Promise<void> {
  if (!contactId) return;
  try {
    const { data: lead } = await admin
      .from("leads")
      .select("id, status")
      .eq("tenant_id", tenantId)
      .eq("contact_id", contactId)
      .neq("status", "lost")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const patch: Record<string, unknown> = { status: toStage };
    if (fields?.service) patch.service_needed = fields.service;
    if (fields?.estimatedValue != null) patch.estimated_value = fields.estimatedValue;

    if (!lead) {
      const { data: created } = await admin
        .from("leads")
        .insert({
          tenant_id: tenantId,
          contact_id: contactId,
          source: "call",
          ...patch,
        })
        .select("id")
        .maybeSingle();
      // Outbound webhook (integration escape hatch) — only if subscribed.
      await emitWebhookEvent({
        tenantId,
        event: "lead.created",
        data: {
          lead_id: (created as { id?: string } | null)?.id ?? null,
          contact_id: contactId,
          service_needed: fields?.service ?? null,
          source: "call",
          stage: toStage,
        },
      });
      return;
    }

    // Forward-only for funnel stages; side states always apply.
    const toRank = FUNNEL_RANK[toStage];
    const fromRank = FUNNEL_RANK[lead.status as PipelineStage];
    if (toRank != null && fromRank != null && toRank <= fromRank) {
      // Still allow updating value/service without demoting the stage.
      delete patch.status;
      if (Object.keys(patch).length === 0) return;
    }

    await admin
      .from("leads")
      .update(patch)
      .eq("id", lead.id)
      .eq("tenant_id", tenantId);
  } catch (err) {
    console.error("[pipeline] advanceLead failed:", err);
  }
}
