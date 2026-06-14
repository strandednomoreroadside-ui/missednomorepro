import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { formatUsPhone, normalizeUsPhone } from "@/lib/phone";
import { placeStaffVoiceCall } from "@/lib/twilio/calls";

import type { VoiceToolName } from "./registry";

/**
 * Tool execution context. Built by the route from OUR call row — the
 * tenant is never taken from the AI's arguments (master plan §9, §10:
 * every tool tenant-scoped + server-validated). The AI can't reach
 * another tenant even if prompt-injected.
 */
export interface ToolContext {
  admin: SupabaseClient;
  tenantId: string;
  businessId: string | null;
  /** Our calls.id (uuid), not the provider's call id. */
  callId: string;
  contactId: string | null;
  /** Caller's E.164 number. */
  fromNumber: string;
  businessName: string;
}

export interface ToolResult {
  status: "ok" | "error" | "blocked";
  data: Record<string, unknown>;
  error?: string;
}

export interface ToolImpl {
  run(ctx: ToolContext, rawArgs: unknown): Promise<ToolResult>;
}

/** Wrap a handler with zod validation so bad AI args fail safe (blocked,
 *  with a message the LLM can recover from) rather than hitting the DB. */
function defineTool<S extends z.ZodType>(
  schema: S,
  handler: (ctx: ToolContext, args: z.infer<S>) => Promise<ToolResult>
): ToolImpl {
  return {
    async run(ctx, rawArgs) {
      const parsed = schema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        return {
          status: "blocked",
          data: {},
          error: `invalid arguments: ${parsed.error.issues
            .map((i) => `${i.path.join(".") || "_"}: ${i.message}`)
            .join("; ")}`,
        };
      }
      return handler(ctx, parsed.data);
    },
  };
}

/** Set the call disposition only if it hasn't been decided yet (so an
 *  earlier mark_spam/escalate isn't clobbered by a later notify_staff). */
async function setDispositionIfEmpty(ctx: ToolContext, disposition: string) {
  await ctx.admin
    .from("calls")
    .update({ disposition })
    .eq("id", ctx.callId)
    .eq("tenant_id", ctx.tenantId)
    .is("disposition", null);
}

/** Authoritative disposition (mark_spam / escalate override anything). */
async function setDisposition(ctx: ToolContext, disposition: string) {
  await ctx.admin
    .from("calls")
    .update({ disposition })
    .eq("id", ctx.callId)
    .eq("tenant_id", ctx.tenantId);
}

async function linkCallToContact(ctx: ToolContext, contactId: string) {
  await ctx.admin
    .from("calls")
    .update({ contact_id: contactId })
    .eq("id", ctx.callId)
    .eq("tenant_id", ctx.tenantId);
}

/** Staff who should hear about new leads for this business. */
async function notifyOnLeadStaff(ctx: ToolContext): Promise<{ name: string; phone: string }[]> {
  let q = ctx.admin
    .from("staff_contacts")
    .select("name, phone")
    .eq("tenant_id", ctx.tenantId)
    .eq("notify_on_lead", true);
  if (ctx.businessId) q = q.eq("business_id", ctx.businessId);
  const { data } = await q;
  return data ?? [];
}

// ── Tool implementations ───────────────────────────────────────

const lookupContact = defineTool(
  z.object({ phone: z.string().optional() }),
  async (ctx, args) => {
    const phone = normalizeUsPhone(args.phone ?? "") ?? ctx.fromNumber;
    const { data: contact } = await ctx.admin
      .from("contacts")
      .select("id, name, consent_sms, tags")
      .eq("tenant_id", ctx.tenantId)
      .eq("phone", phone)
      .maybeSingle();

    if (!contact) return { status: "ok", data: { found: false } };

    if (!ctx.contactId) await linkCallToContact(ctx, contact.id);

    const { data: lead } = await ctx.admin
      .from("leads")
      .select("service_needed, status")
      .eq("tenant_id", ctx.tenantId)
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { count: openTasks } = await ctx.admin
      .from("follow_up_tasks")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", ctx.tenantId)
      .eq("contact_id", contact.id)
      .eq("status", "open");

    return {
      status: "ok",
      data: {
        found: true,
        contact_id: contact.id,
        name: contact.name,
        is_returning: true,
        consent_sms: contact.consent_sms,
        tags: contact.tags ?? [],
        last_need: lead?.service_needed ?? null,
        open_tasks: openTasks ?? 0,
      },
    };
  }
);

