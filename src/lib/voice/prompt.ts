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
/** Bump to force a one-time re-sync of all agents when we change voice tuning
 *  (STT/TTS settings that live on the provider agent, not in the prompt).
 *  v2 (June 2026): accurate STT + aggressive denoise + warm-transfer timeouts
 *  for noisy roadside calls and reliable human handoff.
 *  v3 (June 2026): interruption_sensitivity 0.8 → 0.3 so background noise stops
 *  cutting the agent off; pronunciation dictionary + the read-aloud
 *  speaking-style rules below to kill the "a.m.k" TTS artifact.
 *  v4 (June 2026): interruption_sensitivity 0.3 → 0.2 after a live test still
 *  caught some background barge-in.
 *  v5 (June 2026): GPT-4.1 Fast Tier (model_high_priority) to cut response
 *  latency; ZIP read digit-by-digit + state spoken as full name (kill the
 *  "forty-four thousand" ZIP and "Cleveland OCH" state-code artifacts).
 *  v6 (July 2026): pronunciation entry for "Sunoco" (common gas-station
 *  landmark callers use to describe their location) after a live call
 *  mangled it.
 *  v7 (July 2026): attempted a "multiple goodbyes" fix by turning off
 *  after-tool speech for the terminal action tools (notify_staff,
 *  book_appointment, cancel/reschedule, escalate_to_human,
 *  create_follow_up_task). This was the WRONG root cause (v10 found the
 *  real one) and was reverted in v12 — see the v12 note below and the
 *  speak-after policy comment in retell.ts.
 *  v8 (July 2026): the immediate-dispatch wrap-up line ("help is on the
 *  way... thanks for calling") was still lingering on the line afterward —
 *  made the end_call directive immediately following it explicit and
 *  unconditional (no waiting for a reply, no silence, zero delay).
 *  v9 (July 2026): interruption_sensitivity 0.2 → 0.3 — quiet talkers
 *  weren't registering as speaking (see retell.ts).
 *  v10 (July 2026): two live-call regressions fixed at the platform-config
 *  level (prompt wording alone couldn't reach either) — reminder_max_count
 *  set to 0 so Retell's default "remind the agent to speak after 10s of
 *  silence" nudge can't fire a second goodbye after the agent's one closing
 *  line; opt_out_human_detection set on the warm transfer after a live call
 *  showed a transfer declared failed without the destination phone actually
 *  ringing (see retell.ts).
 *  v11 (July 2026): three more live-call regressions. (1) Double goodbye
 *  was still happening occasionally even with the v10 reminder fix —
 *  end_call_after_silence_ms cut from 15s to 10s as a faster backstop for
 *  when the model doesn't call end_call reliably, and the wrap-up
 *  instruction now says explicitly that end_call belongs in the SAME turn
 *  as the closing line, not a later step. (2) A caller asking to schedule
 *  "tomorrow morning" got "let me check" then a dead call — the tool
 *  router (/api/voice/tools/route.ts) had no maxDuration override, so
 *  Vercel's default function timeout could kill it mid-request on the
 *  slowest tool (check_calendar_availability, two sequential Google API
 *  calls) before Retell's own 20s tool timeout — dropping the connection
 *  instead of returning an error the model could recover from. Set
 *  maxDuration=30 so our function is never the premature killer. (3) same
 *  root cause as (1) explains "I had to hang up manually" — the 10s
 *  backstop now catches that case faster.
 *  v12 (July 2026): THE goodbye fix. After v11, a booking succeeded but the
 *  agent went completely silent afterward — no goodbye at all. Root cause:
 *  the six terminal wrap-up tools (book_appointment, notify_staff,
 *  escalate_to_human, cancel/reschedule, create_follow_up_task) had
 *  speak_after_execution turned OFF (a v7 attempt at the double-goodbye,
 *  which v10 later fixed at its real source — Retell's reminder). With
 *  speech off, Retell never re-invoked the model after the tool, so the
 *  agent only said a goodbye if it happened to speak in the same turn as
 *  the tool call — inconsistently, and in this case not at all. Turned
 *  speak_after_execution back ON for every tool (see retell.ts), so the
 *  model reliably gets the turn where it delivers its ONE wrap-up line and
 *  calls end_call; reminder_max_count:0 keeps the double goodbye from
 *  returning. Also removed the during-execution filler and reinforced the
 *  booking step to wrap up + end_call the instant book_appointment
 *  returns.
 *  v13 (July 2026): fixed the hang-up DURING "let me check availability".
 *  v11's 10s silence backstop + v12's no-fillers created a race: while a
 *  slow tool (calendar check = 1-2 external Google calls, worse on a cold
 *  serverless boot) ran silently, the dead-air timer fired mid-lookup and
 *  Retell hung up on the caller. Fillers are back ON for every tool
 *  (Retell's own recommendation for >1s functions) so the line stays
 *  audibly alive during execution, and the silence backstop is back at
 *  15s. speak_after_execution stays ON (the v12 goodbye fix) and
 *  reminder_max_count stays 0 (the v10 double-goodbye fix). */
