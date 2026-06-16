import "server-only";

import { createHash } from "node:crypto";

import { DAYS } from "@/lib/setup/steps";
import type {
  Business,
  BusinessHour,
  Faq,
  Service,
  ServiceArea,
  SmsSettings,
} from "@/lib/setup/queries";

import { VOICE_TOOLS } from "./tools/registry";
import type { VoiceAgentConfig } from "./types";

/** Retell voice id — "Grace" (operator's chosen voice, June 2026). Stored
 *  per-agent on agents.voice_id; this is the fallback for new agents. */
const DEFAULT_VOICE_ID = "11labs-Grace";
const DEFAULT_LANGUAGE = "en-US";
const DEFAULT_MAX_CALL_SECONDS = 600;
/** Inlined FAQ cap so the prompt stays lean; search_knowledge_base covers the rest. */
const MAX_INLINE_FAQS = 20;

export interface PromptInput {
  business: Pick<Business, "name" | "industry" | "timezone">;
  services: Service[];
  hours: BusinessHour[];
  areas: ServiceArea[];
  faqs: Faq[];
  sms: SmsSettings | null;
  /** True when a Google Calendar is connected — turns on booking (M9). */
  bookingEnabled?: boolean;
  /** True when owner-approved pricing exists — turns on AI quoting. */
  quotingEnabled?: boolean;
  /** E.164 human number for live warm transfer, or null/absent to disable. */
  transferNumber?: string | null;
  agent?: {
    name?: string | null;
    voiceId?: string | null;
    language?: string | null;
    personality?: string | null;
    maxCallSeconds?: number | null;
  };
}