const createContact = defineTool(
  z.object({
    name: z.string().min(1).max(160),
    phone: z.string().optional(),
    need: z.string().max(500).optional(),
    address: z.string().max(500).optional(),
    email: z.string().max(320).optional(),
    sms_consent: z.boolean().optional(),
  }),
  async (ctx, args) => {
    const phone = normalizeUsPhone(args.phone ?? "") ?? ctx.fromNumber;
    const consentPatch =
      args.sms_consent === true
        ? {
            consent_sms: true,
            consent_source: "voice_call",
            consent_timestamp: new Date().toISOString(),
          }
        : {};

    const { data: existing } = await ctx.admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("phone", phone)
      .maybeSingle();

    let contactId: string;
    if (existing) {
      const patch: Record<string, unknown> = { name: args.name, ...consentPatch };
      if (args.address) patch.address = args.address;
      if (args.email) patch.email = args.email;
      await ctx.admin
        .from("contacts")
        .update(patch)
        .eq("id", existing.id)
        .eq("tenant_id", ctx.tenantId);
      contactId = existing.id;
    } else {
      const { data: created, error } = await ctx.admin
        .from("contacts")
        .insert({
          tenant_id: ctx.tenantId,
          name: args.name,
          phone,
          address: args.address ?? null,
          email: args.email ?? null,
          ...consentPatch,
        })
        .select("id")
        .single();
      if (error) return { status: "error", data: {}, error: error.message };
      contactId = created.id;
    }

    await linkCallToContact(ctx, contactId);

    let leadId: string | null = null;
    if (args.need) {
      const { data: lead } = await ctx.admin
        .from("leads")
        .insert({
          tenant_id: ctx.tenantId,
          contact_id: contactId,
          source: "call",
          status: "new",
          service_needed: args.need,
        })
        .select("id")
        .single();
      leadId = lead?.id ?? null;
    }

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.create_contact",
      entityType: "contact",
      entityId: contactId,
      metadata: { callId: ctx.callId, createdLead: leadId !== null },
    });

    return {
      status: "ok",
      data: { contact_id: contactId, lead_id: leadId, created: !existing },
    };
  }
);

const searchKnowledgeBase = defineTool(
  z.object({ query: z.string().min(1).max(500) }),
  async (ctx, args) => {
    let q = ctx.admin
      .from("faqs")
      .select("question, answer")
      .eq("tenant_id", ctx.tenantId)
      .eq("active", true);
    if (ctx.businessId) q = q.eq("business_id", ctx.businessId);
    const { data: faqs } = await q;
    if (!faqs?.length) return { status: "ok", data: { results: [], count: 0 } };

    const tokens = new Set(
      args.query
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length > 2)
    );
    const scored = faqs
      .map((f) => {
        const text = `${f.question} ${f.answer}`.toLowerCase();
        let score = 0;
        for (const t of tokens) if (text.includes(t)) score += 1;
        return { question: f.question, answer: f.answer, score };
      })
      .filter((f) => f.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);

    return {
      status: "ok",
      data: {
        results: scored.map(({ question, answer }) => ({ question, answer })),
        count: scored.length,
      },
    };
  }
);

const checkServiceArea = defineTool(
  z.object({
    zip: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
  }),
  async (ctx, args) => {
    const zip = args.zip ? args.zip.replace(/\D/g, "").slice(0, 5) : null;
    const city = args.city ? args.city.trim().toLowerCase() : null;
    if (!zip && !city) {
      return { status: "ok", data: { covered: false, reason: "no zip or city provided" } };
    }

    let q = ctx.admin
      .from("service_areas")
      .select("type, zip_code, city")
      .eq("tenant_id", ctx.tenantId)
      .eq("active", true);
    if (ctx.businessId) q = q.eq("business_id", ctx.businessId);
    const { data: areas } = await q;

    let covered = false;
    let matchedBy: "zip" | "city" | null = null;
    for (const a of areas ?? []) {
      if (zip && a.type === "zip" && a.zip_code === zip) {
        covered = true;
        matchedBy = "zip";
        break;
      }
      if (city && a.type === "city" && a.city && a.city.toLowerCase() === city) {
        covered = true;
        matchedBy = "city";
        break;
      }
    }
    return { status: "ok", data: { covered, matched_by: matchedBy } };
  }
);

