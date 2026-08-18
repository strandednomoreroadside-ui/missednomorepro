import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { advanceLead } from "@/lib/crm/pipeline";
import { enqueueFollowup } from "@/lib/sms/outbound-engine";
import { emitWebhookEvent } from "@/lib/webhooks";
import {
  computeAvailableSlots,
  isWithinBusinessHours,
  DEFAULT_AVAILABILITY,
  type BusyInterval,
  type HoursRow,
} from "@/lib/calendar/availability";
import {
  addDays,
  formatSlotLabel,
  getZonedParts,
  parseDateString,
  parseTimeString,
  todayInZone,
  zonedTimeToUtc,
} from "@/lib/calendar/timezone";
import { deleteEvent, freeBusy, insertEvent } from "@/lib/google/calendar";
import { getConnection, getValidAccessToken, isConnected } from "@/lib/google/connection";
import {
  drivingDistanceMiles,
  drivingDistanceMilesMulti,
  findNearbyPlaces,
  geocodeAddress,
  isMapsConfigured,
} from "@/lib/maps/client";
import { formatUsPhone, normalizeUsPhone } from "@/lib/phone";
import { calculateQuote, type QuoteResult, type ServicePrice } from "@/lib/pricing/engine";
import { bundleQuotingEnabled, loadPricing } from "@/lib/pricing/loader";
import { sendCustomerSms, sendStaffSms } from "@/lib/sms/outbound";

import { recordHumanEscalation } from "../escalation";
import { startVoiceHandoff } from "../handoff";
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
  /** Channel this tool call originated from. Voice keeps the call path
   *  byte-for-byte identical; sms/web/email run the same tools without a call. */
  channel: "voice" | "sms" | "web" | "email";
  /** Our calls.id (uuid) for voice; null/absent for chat channels. */
  callId?: string | null;
  /** Our conversations.id (uuid) for chat; null/absent for voice. */
  conversationId?: string | null;
  contactId: string | null;
  /** Caller's E.164 number (voice/sms). May be empty for web chat. */
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
  if (!ctx.callId) return; // chat channels have no call row
  await ctx.admin
    .from("calls")
    .update({ disposition })
    .eq("id", ctx.callId)
    .eq("tenant_id", ctx.tenantId)
    .is("disposition", null);
}

/** Authoritative disposition (mark_spam / escalate override anything). */
async function setDisposition(ctx: ToolContext, disposition: string) {
  if (!ctx.callId) return; // chat channels have no call row
  await ctx.admin
    .from("calls")
    .update({ disposition })
    .eq("id", ctx.callId)
    .eq("tenant_id", ctx.tenantId);
}