const TUNING_VERSION = 13;
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
  /** Driving-distance service radius (miles) from the geocoded home base —
   *  the authoritative coverage figure for "what area do you serve?". Null
   *  when no base is geocoded (falls back to the ZIP/city list). */
  serviceRadiusMiles?: number | null;
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

export function formatHours(hours: BusinessHour[]): string {
  if (hours.length === 0) return "Not specified.";
  const byDow = new Map(hours.map((h) => [h.day_of_week, h]));
  return DAYS.map(({ dow, label }) => {
    const h = byDow.get(dow);
    if (!h || h.closed) return `${label}: closed`;
    return `${label}: ${formatTime(h.opens_at)} – ${formatTime(h.closes_at)}`;
  }).join("\n");
}

export function formatServices(services: Service[]): string {
  const active = services.filter((s) => s.active);
  if (active.length === 0) return "No services configured.";
  return active
    .map((s) => `- ${s.name}${s.description ? `: ${s.description}` : ""}`)
    .join("\n");
}

export function formatServiceArea(
  areas: ServiceArea[],
  radiusMiles?: number | null
): string {
  const parts: string[] = [];
  // The driving-distance radius is the AUTHORITATIVE coverage rule (it's what
  // check_service_area actually enforces). Lead with it so the AI answers
  // "what area do you serve?" from the live radius — never from a stale FAQ
  // or an old mileage figure. Plug-and-play: set the radius once and the
  // spoken coverage answer is always correct for every business.
  if (typeof radiusMiles === "number" && radiusMiles > 0) {
    parts.push(
      `You serve customers within about ${Math.round(radiusMiles)} miles (driving distance) of your home base. ` +
        `This radius is the source of truth for coverage — if any FAQ or note states a different mileage, IGNORE it and use this number. ` +
        `When a caller asks what area you cover or "do you come out to <place>", give this radius, then confirm their exact spot with check_service_area.`
    );
  }
  const active = areas.filter((a) => a.active);
  const zips = active.filter((a) => a.type === "zip" && a.zip_code).map((a) => a.zip_code);
  const cities = active
    .filter((a) => a.type === "city" && a.city)
    .map((a) => `${a.city}${a.state ? `, ${a.state}` : ""}`);
  if (cities.length) parts.push(`Example cities you commonly serve: ${cities.join("; ")}`);
  if (zips.length) parts.push(`Example ZIP codes in range: ${zips.join(", ")}`);
  return parts.length ? parts.join("\n") : "No service area configured.";
}

export function formatFaqs(faqs: Faq[]): string {
  const active = faqs.filter((f) => f.active).slice(0, MAX_INLINE_FAQS);
  if (active.length === 0) return "";
  const list = active.map((f) => `Q: ${f.question}\nA: ${f.answer}`).join("\n\n");
  return `\n# Known answers (use these; if a question isn't here, call search_knowledge_base)\n${list}\n`;
}

/**
 * §5.1 pricing rule body (without the leading number) — SHARED by the voice
 * prompt and the omnichannel chat prompt so the "never invent a price"
 * guardrail can never drift between channels.
 */