const notifyStaff = defineTool(
  z.object({
    summary: z.string().min(1).max(500),
    urgency: z.enum(["normal", "high", "emergency"]).optional(),
    callback_number: z.string().optional(),
  }),
  async (ctx, args) => {
    const urgency = args.urgency ?? "normal";
    const callback = normalizeUsPhone(args.callback_number ?? "") ?? ctx.fromNumber;
    const staff = await notifyOnLeadStaff(ctx);

    await setDispositionIfEmpty(ctx, "lead");
    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.notify_staff",
      entityType: "call",
      entityId: ctx.callId,
      metadata: { urgency, staffCount: staff.length },
    });

    if (staff.length === 0) {
      return { status: "ok", data: { notified: false, reason: "no staff configured" } };
    }

    const prefix = urgency === "emergency" ? "Urgent new lead" : "New lead";
    const message =
      `${prefix} for ${ctx.businessName}. ${args.summary}. ` +
      `Call them back at ${formatUsPhone(callback)}.`;

    let placed = 0;
    for (const s of staff) {
      if (await placeStaffVoiceCall({ to: s.phone, message })) placed += 1;
    }
    return {
      status: "ok",
      data: { notified: placed > 0, staff_count: staff.length, calls_placed: placed },
    };
  }
);

const escalateToHuman = defineTool(
  z.object({
    reason: z.string().min(1).max(300),
    summary: z.string().max(500).optional(),
  }),
  async (ctx, args) => {
    const summary = args.summary ?? args.reason;

    const { data: task } = await ctx.admin
      .from("follow_up_tasks")
      .insert({
        tenant_id: ctx.tenantId,
        business_id: ctx.businessId,
        contact_id: ctx.contactId,
        call_id: ctx.callId,
        type: "escalation",
        title: `Escalation: ${args.reason}`.slice(0, 200),
        details: summary,
        priority: "urgent",
        source: "ai",
      })
      .select("id")
      .single();

    await setDisposition(ctx, "escalated");

    const staff = await notifyOnLeadStaff(ctx);
    const message =
      `Urgent: a caller to ${ctx.businessName} needs a person. ${summary}. ` +
      `Call them at ${formatUsPhone(ctx.fromNumber)}.`;
    let placed = 0;
    for (const s of staff) {
      if (await placeStaffVoiceCall({ to: s.phone, message })) placed += 1;
    }

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.escalate_to_human",
      entityType: "call",
      entityId: ctx.callId,
      metadata: { reason: args.reason, staffCount: staff.length },
    });

    return {
      status: "ok",
      data: { escalated: true, task_id: task?.id ?? null, calls_placed: placed },
    };
  }
);

const markSpam = defineTool(
  z.object({ reason: z.string().max(300).optional() }),
  async (ctx, args) => {
    await setDisposition(ctx, "spam");
    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.mark_spam",
      entityType: "call",
      entityId: ctx.callId,
      metadata: { reason: args.reason ?? null },
    });
    return { status: "ok", data: { ok: true } };
  }
);

const createFollowUpTask = defineTool(
  z.object({
    type: z.enum(["quote_request", "callback", "general"]),
    title: z.string().min(1).max(200),
    details: z.string().max(2000).optional(),
  }),
  async (ctx, args) => {
    const { data: task, error } = await ctx.admin
      .from("follow_up_tasks")
      .insert({
        tenant_id: ctx.tenantId,
        business_id: ctx.businessId,
        contact_id: ctx.contactId,
        call_id: ctx.callId,
        type: args.type,
        title: args.title,
        details: args.details ?? null,
        source: "ai",
      })
      .select("id")
      .single();
    if (error) return { status: "error", data: {}, error: error.message };

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.create_follow_up_task",
      entityType: "follow_up_task",
      entityId: task.id,
      metadata: { type: args.type },
    });
    return { status: "ok", data: { task_id: task.id } };
  }
);

export const TOOLS: Record<VoiceToolName, ToolImpl> = {
  lookup_contact: lookupContact,
  create_contact: createContact,
  search_knowledge_base: searchKnowledgeBase,
  check_service_area: checkServiceArea,
  notify_staff: notifyStaff,
  escalate_to_human: escalateToHuman,
  mark_spam: markSpam,
  create_follow_up_task: createFollowUpTask,
};