async function linkCallToContact(ctx: ToolContext, contactId: string) {
  if (!ctx.callId) return; // nothing to link on chat channels
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

/** "2018 Ford F-150" (or "") for the current call — captured via
 *  create_contact's vehicle_year/make/model args. Empty on chat channels
 *  (no call row) or when the AI never captured a vehicle this call. */
async function getVehicleLine(ctx: ToolContext): Promise<string> {
  if (!ctx.callId) return "";
  const { data } = await ctx.admin
    .from("calls")
    .select("vehicle_year, vehicle_make, vehicle_model")
    .eq("id", ctx.callId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  const parts = [data?.vehicle_year, data?.vehicle_make, data?.vehicle_model].filter(Boolean);
  return parts.length ? parts.join(" ") : "";
}

// ── Tool implementations ───────────────────────────────────────

const lookupContact = defineTool(
  z.object({ phone: z.string().optional() }),
  async (ctx, args) => {
    const phone = normalizeUsPhone(args.phone ?? "") ?? ctx.fromNumber;
    const { data: contact } = await ctx.admin
      .from("contacts")
      .select("id, name, consent_sms, tags, vehicle_year, vehicle_make, vehicle_model")
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

    const vehicleParts = [contact.vehicle_year, contact.vehicle_make, contact.vehicle_model].filter(
      Boolean
    );

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
        last_vehicle: vehicleParts.length ? vehicleParts.join(" ") : null,
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
    vehicle_year: z.string().max(20).optional(),
    vehicle_make: z.string().max(60).optional(),
    vehicle_model: z.string().max(60).optional(),
    sms_consent: z.boolean().optional(),
  }),
  async (ctx, args) => {
    const phone = normalizeUsPhone(args.phone ?? "") ?? ctx.fromNumber;
    const vehiclePatch: Record<string, unknown> = {};
    if (args.vehicle_year) vehiclePatch.vehicle_year = args.vehicle_year;
    if (args.vehicle_make) vehiclePatch.vehicle_make = args.vehicle_make;
    if (args.vehicle_model) vehiclePatch.vehicle_model = args.vehicle_model;
    const consentPatch =
      args.sms_consent === true
        ? {
            consent_sms: true,
            consent_source: "voice_call",
            consent_timestamp: new Date().toISOString(),
          }
        : args.sms_consent === false
          ? {
              consent_sms: false,
              consent_source: "voice_call_optout",
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
      const patch: Record<string, unknown> = { name: args.name, ...consentPatch, ...vehiclePatch };
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
          ...vehiclePatch,
        })
        .select("id")
        .single();
      if (error) return { status: "error", data: {}, error: error.message };
      contactId = created.id;
    }

    await linkCallToContact(ctx, contactId);

    // Mirror the vehicle onto THIS call row too (source of truth for dispatch
    // — a returning caller may be calling about a different vehicle than the
    // one on file, so the per-call value is what notify_staff/dispatch read).
    if (ctx.callId && Object.keys(vehiclePatch).length > 0) {
      await ctx.admin
        .from("calls")
        .update(vehiclePatch)
        .eq("id", ctx.callId)
        .eq("tenant_id", ctx.tenantId);
    }

    // Keep the STOP suppression list in sync with an explicit voice opt-out/
    // opt-in, so even transactional sends (the missed-call text-back) honor it.
    if (args.sms_consent === false) {
      await ctx.admin
        .from("sms_suppressions")
        .upsert(
          { tenant_id: ctx.tenantId, phone, reason: "manual" },
          { onConflict: "tenant_id,phone", ignoreDuplicates: true }
        );
    } else if (args.sms_consent === true) {
      // A verbal "yes, text me" can clear a voice/manual opt-out, but it must
      // NOT override a texted/carrier STOP (§5.1: STOP always wins — the caller
      // re-opts in by texting START). Only lift non-"stop" suppressions here.
      await ctx.admin
        .from("sms_suppressions")
        .delete()
        .eq("tenant_id", ctx.tenantId)
        .eq("phone", phone)
        .neq("reason", "stop");
    }

    let leadId: string | null = null;
    if (args.need) {
      const { data: lead } = await ctx.admin
        .from("leads")
        .insert({
          tenant_id: ctx.tenantId,
          contact_id: contactId,
          source: "call",
          status: "new_lead",
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
    const city = args.city ? args.city.trim() : null;
    const state = args.state ? args.state.trim() : null;
    if (!zip && !city) {
      return { status: "ok", data: { covered: false, reason: "no zip or city provided" } };
    }

    // Radius mode (preferred): is the location within max_service_miles of
    // the business's home base? One Distance Matrix lookup; the API geocodes
    // the city/zip for us.
    const business = await resolveBusiness(ctx);
    if (business) {
      const { data: ps } = await ctx.admin
        .from("pricing_settings")
        .select("base_lat, base_lng, max_service_miles")
        .eq("business_id", business.id)
        .maybeSingle();
      if (ps?.base_lat != null && ps?.base_lng != null) {
        const radius = (ps.max_service_miles as number | null) ?? 25;
        const dest = [city ? `${city}${state ? `, ${state}` : ""}` : null, zip]
          .filter(Boolean)
          .join(" ");
        const miles = await drivingDistanceMiles(
          { lat: ps.base_lat as number, lng: ps.base_lng as number, formatted: "" },
          dest
        );
        if (miles != null) {
          return {
            status: "ok",
            data: {
              covered: miles <= radius,
              miles: Math.round(miles * 10) / 10,
              radius_miles: radius,
              matched_by: "radius",
            },
          };
        }
        // The business runs in radius mode (a home base is set) but the
        // distance lookup failed — a Maps key/quota hiccup. Falling back to the
        // near-empty ZIP list here would wrongly decline in-radius callers and
        // lose real leads (a false "out of area" is a customer lost at the
        // door; a false "you're covered" is recoverable by staff). So fail
        // SAFE: assume covered and let staff confirm.
        return {
          status: "ok",
          data: { covered: true, radius_miles: radius, matched_by: "radius_unverified" },
        };
      }
    }

    // No home base configured → the legacy ZIP/city allowlist is the only signal.
    let q = ctx.admin
      .from("service_areas")
      .select("type, zip_code, city")
      .eq("tenant_id", ctx.tenantId)
      .eq("active", true);
    if (ctx.businessId) q = q.eq("business_id", ctx.businessId);
    const { data: areas } = await q;

    const cityLc = city ? city.toLowerCase() : null;
    let covered = false;
    let matchedBy: "zip" | "city" | null = null;
    for (const a of areas ?? []) {
      if (zip && a.type === "zip" && a.zip_code === zip) {
        covered = true;
        matchedBy = "zip";
        break;
      }
      if (cityLc && a.type === "city" && a.city && a.city.toLowerCase() === cityLc) {
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
      entityId: ctx.callId ?? undefined,
      metadata: { urgency, staffCount: staff.length },
    });

    if (staff.length === 0) {
      return { status: "ok", data: { notified: false, reason: "no staff configured" } };
    }

    const vehicleLine = await getVehicleLine(ctx);
    const prefix = urgency === "emergency" ? "URGENT lead" : "New lead";
    const body =
      `${prefix} - ${ctx.businessName}. ${args.summary} ` +
      `${vehicleLine ? `Vehicle: ${vehicleLine}. ` : ""}` +
      `Call back: ${formatUsPhone(callback)}`;

    let sent = 0;
    for (const s of staff) {
      const r = await sendStaffSms(ctx.admin, {
        tenantId: ctx.tenantId,
        businessId: ctx.businessId,
        toPhone: s.phone,
        body,
      });
      if (r.sent) sent += 1;
    }

    // Immediate "come now" dispatch (urgency high/emergency, phone calls only):
    // open a dispatch job and text the CUSTOMER a confirmation + arrival ETA.
    let dispatch: Record<string, unknown> | null = null;
    if ((urgency === "high" || urgency === "emergency") && ctx.channel === "voice" && ctx.callId) {
      dispatch = await dispatchEtaToCustomer(ctx, args.summary);
    }

    return {
      status: "ok",
      data: { notified: sent > 0, staff_count: staff.length, sent, ...(dispatch ? { dispatch } : {}) },
    };
  }
);

const escalateToHuman = defineTool(
  z.object({
    reason: z.string().min(1).max(300),
    summary: z.string().max(500).optional(),
    urgency: z.enum(["normal", "emergency"]).optional(),
  }),
  async (ctx, args) => {
    const summary = args.summary ?? args.reason;
    const handoff = await startVoiceHandoff({
      admin: ctx.admin,
      tenantId: ctx.tenantId,
      businessId: ctx.businessId,
      callId: ctx.callId ?? null,
      businessName: ctx.businessName,
      callerNumber: ctx.fromNumber,
      reason: args.reason,
      summary,
      mode: args.urgency === "emergency" ? "emergency" : "normal",
    });

    if (handoff.kind === "started" || handoff.kind === "already_started") {
      await setDisposition(ctx, "escalated");
      await logAudit({
        tenantId: ctx.tenantId,
        action: "voice.tool.escalate_to_human.live_handoff",
        entityType: "call",
        entityId: ctx.callId ?? undefined,
        metadata: { reason: args.reason, mode: args.urgency ?? "normal", handoffId: handoff.handoffId },
      });
      return { status: "ok", data: { live_handoff: true, handoff_id: handoff.handoffId } };
    }

    // The caller has already left the AI SIP leg for a Twilio fallback and
    // the system-side task/SMS was recorded only after the recipient attempt.
    if (handoff.kind === "fallback_started") {
      return {
        status: "ok",
        data: { live_handoff: false, fallback_started: true, handoff_id: handoff.handoffId },
      };
    }

    const fallback = await recordHumanEscalation({
      admin: ctx.admin,
      tenantId: ctx.tenantId,
      businessId: ctx.businessId,
      contactId: ctx.contactId,
      callId: ctx.callId ?? null,
      businessName: ctx.businessName,
      fromNumber: ctx.fromNumber,
      reason: args.reason,
      summary,
    });

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.escalate_to_human",
      entityType: "call",
      entityId: ctx.callId ?? undefined,
      metadata: { reason: args.reason, handoffFallback: handoff.kind, handoffReason: handoff.reason },
    });

    return {
      status: "ok",
      data: { escalated: true, task_id: fallback.taskId, sent: fallback.sent, live_handoff: false },
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
      entityId: ctx.callId ?? undefined,
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
        call_id: ctx.callId ?? null,
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

const sendSmsTool = defineTool(
  z.object({ message: z.string().min(1).max(600) }),
  async (ctx, args) => {
    const res = await sendCustomerSms(ctx.admin, {
      tenantId: ctx.tenantId,
      businessId: ctx.businessId,
      contactId: ctx.contactId,
      toPhone: ctx.fromNumber,
      body: args.message,
      kind: "reply",
      requireConsent: true,
    });
    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.send_sms",
      entityType: "contact",
      entityId: ctx.contactId ?? undefined,
      metadata: { sent: res.sent, blocked: res.blocked, reason: res.reason ?? null },
    });
    if (res.blocked) {
      const why =
        res.reason === "suppressed"
          ? "the caller has opted out of texts"
          : "the caller hasn't agreed to texts";
      return { status: "blocked", data: { sent: false }, error: why };
    }
    return {
      status: res.sent ? "ok" : "error",
      data: { sent: res.sent },
      error: res.sent ? undefined : res.reason,
    };
  }
);

// ── M9 booking helpers ─────────────────────────────────────────

/** Resolve the business (id + timezone) for this call. */
async function resolveBusiness(
  ctx: ToolContext
): Promise<{ id: string; timezone: string } | null> {
  if (ctx.businessId) {
    const { data } = await ctx.admin
      .from("businesses")
      .select("id, timezone")
      .eq("id", ctx.businessId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    if (data) {
      return { id: data.id as string, timezone: (data.timezone as string) || "America/New_York" };
    }
  }
  const { data } = await ctx.admin
    .from("businesses")
    .select("id, timezone")
    .eq("tenant_id", ctx.tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return data
    ? { id: data.id as string, timezone: (data.timezone as string) || "America/New_York" }
    : null;
}

async function loadHours(ctx: ToolContext, businessId: string): Promise<HoursRow[]> {
  const { data } = await ctx.admin
    .from("business_hours")
    .select("day_of_week, closed, opens_at, closes_at")
    .eq("business_id", businessId);
  return (data ?? []) as HoursRow[];
}

/** Confirmed appointments overlapping [fromIso, toIso) as busy intervals. */
async function dbBusy(
  ctx: ToolContext,
  businessId: string,
  fromIso: string,
  toIso: string
): Promise<BusyInterval[]> {
  const { data } = await ctx.admin
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("tenant_id", ctx.tenantId)
    .eq("business_id", businessId)
    .eq("status", "confirmed")
    .lt("starts_at", toIso)
    .gt("ends_at", fromIso);
  return (data ?? []).map((r) => ({
    start: new Date(r.starts_at as string),
    end: new Date(r.ends_at as string),
  }));
}

/** Use the linked contact, else find/create by phone (for booking). */
async function ensureContactForBooking(
  ctx: ToolContext,
  name?: string,
  phone?: string
): Promise<string | null> {
  if (ctx.contactId) return ctx.contactId;
  const p = normalizeUsPhone(phone ?? "") ?? ctx.fromNumber;
  if (p) {
    const { data: existing } = await ctx.admin
      .from("contacts")
      .select("id")
      .eq("tenant_id", ctx.tenantId)
      .eq("phone", p)
      .maybeSingle();
    if (existing) {
      await linkCallToContact(ctx, existing.id);
      return existing.id;
    }
  }
  if (!name) return null;
  const { data: created } = await ctx.admin
    .from("contacts")
    .insert({ tenant_id: ctx.tenantId, name, phone: p })
    .select("id")
    .single();
  if (created) {
    await linkCallToContact(ctx, created.id);
    return created.id;
  }
  return null;
}

function ymd(d: { year: number; month: number; day: number }): string {
  return `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
}

/**
 * Send the booking/reschedule confirmation text (transactional — the caller
 * asked to book, so consent isn't required; STOP still wins). Resolves the
 * customer's number from their contact record so web/email bookings confirm
 * too, falling back to the caller's number. Shared by book + reschedule.
 */
async function sendBookingConfirmation(
  ctx: ToolContext,
  businessId: string,
  contactId: string | null,
  label: string
): Promise<boolean> {
  if (!contactId) return false;
  const { data: smsSettings } = await ctx.admin
    .from("sms_settings")
    .select("booking_confirmation_template")
    .eq("business_id", businessId)
    .maybeSingle();
  const template =
    (smsSettings?.booking_confirmation_template as string | undefined) ??
    "You're booked with {business} for {time}. Reply STOP to opt out.";
  const body = template.replaceAll("{business}", ctx.businessName).replaceAll("{time}", label);

  const { data: contact } = await ctx.admin
    .from("contacts")
    .select("phone")
    .eq("id", contactId)
    .eq("tenant_id", ctx.tenantId)
    .maybeSingle();
  const toPhone = normalizeUsPhone((contact?.phone as string | null) ?? "") ?? ctx.fromNumber;
  if (!toPhone) return false;

  const res = await sendCustomerSms(ctx.admin, {
    tenantId: ctx.tenantId,
    businessId,
    contactId,
    toPhone,
    body,
    kind: "confirmation",
    requireConsent: false,
  });
  return res.sent;
}

const checkCalendarAvailability = defineTool(
  z.object({
    date: z.string().min(1).max(20),
    preferred_time: z.string().max(10).optional(),
  }),
  async (ctx, args) => {
    const business = await resolveBusiness(ctx);
    if (!business) return { status: "error", data: {}, error: "no business configured" };
    const tz = business.timezone;

    const raw = args.date.trim().toLowerCase();
    let target: { year: number; month: number; day: number };
    if (raw === "today") target = todayInZone(tz);
    else if (raw === "tomorrow") target = addDays(todayInZone(tz), 1);
    else {
      const parsed = parseDateString(args.date);
      if (!parsed) {
        return {
          status: "blocked",
          data: {},
          error: "date must be YYYY-MM-DD, 'today', or 'tomorrow'",
        };
      }
      target = parsed;
    }

    const preferredTime = args.preferred_time ? parseTimeString(args.preferred_time) : null;
    const hours = await loadHours(ctx, business.id);

    // Fetch busy across the whole horizon (not just the requested day) so we can
    // roll forward to the next open day when the requested one is full or already
    // past — instead of dead-ending on "no availability".
    const today = todayInZone(tz);
    const horizonEnd = addDays(today, DEFAULT_AVAILABILITY.horizonDays + 1);
    const windowStart = zonedTimeToUtc(today.year, today.month, today.day, 0, 0, tz);
    const windowEnd = zonedTimeToUtc(horizonEnd.year, horizonEnd.month, horizonEnd.day, 0, 0, tz);

    const busy = await dbBusy(ctx, business.id, windowStart.toISOString(), windowEnd.toISOString());

    const conn = await getConnection(ctx.admin, ctx.tenantId, business.id);
    if (conn && isConnected(conn)) {
      const token = await getValidAccessToken(ctx.admin, conn);
      if (token) {
        try {
          const gb = await freeBusy(
            token,
            conn.google_calendar_id,
            windowStart.toISOString(),
            windowEnd.toISOString()
          );
          for (const b of gb) busy.push({ start: new Date(b.start), end: new Date(b.end) });
        } catch (err) {
          console.error("[book] freeBusy failed:", err);
        }
      }
    }

    const now = new Date();
    const slotFields = (s: { startIso: string; timeLabel: string; label: string }) => ({
      start: s.startIso,
      time: s.timeLabel,
      label: s.label,
    });

    // 1) The day the caller asked for.
    const daySlots = computeAvailableSlots({ tz, hours, busy, now, targetDate: target, preferredTime });
    if (daySlots.length > 0) {
      return {
        status: "ok",
        data: { date: ymd(target), count: daySlots.length, rolled_forward: false, slots: daySlots.map(slotFields) },
      };
    }

    // 2) Requested day is full/past — roll forward to the soonest open times.
    const nextSlots = computeAvailableSlots({ tz, hours, busy, now, targetDate: null });
    if (nextSlots.length > 0) {
      return {
        status: "ok",
        data: {
          date: ymd(target),
          count: nextSlots.length,
          rolled_forward: true,
          slots: nextSlots.map(slotFields),
          note: `No openings on ${ymd(target)} (that day is full or already past). These are the NEXT available times — offer them and say the DAY for each, e.g. "${nextSlots[0].label}".`,
        },
      };
    }

    // 3) Genuinely nothing in the horizon.
    return {
      status: "ok",
      data: {
        date: ymd(target),
        count: 0,
        rolled_forward: false,
        slots: [],
        note: `No open times in the next ${DEFAULT_AVAILABILITY.horizonDays} days. If the caller needs help right now, dispatch the team instead of booking.`,
      },
    };
  }
);

const bookAppointment = defineTool(
  z.object({
    start: z.string().min(10).max(40),
    title: z.string().min(1).max(200),
    name: z.string().max(160).optional(),
    phone: z.string().optional(),
    location: z.string().max(500).optional(),
    notes: z.string().max(2000).optional(),
  }),
  async (ctx, args) => {
    const business = await resolveBusiness(ctx);
    if (!business) return { status: "error", data: {}, error: "no business configured" };
    const tz = business.timezone;

    const start = new Date(args.start);
    if (Number.isNaN(start.getTime())) {
      return { status: "blocked", data: {}, error: "invalid start time" };
    }
    const end = new Date(start.getTime() + DEFAULT_AVAILABILITY.durationMinutes * 60_000);

    if (start.getTime() <= Date.now() + 60_000) {
      return { status: "blocked", data: {}, error: "that time is in the past — offer a future time" };
    }

    const hours = await loadHours(ctx, business.id);
    if (!isWithinBusinessHours(start, end, hours, tz)) {
      return {
        status: "blocked",
        data: {},
        error:
          "that time is outside business hours — call check_calendar_availability and offer a listed time",
      };
    }

    // Google free/busy guard (catches events created outside our app).
    const conn = await getConnection(ctx.admin, ctx.tenantId, business.id);
    const hasCal = !!conn && isConnected(conn);
    let accessToken: string | null = null;
    if (hasCal && conn) {
      accessToken = await getValidAccessToken(ctx.admin, conn);
      if (accessToken) {
        try {
          const gb = await freeBusy(
            accessToken,
            conn.google_calendar_id,
            start.toISOString(),
            end.toISOString()
          );
          const clash = gb.some((b) => start < new Date(b.end) && end > new Date(b.start));
          if (clash) {
            return {
              status: "blocked",
              data: { slot_unavailable: true },
              error: "that time was just taken — offer another time",
            };
          }
        } catch (err) {
          console.error("[book] freeBusy failed:", err);
        }
      }
    }

    const contactId = await ensureContactForBooking(ctx, args.name, args.phone);

    // Insert the appointment. The exclusion constraint is the real lock: a
    // concurrent booking of an overlapping slot fails here (code 23P01).
    const { data: appt, error: apptErr } = await ctx.admin
      .from("appointments")
      .insert({
        tenant_id: ctx.tenantId,
        business_id: business.id,
        contact_id: contactId,
        call_id: ctx.callId ?? null,
        title: args.title,
        starts_at: start.toISOString(),
        ends_at: end.toISOString(),
        status: "confirmed",
        location: args.location ?? null,
        notes: args.notes ?? null,
        source: "ai",
        google_calendar_id: hasCal && conn ? conn.google_calendar_id : null,
        sync_status: hasCal ? "pending" : "none",
      })
      .select("id")
      .single();

    if (apptErr) {
      if (apptErr.code === "23P01") {
        return {
          status: "blocked",
          data: { slot_unavailable: true },
          error: "that time was just taken — offer another time",
        };
      }
      return { status: "error", data: {}, error: apptErr.message };
    }

    // Push to Google Calendar (best-effort; the appointment already stands).
    let googleEventId: string | null = null;
    if (hasCal && conn && accessToken) {
      try {
        googleEventId = await insertEvent(accessToken, {
          calendarId: conn.google_calendar_id,
          summary: `${args.title} — ${ctx.businessName}`,
          description: [
            `Booked by the AI receptionist for ${ctx.businessName}.`,
            `Caller: ${formatUsPhone(ctx.fromNumber)}`,
            args.notes ? `Notes: ${args.notes}` : null,
          ]
            .filter(Boolean)
            .join("\n"),
          location: args.location,
          startIso: start.toISOString(),
          endIso: end.toISOString(),
          timeZone: tz,
        });
        await ctx.admin
          .from("appointments")
          .update({ google_event_id: googleEventId, sync_status: "synced" })
          .eq("id", appt.id)
          .eq("tenant_id", ctx.tenantId);
      } catch (err) {
        console.error("[book] insertEvent failed:", err);
        await ctx.admin
          .from("appointments")
          .update({ sync_status: "failed" })
          .eq("id", appt.id)
          .eq("tenant_id", ctx.tenantId);
      }
    }

    // Create the job the team will work.
    const { data: job } = await ctx.admin
      .from("jobs")
      .insert({
        tenant_id: ctx.tenantId,
        business_id: business.id,
        contact_id: contactId,
        appointment_id: appt.id,
        title: args.title,
        status: "scheduled",
        scheduled_for: start.toISOString(),
        address: args.location ?? null,
        source: "ai",
      })
      .select("id")
      .single();

    // Disposition -> booked (don't override an earlier spam/escalated).
    // Voice only — chat channels have no call row.
    if (ctx.callId) {
      await ctx.admin
        .from("calls")
        .update({ disposition: "booked" })
        .eq("id", ctx.callId)
        .eq("tenant_id", ctx.tenantId)
        .or("disposition.is.null,disposition.eq.lead");
    }

    // Pipeline: this lead is now scheduled.
    await advanceLead(ctx.admin, ctx.tenantId, contactId, "scheduled");

    // Confirmation text (transactional — they asked to book; STOP still wins).
    const label = formatSlotLabel(start, tz);
    const smsSent = await sendBookingConfirmation(ctx, business.id, contactId, label);

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.book_appointment",
      entityType: "appointment",
      entityId: appt.id,
      metadata: {
        callId: ctx.callId,
        when: start.toISOString(),
        googleSynced: Boolean(googleEventId),
        jobId: job?.id ?? null,
      },
    });

    // Outbound webhook (integration escape hatch) — only if subscribed.
    await emitWebhookEvent({
      tenantId: ctx.tenantId,
      businessId: business.id,
      event: "appointment.booked",
      data: {
        appointment_id: appt.id,
        job_id: job?.id ?? null,
        contact_id: contactId,
        title: args.title,
        starts_at: start.toISOString(),
        when: label,
        location: args.location ?? null,
      },
    });

    return {
      status: "ok",
      data: {
        booked: true,
        appointment_id: appt.id,
        job_id: job?.id ?? null,
        when: label,
        confirmation_text_sent: smsSent,
        calendar_synced: Boolean(googleEventId),
      },
    };
  }
);

// ── cancel / reschedule (mutating, high data-risk) ─────────────

type UpcomingAppt = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  contact_id: string | null;
  google_event_id: string | null;
  google_calendar_id: string | null;
};

/** The caller's contact id — from the call context, or matched by their
 *  number. Returns null when we can't tie the caller to a contact. */
async function resolveCallerContactId(ctx: ToolContext): Promise<string | null> {
  if (ctx.contactId) return ctx.contactId;
  const p = normalizeUsPhone(ctx.fromNumber ?? "");
  if (!p) return null;
  const { data } = await ctx.admin
    .from("contacts")
    .select("id")
    .eq("tenant_id", ctx.tenantId)
    .eq("phone", p)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Upcoming confirmed appointments for a contact, soonest first. */
async function upcomingAppointments(
  ctx: ToolContext,
  businessId: string,
  contactId: string
): Promise<UpcomingAppt[]> {
  const { data } = await ctx.admin
    .from("appointments")
    .select("id, title, starts_at, ends_at, contact_id, google_event_id, google_calendar_id")
    .eq("tenant_id", ctx.tenantId)
    .eq("business_id", businessId)
    .eq("contact_id", contactId)
    .eq("status", "confirmed")
    .gt("starts_at", new Date().toISOString())
    .order("starts_at", { ascending: true });
  return (data ?? []) as UpcomingAppt[];
}

/** Pick the appointment the caller means: an explicit start (matched within
 *  5 min) wins; otherwise the only upcoming one. Returns a marker when the
 *  caller must choose between several. */
function pickAppt(
  appts: UpcomingAppt[],
  startHint?: string
): { appt?: UpcomingAppt; needsSelection?: boolean } {
  if (appts.length === 0) return {};
  if (startHint) {
    const t = new Date(startHint).getTime();
    if (!Number.isNaN(t)) {
      let best: UpcomingAppt | null = null;
      let bestDiff = Infinity;
      for (const a of appts) {
        const diff = Math.abs(new Date(a.starts_at).getTime() - t);
        if (diff < bestDiff) {
          bestDiff = diff;
          best = a;
        }
      }
      if (best && bestDiff <= 5 * 60_000) return { appt: best };
    }
  }
  if (appts.length === 1) return { appt: appts[0] };
  return { needsSelection: true };
}

function apptList(appts: UpcomingAppt[], tz: string) {
  return appts.map((a) => ({
    start: a.starts_at,
    when: formatSlotLabel(new Date(a.starts_at), tz),
    title: a.title,
  }));
}

const cancelAppointment = defineTool(
  z.object({
    start: z.string().max(40).optional(),
    reason: z.string().max(500).optional(),
  }),
  async (ctx, args) => {
    const business = await resolveBusiness(ctx);
    if (!business) return { status: "error", data: {}, error: "no business configured" };
    const tz = business.timezone;

    const contactId = await resolveCallerContactId(ctx);
    if (!contactId) {
      return {
        status: "ok",
        data: {
          found: false,
          say: "I don't see an appointment under this number. What name or number was it booked under?",
        },
      };
    }

    const appts = await upcomingAppointments(ctx, business.id, contactId);
    const { appt, needsSelection } = pickAppt(appts, args.start);
    if (needsSelection) {
      return {
        status: "ok",
        data: {
          needs_selection: true,
          appointments: apptList(appts, tz),
          say: "You have a few upcoming appointments — which one would you like to cancel?",
        },
      };
    }
    if (!appt) {
      return {
        status: "ok",
        data: { found: false, say: "I don't see an upcoming appointment to cancel." },
      };
    }

    const label = formatSlotLabel(new Date(appt.starts_at), tz);

    const { error: updErr } = await ctx.admin
      .from("appointments")
      .update({ status: "canceled" })
      .eq("id", appt.id)
      .eq("tenant_id", ctx.tenantId);
    if (updErr) return { status: "error", data: {}, error: updErr.message };

    // Remove the Google event (best-effort; the cancellation already stands).
    if (appt.google_event_id && appt.google_calendar_id) {
      const conn = await getConnection(ctx.admin, ctx.tenantId, business.id);
      if (conn && isConnected(conn)) {
        const token = await getValidAccessToken(ctx.admin, conn);
        if (token) {
          try {
            await deleteEvent(token, appt.google_calendar_id, appt.google_event_id);
          } catch (err) {
            console.error("[cancel] deleteEvent failed:", err);
          }
        }
      }
    }

    // Cancel the linked job.
    await ctx.admin
      .from("jobs")
      .update({ status: "canceled" })
      .eq("appointment_id", appt.id)
      .eq("tenant_id", ctx.tenantId);

    // Pipeline: a canceled appointment becomes a follow-up.
    await advanceLead(ctx.admin, ctx.tenantId, contactId, "follow_up");

    // Confirmation text (transactional — they asked to cancel; STOP wins).
    let smsSent = false;
    const { data: contact } = await ctx.admin
      .from("contacts")
      .select("phone")
      .eq("id", contactId)
      .eq("tenant_id", ctx.tenantId)
      .maybeSingle();
    const toPhone = (contact?.phone as string | null) ?? ctx.fromNumber;
    if (toPhone) {
      const res = await sendCustomerSms(ctx.admin, {
        tenantId: ctx.tenantId,
        businessId: business.id,
        contactId,
        toPhone,
        body: `Your appointment with ${ctx.businessName} on ${label} is canceled. Call us anytime to rebook. Reply STOP to opt out.`,
        kind: "confirmation",
        requireConsent: false,
      });
      smsSent = res.sent;
    }

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.cancel_appointment",
      entityType: "appointment",
      entityId: appt.id,
      metadata: { callId: ctx.callId, when: appt.starts_at, reason: args.reason ?? null },
    });

    return {
      status: "ok",
      data: { canceled: true, when: label, confirmation_text_sent: smsSent, say: `Done — your appointment on ${label} is canceled.` },
    };
  }
);

const rescheduleAppointment = defineTool(
  z.object({
    new_start: z.string().min(10).max(40),
    start: z.string().max(40).optional(),
  }),
  async (ctx, args) => {
    const business = await resolveBusiness(ctx);
    if (!business) return { status: "error", data: {}, error: "no business configured" };
    const tz = business.timezone;

    const contactId = await resolveCallerContactId(ctx);
    if (!contactId) {
      return {
        status: "ok",
        data: {
          found: false,
          say: "I don't see an appointment under this number. What name or number was it booked under?",
        },
      };
    }

    const appts = await upcomingAppointments(ctx, business.id, contactId);
    const { appt, needsSelection } = pickAppt(appts, args.start);
    if (needsSelection) {
      return {
        status: "ok",
        data: {
          needs_selection: true,
          appointments: apptList(appts, tz),
          say: "Which appointment would you like to move?",
        },
      };
    }
    if (!appt) {
      return {
        status: "ok",
        data: { found: false, say: "I don't see an upcoming appointment to move." },
      };
    }

    const newStart = new Date(args.new_start);
    if (Number.isNaN(newStart.getTime())) {
      return { status: "blocked", data: {}, error: "invalid new start time" };
    }
    const durationMs =
      new Date(appt.ends_at).getTime() - new Date(appt.starts_at).getTime() ||
      DEFAULT_AVAILABILITY.durationMinutes * 60_000;
    const newEnd = new Date(newStart.getTime() + durationMs);

    if (newStart.getTime() <= Date.now() + 60_000) {
      return { status: "blocked", data: {}, error: "that time is in the past — offer a future time" };
    }

    const hours = await loadHours(ctx, business.id);
    if (!isWithinBusinessHours(newStart, newEnd, hours, tz)) {
      return {
        status: "blocked",
        data: {},
        error:
          "that time is outside business hours — call check_calendar_availability and offer a listed time",
      };
    }

    // Google free/busy guard (the appointment's own event will be removed, so
    // a clash here means a *different* event holds the new slot).
    const conn = await getConnection(ctx.admin, ctx.tenantId, business.id);
    const hasCal = !!conn && isConnected(conn);
    let accessToken: string | null = null;
    if (hasCal && conn) {
      accessToken = await getValidAccessToken(ctx.admin, conn);
      if (accessToken) {
        try {
          const gb = await freeBusy(
            accessToken,
            conn.google_calendar_id,
            newStart.toISOString(),
            newEnd.toISOString()
          );
          const clash = gb.some(
            (b) =>
              newStart < new Date(b.end) &&
              newEnd > new Date(b.start) &&
              // ignore the busy block created by this very appointment
              !(appt.starts_at === new Date(b.start).toISOString())
          );
          if (clash) {
            return {
              status: "blocked",
              data: { slot_unavailable: true },
              error: "that time was just taken — offer another time",
            };
          }
        } catch (err) {
          console.error("[reschedule] freeBusy failed:", err);
        }
      }
    }

    // Move the appointment. The exclusion constraint guards overlaps with
    // other confirmed appointments (code 23P01).
    const { error: updErr } = await ctx.admin
      .from("appointments")
      .update({
        starts_at: newStart.toISOString(),
        ends_at: newEnd.toISOString(),
        sync_status: hasCal ? "pending" : "none",
      })
      .eq("id", appt.id)
      .eq("tenant_id", ctx.tenantId);
    if (updErr) {
      if (updErr.code === "23P01") {
        return {
          status: "blocked",
          data: { slot_unavailable: true },
          error: "that time was just taken — offer another time",
        };
      }
      return { status: "error", data: {}, error: updErr.message };
    }

    // Re-create the Google event at the new time (delete old + insert new).
    let newEventId: string | null = appt.google_event_id;
    if (hasCal && conn && accessToken) {
      if (appt.google_event_id) {
        try {
          await deleteEvent(accessToken, conn.google_calendar_id, appt.google_event_id);
        } catch (err) {
          console.error("[reschedule] deleteEvent failed:", err);
        }
      }
      try {
        newEventId = await insertEvent(accessToken, {
          calendarId: conn.google_calendar_id,
          summary: `${appt.title} — ${ctx.businessName}`,
          description: `Rescheduled by the AI receptionist for ${ctx.businessName}.\nCaller: ${formatUsPhone(ctx.fromNumber)}`,
          startIso: newStart.toISOString(),
          endIso: newEnd.toISOString(),
          timeZone: tz,
        });
        await ctx.admin
          .from("appointments")
          .update({ google_event_id: newEventId, sync_status: "synced" })
          .eq("id", appt.id)
          .eq("tenant_id", ctx.tenantId);
      } catch (err) {
        console.error("[reschedule] insertEvent failed:", err);
        await ctx.admin
          .from("appointments")
          .update({ sync_status: "failed" })
          .eq("id", appt.id)
          .eq("tenant_id", ctx.tenantId);
      }
    }

    // Move the linked job.
    await ctx.admin
      .from("jobs")
      .update({ scheduled_for: newStart.toISOString() })
      .eq("appointment_id", appt.id)
      .eq("tenant_id", ctx.tenantId);

    // Confirmation text with the new time (transactional; STOP wins).
    const label = formatSlotLabel(newStart, tz);
    const smsSent = await sendBookingConfirmation(ctx, business.id, contactId, label);

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.reschedule_appointment",
      entityType: "appointment",
      entityId: appt.id,
      metadata: { callId: ctx.callId, from: appt.starts_at, to: newStart.toISOString() },
    });

    return {
      status: "ok",
      data: {
        rescheduled: true,
        when: label,
        confirmation_text_sent: smsSent,
        calendar_synced: Boolean(newEventId),
        say: `All set — I've moved your appointment to ${label}.`,
      },
    };
  }
);