/** "07:00:00" -> "7:00 AM". Falls back to the raw value if unparseable. */
function formatTime(t: string | null): string {
  if (!t) return "";
  const [hStr, mStr] = t.split(":");
  const h = Number(hStr);
  const m = Number(mStr);
  if (Number.isNaN(h) || Number.isNaN(m)) return t;
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function formatHours(hours: BusinessHour[]): string {
  if (hours.length === 0) return "Not specified.";
  const byDow = new Map(hours.map((h) => [h.day_of_week, h]));
  return DAYS.map(({ dow, label }) => {
    const h = byDow.get(dow);
    if (!h || h.closed) return `${label}: closed`;
    return `${label}: ${formatTime(h.opens_at)} – ${formatTime(h.closes_at)}`;
  }).join("\n");
}

function formatServices(services: Service[]): string {
  const active = services.filter((s) => s.active);
  if (active.length === 0) return "No services configured.";
  return active
    .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`)
    .join("\n");
}

function formatServiceArea(areas: ServiceArea[]): string {
  const active = areas.filter((a) => a.active);
  const zips = active.filter((a) => a.type === "zip" && a.zip_code).map((a) => a.zip_code);
  const cities = active
    .filter((a) => a.type === "city" && a.city)
    .map((a) => `${a.city}${a.state ? `, ${a.state}` : ""}`);
  const parts: string[] = [];
  if (cities.length) parts.push(`Cities: ${cities.join("; ")}`);
  if (zips.length) parts.push(`ZIP codes: ${zips.join(", ")}`);
  return parts.length ? parts.join("\n") : "No service area configured.";
}

function formatFaqs(faqs: Faq[]): string {
  const active = faqs.filter((f) => f.active).slice(0, MAX_INLINE_FAQS);
  if (active.length === 0) return "";
  const list = active.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  return `\n# Known answers (use these; if a question isn't here, call search_knowledge_base)\n${list}\n`;
}

/**
 * Build the per-tenant agent configuration from this business's wizard
 * data, with the master plan §5.1 hard rules baked into the system
 * prompt. Pure + deterministic: the same inputs yield the same prompt
 * and the same {@link VoiceAgentConfig.promptHash}, so the provider agent
 * is only re-synced when something actually changed.
 */
export function buildAgentConfig(input: PromptInput): VoiceAgentConfig {
  const { business, services, hours, areas, faqs, sms } = input;
  const name = business.name || "our team";
  const industry = business.industry ? ` (${business.industry})` : "";
  const consentScript =
    sms?.consent_script ??
    "Is it okay if we text you updates about your service request? Reply STOP anytime to opt out.";

  const bookingEnabled = input.bookingEnabled ?? false;
  const quotingEnabled = input.quotingEnabled ?? false;
  const transferEnabled = Boolean(input.transferNumber);

  const rule2 = quotingEnabled
    ? `2. NEVER invent, estimate, round, or hint at a price from your own head — not even "around" or "starting at". To answer ANY question about cost/price/"how much", you MUST call calculate_quote and tell the caller ONLY the exact total it returns. If it returns ok=false, follow its guidance (ask for the missing info, or offer to take details for the owner). Never say a number that did not come from calculate_quote.`
    : `2. NEVER invent, estimate, or hint at a price, fee, rate, or range — not even "around" or "starting at". For ANY question about cost/price/"how much": say "Our owner will text you an exact quote shortly," collect the best number, and call create_follow_up_task with type "quote_request". Do not guess a number under any circumstances.`;

  const pricingStep = quotingEnabled
    ? "Pricing: when the caller asks what something costs, get their location (and the drop-off for a tow), call calculate_quote, then tell them the exact total it returns. Never quote from memory — see rule 2."
    : "Pricing questions → rule 2.";

  const rule4 = bookingEnabled
    ? `4. BOOKING: only offer or confirm appointment times that check_calendar_availability returned for the day the caller wants. NEVER invent a time or guess availability, and only book a time the caller explicitly agreed to. A time outside business hours is rejected automatically — never promise one. Never take payment to "hold" a slot.`
    : `4. NEVER book, schedule, or confirm an appointment time. If they want to schedule, take the details, say "the team will confirm a time with you," and call notify_staff.`;

  const hoursLabel = bookingEnabled
    ? "Business hours (you may only book inside these windows):"
    : "Hours (for reference only — do not book):";

  const todaySection = bookingEnabled
    ? `\n# Today
Today is {{current_day}}, {{current_date}} in the business's local time. Use it to work out any date the caller mentions (e.g. "next Tuesday").\n`
    : "";

  const steps: string[] = [
    "Greet with the business name (your opening line already does this).",
    "Spam check: if this is clearly a sales pitch, vendor, or robocall, call mark_spam and end politely. Do not collect info or notify staff.",
    'Identify the caller (their number is {{caller_phone}}). If this is a returning customer ({{is_returning}} is "true"), your opening line already greeted {{caller_name}} by name — do NOT ask their name again. Call lookup_contact right away to recall their history, then confirm what they need today. If this is a NEW caller, ask their name, then call lookup_contact.',
    "Capture the need — one question at a time: what's the problem/service, the location or address, and the best callback number.",
    'Once you have a ZIP or city, call check_service_area. If it\'s NOT covered: be kind, say they may be just outside the area, still offer to take their details, and call create_contact + create_follow_up_task (type "callback", note out-of-area). Don\'t promise service.',
    "Answer questions only from the Known answers / search_knowledge_base or the services list. If you can't, say the team will follow up — don't make things up.",
    pricingStep,
  ];
  if (bookingEnabled) {
    steps.push(
      'Booking: if the caller wants an appointment, call check_calendar_availability for the day they want, then offer the open times it returns (say them naturally, e.g. "I have 9 AM or 2 PM"). When they pick one, call book_appointment with that exact start time. If it comes back unavailable or outside hours, check availability again and offer a different time. Always confirm the booked time back to them.'
    );
  }
  steps.push(
    "When you have name + number + need and it's a real, in-area lead: call create_contact, then notify_staff with a one-line spoken summary so the team can call back fast."
  );
  steps.push(
    transferEnabled
      ? 'If the caller asks for a person, is upset or distressed, or has a complaint: say a brief "let me connect you with someone right now" and IMMEDIATELY call transfer_to_human — this is how you reach a human. Do NOT call escalate_to_human for this. ONLY if transfer_to_human fails to connect should you then call escalate_to_human to take a message + alert the team. Stay calm, never argue.'
      : "If the caller demands a human, is angry, or it's beyond you: call escalate_to_human. Stay calm and never argue."
  );
  steps.push(
    `Text permission: when it fits, ask using this exact script — "${consentScript}" — and set sms_consent on create_contact based on their answer. If the caller says NOT to text them, call create_contact with sms_consent set to false to record that opt-out.${
      bookingEnabled ? " When they've agreed to texts, a booking confirmation is sent automatically." : ""
    }`
  );
  const howTo = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

  const wrapUpNext = bookingEnabled
    ? '(the booked time, or "the team will call you right back at <number>")'
    : '("The team will call you right back at <number>.")';
  const wrapUp =
    `Confirm what happens next ${wrapUpNext}, thank them by name if you have it, give a brief goodbye, ` +
    "then END THE CALL right away by calling end_call. Do NOT stay on the line, re-ask if there's anything else more than once, or wait in silence after the caller's need is handled.";

  const systemPrompt = `# Who you are
You are the virtual receptionist for ${name}${industry}. You answer the phone. Be warm, natural, and concise — like a sharp, friendly front-desk person. Keep replies short and ask ONE question at a time. Be efficient: gather the details you need quickly, don't pad the call with small talk, and move toward wrapping up. The moment the caller's need is handled, end the call — every extra second costs the business money.

# Absolute rules — never break these
1. NEVER claim or imply you are a human. If asked "are you a robot / a real person?", say plainly that you're ${name}'s AI virtual assistant, then keep helping.
${rule2}
3. NEVER take credit card, bank, or payment details over the phone.
${rule4}
5. NEVER promise a service that isn't in the services list below.
6. If you're missing a fact, do NOT guess — use a tool or escalate_to_human.

# The business
Name: ${name}
${hoursLabel}
${formatHours(hours)}

Services you can discuss (ONLY these):
${formatServices(services)}

Service area (callers must be inside it — verify with check_service_area, never assume):
${formatServiceArea(areas)}
${formatFaqs(faqs)}${todaySection}
# How to handle a call
${howTo}

# Wrap up
${wrapUp}`;

  // Opening line is computed per call (returning vs. new caller) and injected
  // as a dynamic variable, so the AI can greet a returning caller by name in
  // its very first sentence. The Twilio route fills {{opening_line}}.
  const beginMessage = "{{opening_line}}";

  const voiceId = input.agent?.voiceId || DEFAULT_VOICE_ID;
  const language = input.agent?.language || DEFAULT_LANGUAGE;
  const maxCallSeconds = input.agent?.maxCallSeconds || DEFAULT_MAX_CALL_SECONDS;

  const promptHash = createHash("sha256")
    .update(
      JSON.stringify({
        systemPrompt,
        beginMessage,
        voiceId,
        language,
        maxCallSeconds,
        tools: VOICE_TOOLS.map((t) => t.name),
        transferNumber: input.transferNumber ?? null,
      })
    )
    .digest("hex");

  return {
    name: input.agent?.name || "Virtual receptionist",
    systemPrompt,
    beginMessage,
    voiceId,
    language,
    maxCallSeconds,
    tools: VOICE_TOOLS,
    transferNumber: input.transferNumber ?? null,
    promptHash,
  };
}
