/**
 * The §10 tool catalog the AI receptionist may call — the M7 MVP subset
 * (BUILD_GUIDE M7). Provider-neutral definitions: name, description (the
 * AI reads this to decide *when* to call), and JSON-Schema parameters.
 *
 * SINGLE SOURCE OF TRUTH for tool names + shapes. The prompt builder
 * hands these to the provider; the tool router (src/app/api/voice/tools)
 * validates each call's args with a zod schema that MIRRORS the schema
 * here — keep the two in step when editing.
 *
 * Out of scope for M7 (later milestones): calculate_quote, book_*,
 * send_sms, create_payment_link, create_invoice, request_review.
 */
import type { VoiceToolDef } from "../types";

export const VOICE_TOOL_NAMES = [
  "lookup_contact",
  "create_contact",
  "search_knowledge_base",
  "check_service_area",
  "notify_staff",
  "escalate_to_human",
  "mark_spam",
  "create_follow_up_task",
] as const;

export type VoiceToolName = (typeof VOICE_TOOL_NAMES)[number];

export function isVoiceToolName(value: string): value is VoiceToolName {
  return (VOICE_TOOL_NAMES as readonly string[]).includes(value);
}

export const VOICE_TOOLS: VoiceToolDef[] = [
  {
    name: "lookup_contact",
    description:
      "Look up whether this caller has contacted the business before, by phone number. " +
      "Call this early to recognize returning customers and recall their history. " +
      "If you omit the phone, the caller's own number is used.",
    parameters: {
      type: "object",
      properties: {
        phone: {
          type: "string",
          description: "E.164 phone, e.g. +14405551234. Defaults to the caller's number.",
        },
      },
      required: [],
    },
  },
  {
    name: "create_contact",
    description:
      "Save or update the caller as a contact once you know their name. Include whatever " +
      "you've gathered (name, phone, what they need, address). Call this before notify_staff " +
      "so the team has a record. Set sms_consent only if the caller clearly agreed to texts.",
    parameters: {
      type: "object",
      properties: {
        name: { type: "string", description: "Caller's name." },
        phone: { type: "string", description: "E.164 phone. Defaults to the caller's number." },
        need: { type: "string", description: "One line: the service/problem they're calling about." },
        address: { type: "string", description: "Service address or location, if given." },
        email: { type: "string", description: "Email, if given." },
        sms_consent: {
          type: "boolean",
          description: "True ONLY if the caller agreed to receive text messages.",
        },
      },
      required: ["name"],
    },
  },
  {
    name: "search_knowledge_base",
    description:
      "Search the business's own FAQ answers to answer a caller's question accurately. " +
      "Use this instead of guessing. Returns the best-matching question/answer pairs.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "The caller's question, in your own words." },
      },
      required: ["query"],
    },
  },
  {
    name: "check_service_area",
    description:
      "Check whether a location is inside the business's service area before promising service. " +
      "Provide a 5-digit ZIP and/or a city. Never guess coverage — always call this.",
    parameters: {
      type: "object",
      properties: {
        zip: { type: "string", description: "5-digit US ZIP code." },
        city: { type: "string", description: "City name." },
        state: { type: "string", description: "2-letter state, if known." },
      },
      required: [],
    },
  },
  {
    name: "notify_staff",
    description:
      "Alert the business's staff about a new lead so they can call the customer back. " +
      "Call this once you have the caller's name, number, and what they need (and it isn't spam). " +
      "Provide a short spoken summary the staff will hear.",
    parameters: {
      type: "object",
      properties: {
        summary: {
          type: "string",
          description: "One or two sentences: who, what they need, where. Spoken to staff.",
        },
        urgency: {
          type: "string",
          enum: ["normal", "high", "emergency"],
          description: "How urgent. Use emergency only for safety/stranded situations.",
        },
        callback_number: { type: "string", description: "Best number to reach the caller." },
      },
      required: ["summary"],
    },
  },
  {
    name: "escalate_to_human",
    description:
      "Hand the call to a human when the caller demands a person, is upset, or the situation is " +
      "beyond you. Stay calm, don't argue. This raises an urgent staff alert and logs the call for " +
      "immediate human follow-up. Tell the caller a team member will reach out right away.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why you're escalating (e.g. 'caller demands a human')." },
        summary: { type: "string", description: "Short summary of the situation for the human." },
      },
      required: ["reason"],
    },
  },
  {
    name: "mark_spam",
    description:
      "Mark this call as spam, a sales/vendor pitch, or a robocall. Use when the caller is clearly " +
      "not a customer. After calling this, end the call politely. Do NOT notify staff or create a lead.",
    parameters: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Why it's spam (e.g. 'insurance sales robocall')." },
      },
      required: [],
    },
  },
  {
    name: "create_follow_up_task",
    description:
      "Create a follow-up task for the team. Use type 'quote_request' whenever the caller asks about " +
      "price/cost (you must NEVER quote a number yourself — the owner will text an exact quote). Use " +
      "'callback' for out-of-area or 'please call me back' situations.",
    parameters: {
      type: "object",
      properties: {
        type: {
          type: "string",
          enum: ["quote_request", "callback", "general"],
          description: "Kind of follow-up.",
        },
        title: { type: "string", description: "Short title, e.g. 'Quote: tow from I-40 to downtown'." },
        details: { type: "string", description: "Any specifics the team needs." },
      },
      required: ["type", "title"],
    },
  },
];