// ── calculate_quote (deterministic pricing) ────────────────────

function matchService(services: ServicePrice[], name: string): ServicePrice | null {
  const n = name.trim().toLowerCase();
  const exact = services.find((s) => s.name.toLowerCase() === n);
  if (exact) return exact;
  return (
    services.find(
      (s) => s.name.toLowerCase().includes(n) || n.includes(s.name.toLowerCase())
    ) ?? null
  );
}

/** "$75", "$112.50" — drop the cents when whole. */
function dollars(n: number): string {
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

/** "09:00:00" -> "9 AM" (spoken availability windows). */
function clock(t: string): string {
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === 0 ? `${h12} ${period}` : `${h12}:${String(min).padStart(2, "0")} ${period}`;
}

function formatQuote(r: QuoteResult): Record<string, unknown> {
  if (!r.ok) {
    if (r.reason === "out_of_area") {
      return {
        ok: false,
        reason: r.reason,
        miles: r.miles,
        say: `That spot is about ${Math.round(r.miles)} miles from us, past our service area — I can't price it, but I can take your details for the owner to follow up.`,
      };
    }
    if (r.reason === "service_unavailable" && r.availabilityWindow) {
      return {
        ok: false,
        reason: r.reason,
        window: r.availabilityWindow,
        say:
          `${r.availabilityWindow.service} is only available between ${clock(r.availabilityWindow.start)} and ${clock(r.availabilityWindow.end)}.` +
          (r.services.length > 1 ? " I can price your other service separately if you'd like." : ""),
      };
    }
    if (r.reason === "need_destination") {
      return {
        ok: false,
        reason: r.reason,
        say: "Where are we towing the vehicle to? I need the drop-off location to price the tow.",
      };
    }
    return {
      ok: false,
      reason: r.reason ?? "unavailable",
      say: "I can't price that one right now — let me take your details and the owner will text you an exact quote.",
    };
  }

  // Speak ONE total, never an itemized breakdown — the operator does not want
  // the dispatch fee / per-service costs read out loud individually, even
  // when several services are quoted together. The itemized `lines` are
  // logged to the audit trail for the record (see the calculate_quote tool
  // below) but are deliberately NOT included in this response, since
  // anything returned here is visible to the model and it will otherwise
  // narrate it. Variable-part + conditional surcharges stay: they're
  // necessary disclosures (an unknown add-on cost), not a breakdown of the
  // quoted total.
  let say = `Your total comes to ${dollars(r.total)}.`;
  if (r.variableParts.length) {
    say += ` Plus the cost of the ${r.variableParts.join(" and ")}, which we confirm before dispatch.`;
  }
  if (r.possibleSurcharges.length) {
    const names = r.possibleSurcharges.map((s) => s.name.toLowerCase()).join(", ");
    say += ` Depending on conditions there may be a small extra charge for ${names}.`;
  }
  return {
    ok: true,
    services: r.services,
    total: r.total,
    currency: r.currency,
    miles: r.miles,
    tow_miles: r.towMiles ?? null,
    say,
  };
}

const calculateQuoteTool = defineTool(
  z.object({
    services: z.array(z.string().min(1).max(160)).min(1).max(4),
    location: z.string().min(1).max(300),
    destination: z.string().max(300).optional(),
  }),
  async (ctx, args) => {
    const business = await resolveBusiness(ctx);
    if (!business) return { status: "error", data: {}, error: "no business configured" };

    const bundle = await loadPricing(ctx.admin, ctx.tenantId, business.id);
    if (!bundleQuotingEnabled(bundle) || !bundle.settings) {
      return {
        status: "blocked",
        data: { ok: false, reason: "not_configured" },
        error: "pricing is not set up for this business",
      };
    }

    const matched: ServicePrice[] = [];
    const unmatched: string[] = [];
    for (const name of args.services) {
      const svc = matchService(bundle.services, name);
      if (svc) matched.push(svc);
      else unmatched.push(name);
    }
    if (matched.length === 0 || unmatched.length > 0) {
      const names = bundle.services.map((s) => s.name);
      return {
        status: "ok",
        data: {
          ok: false,
          reason: "unknown_service",
          available_services: names,
          say:
            unmatched.length && matched.length
              ? `I can price these: ${names.join(", ")}. I didn't recognize "${unmatched.join(", ")}" — which of these did you mean?`
              : `I can price these: ${names.join(", ")}. Which one do you need?`,
        },
      };
    }
    // Dedupe in case the caller (or the AI) named the same service twice.
    const seenNames = new Set<string>();
    const services = matched.filter((s) =>
      seenNames.has(s.name) ? false : (seenNames.add(s.name), true)
    );

    const base = {
      lat: bundle.settings.base_lat as number,
      lng: bundle.settings.base_lng as number,
      formatted: bundle.settings.base_address ?? "",
    };
    const distanceMiles = await drivingDistanceMiles(base, args.location);
    if (distanceMiles == null) {
      return {
        status: "ok",
        data: {
          ok: false,
          reason: "location_unclear",
          say: "I couldn't pin down that location — what's the street address or nearest cross-street and city?",
        },
      };
    }

    let towMiles: number | null = null;
    const towService = services.find((s) => s.pricing_type === "tow");
    if (towService && args.destination) {
      towMiles = await drivingDistanceMiles(args.location, args.destination);
    }

    const parts = getZonedParts(new Date(), business.timezone);
    const result = calculateQuote({
      services,
      zones: bundle.zones,
      surcharges: bundle.surcharges,
      distanceMiles,
      towMiles,
      maxServiceMiles: bundle.settings.max_service_miles,
      localTime: { hour: parts.hour, minute: parts.minute },
      currency: bundle.settings.currency,
    });

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.calculate_quote",
      entityType: "call",
      entityId: ctx.callId ?? undefined,
      metadata: {
        services: services.map((s) => s.name),
        ok: result.ok,
        reason: result.reason ?? null,
        total: result.total,
        miles: result.miles,
        // Itemized breakdown for the record only — deliberately not part of
        // the response returned to the model (see formatQuote).
        lines: result.lines,
      },
    });

    // Pipeline: a real quote moves the lead to "quoted" with its value, and
    // queues a quote follow-up (opt-in; sent by the outbound cron).
    if (result.ok) {
      const contactId = await resolveCallerContactId(ctx);
      await advanceLead(ctx.admin, ctx.tenantId, contactId, "quoted", {
        service: services.map((s) => s.name).join(" + "),
        estimatedValue: result.total,
      });
      if (contactId) {
        const day = new Date().toISOString().slice(0, 10);
        await enqueueFollowup(ctx.admin, {
          tenantId: ctx.tenantId,
          businessId: business.id,
          contactId,
          kind: "quote_followup",
          dedupeKey: `quote_followup:${contactId}:${day}`,
        });
      }
    }

    return { status: "ok", data: formatQuote(result) };
  }
);