export function pricingRuleBody(quotingEnabled: boolean): string {
  return quotingEnabled
    ? `NEVER invent, estimate, round, or hint at a price from your own head — not even "around" or "starting at". To answer ANY question about cost/price/"how much", you MUST call calculate_quote and tell the caller ONLY the single exact total it returns — as ONE number, never itemized into a dispatch fee plus separate service amounts, even when quoting more than one service together or if asked how the price breaks down. If it returns ok=false, follow its guidance (ask for the missing info, or offer to take details for the owner). Never say a number that did not come from calculate_quote.`
    : `NEVER invent, estimate, or hint at a price, fee, rate, or range — not even "around" or "starting at". For ANY question about cost/price/"how much": say "Our owner will text you an exact quote shortly," collect the best number, and call create_follow_up_task with type "quote_request". Do not guess a number under any circumstances.`;
}

/** §5.1 booking rule body (without the leading number) — shared, as above. */
export function bookingRuleBody(bookingEnabled: boolean): string {
  return bookingEnabled
    ? `BOOKING: only offer or confirm appointment times that check_calendar_availability returned for the day the caller wants. NEVER invent a time or guess availability, and only book a time the caller explicitly agreed to. A time outside business hours is rejected automatically — never promise one. Never take payment to "hold" a slot.`
    : `NEVER book, schedule, or confirm an appointment time. If they want to schedule, take the details, say "the team will confirm a time with you," and call notify_staff.`;
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

  const rule2 = `2. ${pricingRuleBody(quotingEnabled)}`;

  const pricingStep = quotingEnabled
    ? 'Pricing — ALWAYS quote proactively: the moment you know the service and the caller\'s location (for a tow, also the drop-off), call calculate_quote and tell them the exact total it returns. Do NOT wait for them to ask the price — give it to them as you confirm the service and address, before you book or hand off to the team. If the caller needs MORE THAN ONE service in the same visit (e.g. a jump start AND a tire change), pass ALL of them together in ONE calculate_quote call (the services list) — NEVER call it once per service, that charges the dispatch fee more than once when it should only ever apply one time per visit. Read back ONLY the total calculate_quote returns; never quote from memory (see rule 2). For a TOW where the caller has no drop-off in mind (e.g. "just tow it to the nearest mechanic / tire shop"), call find_tow_destination with the kind of place + their pickup location, read back the option(s) it returns, let them choose, THEN call calculate_quote with that place\'s address as the destination.'
    : "Pricing questions → rule 2.";

  const rule4 = `4. ${bookingRuleBody(bookingEnabled)}`;

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
    "Capture the need — one question at a time, as efficiently as possible: what's the problem/service, the location or address, the best callback number, AND the vehicle — year, make, and model (e.g. \"2018 Ford F-150\"). Ask for the vehicle right along with the problem (\"What's going on, and what are we coming out for — year, make, and model?\") rather than as a separate extra question; if they only give some of it, take what they have and move on rather than pressing for the rest. If lookup_contact returned a last_vehicle for a returning caller, confirm it's still the same vehicle in one quick line (\"Still the 2018 F-150?\") instead of asking from scratch — only ask fresh if they say it's different. If they can't give an exact street address (stranded on a highway, don't know the street name), ask for the nearest cross streets, a mile marker, or a recognizable landmark/business nearby (a gas station, store, or exit number) — then read back what you understood to confirm it's right before using it in any tool call. Pass the vehicle info as vehicle_year/vehicle_make/vehicle_model on create_contact.",
    'Once you have a ZIP or city, call check_service_area. If it\'s NOT covered: be kind, say they may be just outside the area, still offer to take their details, and call create_contact + create_follow_up_task (type "callback", note out-of-area). Don\'t promise service.',
    "Answer questions only from the Known answers / search_knowledge_base or the services list. If you can't, say the team will follow up — don't make things up.",
    pricingStep,
  ];
  if (bookingEnabled) {
    steps.push(
      'Booking vs. immediate help — decide first: if the caller needs help NOW (stranded, "right away", "as soon as you can", an emergency), do NOT book a future calendar slot. Instead' +
        (quotingEnabled ? " quote the price, then" : "") +
        ' dispatch the team immediately: call create_contact + notify_staff with urgency "high" or "emergency". The MOMENT notify_staff returns, your very next words are your ONE final wrap-up line (see Wrap up below) — something like "Help is on the way, {name} — you\'ll get a text with your arrival time shortly. Thanks for calling, take care!" — and then call end_call IMMEDIATELY, in that same turn, with zero delay. Do NOT wait for the caller to reply, do NOT wait in silence, do NOT say anything else after that line — the instant it\'s spoken, your next action is end_call, no exceptions. A quick "one moment" filler WHILE notify_staff is still running is fine, but once it returns do NOT add a separate acknowledgement turn ("okay, I\'ve got that noted...") — the wrap-up line itself IS your one and only response once dispatch is confirmed. Do NOT say a specific arrival time or number of minutes out loud — the confirmation text carries the estimate. ' +
        'Only use the calendar for a SCHEDULED time the caller wants for later: call check_calendar_availability for that day and offer ONLY the open times it returns (say them naturally, e.g. "I have 9 AM or 2 PM"). If they ask for something sooner than the soonest open slot (e.g. "in 5 minutes"), tell them the earliest you can actually schedule and offer it — never just say "nothing available." If a day is full, offer the next day. When they pick a time, call book_appointment with that exact start time; if it comes back unavailable or outside hours, check availability again and offer another. ' +
        'NEVER promise to "call you back if an earlier slot opens" — there is no waitlist; instead offer a genuinely open earlier time, or say you\'ll note that they want the soonest possible and the team will try.' +
        (quotingEnabled
          ? " Before you confirm a booking, make sure you've quoted the price (calculate_quote with the service + location). Always confirm BOTH the time AND the exact price. The moment book_appointment comes back booked, that confirmation IS your ONE wrap-up line — speak it (time + price + a warm goodbye) and call end_call in that SAME turn. Never go silent or wait for the caller after a successful booking."
          : " Always confirm the booked time back to them. The moment book_appointment comes back booked, that confirmation IS your ONE wrap-up line — speak it (the booked time + a warm goodbye) and call end_call in that SAME turn. Never go silent or wait for the caller after a successful booking.")
    );
    steps.push(
      'Cancel / reschedule: if a caller wants to change or cancel an existing appointment, confirm which one (read back the day and time), then call cancel_appointment or reschedule_appointment. To reschedule, first call check_calendar_availability for the new day and offer only open times. If the tool reports it can\'t find their appointment, take their details and call notify_staff. A confirmation text is sent automatically (if they\'re opted in).'
    );
  }
  steps.push(
    quotingEnabled
      ? "When you have name + number + need and it's a real, in-area lead: FIRST give them their exact price (call calculate_quote with the service + location if you haven't already this call), then call create_contact and notify_staff with a one-line spoken summary so the team can dispatch fast. Don't end on 'the team will call you' without giving the price."
      : "When you have name + number + need and it's a real, in-area lead: call create_contact, then notify_staff with a one-line spoken summary so the team can call back fast."
  );
  steps.push(
    transferEnabled
      ? 'If the caller asks for a person, is upset or distressed, or has a complaint: tell them warmly "let me get someone on the line for you — one moment" and IMMEDIATELY call transfer_to_human. This is how you reach a human; connecting can take a few rings, so stay calm and let it try — do NOT announce a failure early. Do NOT call escalate_to_human first. ONLY if transfer_to_human comes back without connecting (nobody was available) do you then reassure them — "I couldn\'t reach someone live this second, but I\'ll have them call you right back" — and call escalate_to_human to take a message and alert the team. Never imply the system is broken; never argue.'
      : "If the caller demands a human, is angry, or it's beyond you: call escalate_to_human. Stay calm and never argue."
  );
  steps.push(
    `Texting the caller — their current text status is {{sms_opted_out}}:\n` +
      `   - If {{sms_opted_out}} is "true", this caller has OPTED OUT of texts. Do NOT ask permission and do NOT promise or send a text. If they ask you to text them, kindly tell them they're unsubscribed and can text the word START to this number to turn texts back on; offer to handle it on the call now or have the team follow up by phone. (Any text would be blocked anyway.)\n` +
      `   - Otherwise, if the caller explicitly asks you to text them something (a quote, the details, a confirmation), treat that request as their consent: call create_contact with sms_consent true, then call send_sms with the information.\n` +
      `   - If you are the one offering to text (they didn't ask), ask once using this exact script — "${consentScript}" — and set sms_consent on create_contact from their answer. If they say NOT to text them, call create_contact with sms_consent false to record the opt-out.` +
      (bookingEnabled ? " When they've agreed to texts, a booking confirmation is sent automatically." : "")
  );
  const howTo = steps.map((s, i) => `${i + 1}. ${s}`).join("\n");

  const wrapUpNext = bookingEnabled
    ? quotingEnabled
      ? '(the price you quoted and the booked time — or, if you took it as a lead, the price plus "the team will be in touch at <number>")'
      : '(the booked time, or "the team will call you right back at <number>")'
    : quotingEnabled
      ? '(the price you quoted, then "the team will be in touch at <number>")'
      : '("The team will call you right back at <number>.")';
  const wrapUp =
    `There is EXACTLY ONE wrap-up moment per call. The instant the caller's need is fully handled (dispatched, booked, quoted-and-logged, or handed to the team), say ONE natural closing line — confirm what happens next ${wrapUpNext}, use their name if you have it, and say goodbye, all together like a real person would (e.g. "You're all set, Sarah — we'll see you Thursday at 2! Take care.") — then END THE CALL right away by calling end_call, with no pause and no filler in between. Calling end_call is not optional and is not a separate step you do later — it belongs in the SAME turn as the closing line, every single time, with zero exceptions. This ONE line is also your reply to whatever tool just finished (notify_staff, book_appointment, etc.) — do NOT speak a separate "okay, got it" acknowledgement first and THEN a goodbye; merge them into the single closing line above. Do NOT add a second, separate sign-off after that (no extra "thank you for calling us," no repeated "take care," no re-confirming what you already confirmed — one warm goodbye is enough, a second one sounds robotic and cold and wastes the caller's time). Do NOT stay on the line, re-ask if there's anything else more than once, or wait in silence after the caller's need is handled — every extra second is wasted call time.`;

  const systemPrompt = `# Who you are
You are the virtual receptionist for ${name}${industry}. You answer the phone. Be warm, natural, and concise — like a sharp, friendly front-desk person. Keep replies short and ask ONE question at a time. Be efficient: gather the details you need quickly, don't pad the call with small talk, and move toward wrapping up. The moment the caller's need is handled, end the call — every extra second costs the business money.

# Speaking style (everything you write is read aloud by a voice — write for the ear)
- Times: say them plainly, like "9 AM" or "2:30 PM". NEVER write "a.m." or "p.m." with periods, and never spell the letters out.
- Phone numbers: say them digit by digit, with spaces, like "2 1 6, 5 5 5, 0 1 4 2".
- ZIP codes: ALWAYS read one digit at a time — write the digits spaced apart, like "4 4 1 4 2". NEVER write a ZIP as one number (it would be read as "forty-four thousand...").
- Addresses: read the house number digit by digit and the street name as words. ALWAYS say the state's FULL name and write it out — "Cleveland, Ohio", NEVER "Cleveland, OH" (a two-letter state code gets mispronounced).
- Numbered streets (e.g. "East 152nd Street", "5th Avenue") are NOT house numbers — say the number naturally as an ordinal, like "East One Fifty-Second" or "Fifth Avenue." Do NOT read a street number digit by digit like a phone number or ZIP.
- When you repeat a street name, cross street, or landmark back to confirm it, say the FULL word every time — never shorten, truncate, or drop part of it (say "South Waterloo," never "South Water").
- Prices: say the exact total from calculate_quote as plain words or a dollar figure (e.g. "seventy-five dollars" or "$75") — never abbreviate.
- No markdown, asterisks, emoji, or abbreviations — only plain spoken words.

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
${formatServiceArea(areas, input.serviceRadiusMiles)}
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
  const boostedKeywords = buildBoostedKeywords(input);

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
        boostedKeywords,
        tuningVersion: TUNING_VERSION,
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
    boostedKeywords,
    promptHash,
  };
}

/** Bias the speech-to-text toward the proper nouns a caller will actually say
 *  — the business name, the services it offers, and the towns it serves — so
 *  "Strongsville" or "lockout" aren't transcribed as something else. */
function buildBoostedKeywords(input: PromptInput): string[] {
  const out = new Set<string>();
  const add = (s: string | null | undefined) => {
    const v = (s ?? "").trim();
    if (v.length >= 2 && v.length <= 40) out.add(v);
  };
  add(input.business.name);
  for (const s of input.services) add(s.name);
  for (const a of input.areas) if (a.type === "city") add(a.city);
  return [...out].slice(0, 50);
}
