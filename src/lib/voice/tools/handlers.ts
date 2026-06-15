import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
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
import { freeBusy, insertEvent } from "@/lib/google/calendar";
import { getConnection, getValidAccessToken, isConnected } from "@/lib/google/connection";
import { drivingDistanceMiles } from "@/lib/maps/client";
import { formatUsPhone, normalizeUsPhone } from "@/lib/phone";
import { calculateQuote, type QuoteResult, type ServicePrice } from "@/lib/pricing/engine";
import { bundleQuotingEnabled, loadPricing } from "@/lib/pricing/loader";
import { sendCustomerSms, sendStaffSms } from "@/lib/sms/outbound";

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
      await ctx.admin
        .from("sms_suppressions")
        .delete()
        .eq("tenant_id", ctx.tenantId)
        .eq("phone", phone);
    }

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
        const dest = [city ? `${city}${state ? `, ${state}` : ""}` : null, zip]
          .filter(Boolean)
          .join(" ");
        const miles = await drivingDistanceMiles(
          { lat: ps.base_lat as number, lng: ps.base_lng as number, formatted: "" },
          dest
        );
        if (miles != null) {
          const radius = (ps.max_service_miles as number | null) ?? 25;
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
      }
    }

    // Fallback: the legacy ZIP/city allowlist (no home base / maps offline).
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
      entityId: ctx.callId,
      metadata: { urgency, staffCount: staff.length },
    });

    if (staff.length === 0) {
      return { status: "ok", data: { notified: false, reason: "no staff configured" } };
    }

    const prefix = urgency === "emergency" ? "URGENT lead" : "New lead";
    const body =
      `${prefix} - ${ctx.businessName}. ${args.summary} ` +
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
    return {
      status: "ok",
      data: { notified: sent > 0, staff_count: staff.length, sent },
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
    const body =
      `URGENT - ${ctx.businessName}: a caller needs a person. ${summary} ` +
      `Call: ${formatUsPhone(ctx.fromNumber)}`;
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

    await logAudit({
      tenantId: ctx.tenantId,
      action: "voice.tool.escalate_to_human",
      entityType: "call",
      entityId: ctx.callId,
      metadata: { reason: args.reason, staffCount: staff.length },
    });

    return {
      status: "ok",
      data: { escalated: true, task_id: task?.id ?? null, sent },
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
    const next = addDays(target, 1);
    const dayStart = zonedTimeToUtc(target.year, target.month, target.day, 0, 0, tz);
    const dayEnd = zonedTimeToUtc(next.year, next.month, next.day, 0, 0, tz);

    const busy = await dbBusy(ctx, business.id, dayStart.toISOString(), dayEnd.toISOString());

    const conn = await getConnection(ctx.admin, ctx.tenantId, business.id);
    if (conn && isConnected(conn)) {
      const token = await getValidAccessToken(ctx.admin, conn);
      if (token) {
        try {
          const gb = await freeBusy(
            token,
            conn.google_calendar_id,
            dayStart.toISOString(),
            dayEnd.toISOString()
          );
          for (const b of gb) busy.push({ start: new Date(b.start), end: new Date(b.end) });
        } catch (err) {
          console.error("[book] freeBusy failed:", err);
        }
      }
    }

    const slots = computeAvailableSlots({
      tz,
      hours,
      busy,
      now: new Date(),
      targetDate: target,
      preferredTime,
    });

    return {
      status: "ok",
      data: {
        date: ymd(target),
        count: slots.length,
        slots: slots.map((s) => ({ start: s.startIso, time: s.timeLabel, label: s.label })),
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
        call_id: ctx.callId,
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
    await ctx.admin
      .from("calls")
      .update({ disposition: "booked" })
      .eq("id", ctx.callId)
      .eq("tenant_id", ctx.tenantId)
      .or("disposition.is.null,disposition.eq.lead");

    // Confirmation text (transactional — they asked to book; STOP still wins).
    const label = formatSlotLabel(start, tz);
    let smsSent = false;
    if (contactId) {
      const { data: smsSettings } = await ctx.admin
        .from("sms_settings")
        .select("booking_confirmation_template")
        .eq("business_id", business.id)
        .maybeSingle();
      const template =
        (smsSettings?.booking_confirmation_template as string | undefined) ??
        "You're booked with {business} for {time}. Reply STOP to opt out.";
      const body = template
        .replaceAll("{business}", ctx.businessName)
        .replaceAll("{time}", label);
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
        say: `${r.service} is only available between ${clock(r.availabilityWindow.start)} and ${clock(r.availabilityWindow.end)}.`,
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

  let say =
    `Your total comes to ${dollars(r.total)} — ` +
    r.lines.map((l) => `${dollars(l.amount)} for ${l.label.toLowerCase()}`).join(", ") +
    ".";
  if (r.variablePart) {
    say += ` Plus the cost of the ${r.variablePart}, which we confirm before dispatch.`;
  }
  if (r.possibleSurcharges.length) {
    const names = r.possibleSurcharges.map((s) => s.name.toLowerCase()).join(", ");
    say += ` Depending on conditions there may be a small extra charge for ${names}.`;
  }
  return {
    ok: true,
    service: r.service,
    total: r.total,
    currency: r.currency,
    breakdown: r.lines,
    variable_part: r.variablePart ?? null,
    possible_surcharges: r.possibleSurcharges,
    miles: r.miles,
    tow_miles: r.towMiles ?? null,
    say,
  };
}

const calculateQuoteTool = defineTool(
  z.object({
    service: z.string().min(1).max(160),
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

    const svc = matchService(bundle.services, args.service);
    if (!svc) {
      const names = bundle.services.map((s) => s.name);
      return {
        status: "ok",
        data: {
          ok: false,
          reason: "unknown_service",
          available_services: names,
          say: `I can price these: ${names.join(", ")}. Which one do you need?`,
        },
      };
    }

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
    if (svc.pricing_type === "tow" && args.destination) {
      towMiles = await drivingDistanceMiles(args.location, args.destination);
    }

    const parts = getZonedParts(new Date(), business.timezone);
    const result = calculateQuote({
      service: svc,
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
      entityId: ctx.callId,
      metadata: {
        service: svc.name,
        ok: result.ok,
        reason: result.reason ?? null,
        total: result.total,
        miles: result.miles,
      },
    });

    return { status: "ok", data: formatQuote(result) };
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
  send_sms: sendSmsTool,
  check_calendar_availability: checkCalendarAvailability,
  book_appointment: bookAppointment,
  calculate_quote: calculateQuoteTool,
};