// ── find_tow_destination (real nearby drop-offs for a tow) ─────

/** Map a caller's loose phrasing to a good Places query, biased automotive. */
const PLACE_QUERIES: { match: string; query: string }[] = [
  { match: "tire", query: "tire shop" },
  { match: "body", query: "auto body shop" },
  { match: "collision", query: "auto body shop" },
  { match: "dealer", query: "car dealership" },
  { match: "gas", query: "gas station" },
  { match: "fuel", query: "gas station" },
  { match: "parts", query: "auto parts store" },
  { match: "mechanic", query: "auto repair shop" },
  { match: "repair", query: "auto repair shop" },
  { match: "garage", query: "auto repair shop" },
  { match: "shop", query: "auto repair shop" },
  { match: "auto", query: "auto repair shop" },
];
function placeQuery(placeType: string): string {
  const t = placeType.trim().toLowerCase();
  for (const { match, query } of PLACE_QUERIES) if (t.includes(match)) return query;
  return placeType.trim();
}

/** "4 miles", "less than a mile", or "" when distance is unknown. */
function spokenMiles(m: number | null): string {
  if (m == null) return "";
  const r = Math.round(m);
  if (r < 1) return ", less than a mile away";
  return `, about ${r} mile${r === 1 ? "" : "s"} away`;
}

const findTowDestinationTool = defineTool(
  z.object({
    place_type: z.string().min(1).max(60),
    near: z.string().min(1).max(300),
    limit: z.coerce.number().int().min(1).max(3).optional(),
  }),
  async (ctx, args) => {
    if (!isMapsConfigured()) {
      return {
        status: "ok",
        data: {
          ok: false,
          reason: "maps_unavailable",
          say: "I can't look that up right now — is there a specific place you'd like the vehicle towed to?",
        },
      };
    }

    const pickup = await geocodeAddress(args.near);
    if (!pickup) {
      return {
        status: "ok",
        data: {
          ok: false,
          reason: "location_unclear",
          say: "I couldn't pin down your location — what's the street address or nearest cross-street and city?",
        },
      };
    }

    const found = await findNearbyPlaces(pickup, placeQuery(args.place_type), { max: 8 });
    if (!found.length) {
      return {
        status: "ok",
        data: {
          ok: false,
          reason: "none_found",
          say: `I couldn't find a ${args.place_type} nearby — is there a specific place you'd like me to send the tow to?`,
        },
      };
    }

    // Rank by real driving distance from the pickup (one Distance Matrix call).
    const miles = await drivingDistanceMilesMulti(
      pickup,
      found.map((p) => ({ lat: p.lat, lng: p.lng, formatted: p.address }))
    );
    const ranked = found
      .map((p, i) => ({ ...p, miles: miles[i] }))
      .sort((a, b) => (a.miles ?? Number.MAX_VALUE) - (b.miles ?? Number.MAX_VALUE))
      .slice(0, args.limit ?? 2);

    const options = ranked.map((r) => ({
      name: r.name,
      address: r.address,
      miles: r.miles != null ? Math.round(r.miles * 10) / 10 : null,
    }));

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.find_tow_destination",
      entityType: "call",
      entityId: ctx.callId ?? undefined,
      metadata: { place_type: args.place_type, near: args.near, returned: options.length },
    });

    let say: string;
    if (options.length === 1) {
      const o = options[0];
      say = `The closest is ${o.name}${spokenMiles(o.miles)}. Want me to set the tow to go there?`;
    } else {
      const parts = options.map((o) => `${o.name}${spokenMiles(o.miles)}`);
      const last = parts.pop();
      say = `The closest options are ${parts.join(", ")}, and ${last}. Which would you like me to tow it to?`;
    }

    return { status: "ok", data: { ok: true, options, say } };
  }
);

// ── immediate-dispatch confirmation + arrival ETA ──────────────

/** Spoken/text-friendly ETA: "about 45 minutes", "about 1 hour",
 *  "about 1.5 hours", "about 2 hours 15 minutes". */
function formatEta(min: number): string {
  if (min < 60) return `about ${min} minutes`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (m === 0) return `about ${h} hour${h === 1 ? "" : "s"}`;
  if (m === 30) return `about ${h}.5 hours`;
  return `about ${h} hour${h === 1 ? "" : "s"} ${m} minutes`;
}

/**
 * On an immediate dispatch, create the job and text the caller a confirmation
 * with a rough arrival ETA derived from how busy the team is today:
 *
 *   ETA = base + per_job × (open jobs already on today's board)
 *
 * Both factors are tunable per business (sms_settings; defaults 60 + 30).
 * Idempotent per call via calls.dispatch_eta_sent_at (first-writer-wins), so
 * a second notify_staff in the same call can't double-book or double-text.
 * The confirmation is transactional (they called us for service) so it goes
 * out regardless of marketing consent — STOP still wins.
 */
async function dispatchEtaToCustomer(
  ctx: ToolContext,
  summary: string
): Promise<Record<string, unknown>> {
  // Claim the dispatch for this call — only the first writer proceeds.
  const { data: claimed } = await ctx.admin
    .from("calls")
    .update({ dispatch_eta_sent_at: new Date().toISOString() })
    .eq("id", ctx.callId as string)
    .eq("tenant_id", ctx.tenantId)
    .is("dispatch_eta_sent_at", null)
    .select("id");
  if (!claimed?.length) return { skipped: "already_dispatched" };

  const business = await resolveBusiness(ctx);
  if (!business) return { skipped: "no_business" };
  const tz = business.timezone;

  const { data: settings } = await ctx.admin
    .from("sms_settings")
    .select(
      "dispatch_confirmation_enabled, dispatch_confirmation_template, eta_base_minutes, eta_per_job_minutes"
    )
    .eq("business_id", business.id)
    .maybeSingle();
  const base = (settings?.eta_base_minutes as number | null) ?? 60;
  const perJob = (settings?.eta_per_job_minutes as number | null) ?? 30;
  const textEnabled = (settings?.dispatch_confirmation_enabled as boolean | null) ?? true;

  // Count open jobs happening today (the queue ahead of this caller) BEFORE we
  // add this one. "Today" is the business's local day; unscheduled now-jobs count.
  const today = todayInZone(tz);
  const tomorrow = addDays(today, 1);
  const startUtc = zonedTimeToUtc(today.year, today.month, today.day, 0, 0, tz).toISOString();
  const endUtc = zonedTimeToUtc(tomorrow.year, tomorrow.month, tomorrow.day, 0, 0, tz).toISOString();
  const { count: aheadCount } = await ctx.admin
    .from("jobs")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", ctx.tenantId)
    .eq("business_id", business.id)
    .in("status", ["new", "scheduled", "in_progress"])
    .or(`scheduled_for.is.null,and(scheduled_for.gte.${startUtc},scheduled_for.lt.${endUtc})`);
  const jobsAhead = aheadCount ?? 0;
  const etaMinutes = base + perJob * jobsAhead;

  const contactId = await resolveCallerContactId(ctx);
  const vehicleLine = await getVehicleLine(ctx);

  // Open the dispatch job so it shows on the board AND counts for the next caller.
  const { data: job } = await ctx.admin
    .from("jobs")
    .insert({
      tenant_id: ctx.tenantId,
      business_id: business.id,
      contact_id: contactId,
      title: (vehicleLine ? `${vehicleLine} — ${summary || "Roadside service request"}` : summary || "Roadside service request").slice(0, 120),
      status: "scheduled",
      scheduled_for: new Date().toISOString(),
      source: "ai",
    })
    .select("id")
    .single();

  // Text the caller their confirmation + ETA (transactional; STOP still wins).
  let smsSent = false;
  if (textEnabled && ctx.fromNumber) {
    let name = "there";
    if (contactId) {
      const { data: contact } = await ctx.admin
        .from("contacts")
        .select("name")
        .eq("id", contactId)
        .eq("tenant_id", ctx.tenantId)
        .maybeSingle();
      if (contact?.name) name = String(contact.name).split(/\s+/)[0];
    }
    const template =
      (settings?.dispatch_confirmation_template as string | undefined) ??
      "Thanks {name}! {business} is on the way. Estimated arrival: {eta}. We'll call if anything changes. Reply STOP to opt out.";
    const body = template
      .replaceAll("{name}", name)
      .replaceAll("{business}", ctx.businessName)
      .replaceAll("{eta}", formatEta(etaMinutes));
    const res = await sendCustomerSms(ctx.admin, {
      tenantId: ctx.tenantId,
      businessId: business.id,
      contactId,
      toPhone: ctx.fromNumber,
      body,
      kind: "confirmation",
      requireConsent: false,
    });
    smsSent = res.sent;
  }

  await logAudit({
    tenantId: ctx.tenantId,
    action: "voice.dispatch_eta",
    entityType: "call",
    entityId: ctx.callId ?? undefined,
    metadata: { jobsAhead, etaMinutes, jobId: job?.id ?? null, smsSent },
  });

  return {
    eta_minutes: etaMinutes,
    jobs_ahead: jobsAhead,
    job_id: job?.id ?? null,
    confirmation_text_sent: smsSent,
  };
}

export const TOOLS: Record<VoiceToolName, ToolImpl> = {
  lookup_contact: lookupContact,
  create_contact: createContact,
  search_knowledge_base: searchKnowledgeBase,
  check_service_area: checkServiceArea,
  notify_staff: notifyStaff,
  escalate_to_human: escalateToHuman,
  mark_spam: markSpam,
  create_follow_up_task: createFollowUpTask,
  send_sms: sendSmsTool,
  check_calendar_availability: checkCalendarAvailability,
  book_appointment: bookAppointment,
  cancel_appointment: cancelAppointment,
  reschedule_appointment: rescheduleAppointment,
  calculate_quote: calculateQuoteTool,
  find_tow_destination: findTowDestinationTool,
};
