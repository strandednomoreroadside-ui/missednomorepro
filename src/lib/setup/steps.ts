/** Setup wizard step registry + option lists (master plan Phase 3, §1.3). */

import { NICHE_CATALOG, OTHER_NICHE } from "./niches";

export const STEP_ORDER = [
  "profile",
  "industry",
  "services",
  "pricing",
  "service-area",
  "hours",
  "notifications",
  "sms",
  "faqs",
  "phone",
  "launch",
] as const;

export type StepId = (typeof STEP_ORDER)[number];

export function isStepId(value: string): value is StepId {
  return (STEP_ORDER as readonly string[]).includes(value);
}

export type StepMeta = {
  title: string;
  blurb: string;
  /** Optional steps don't block launch. */
  required: boolean;
};

export const STEP_META: Record<StepId, StepMeta> = {
  profile: {
    title: "Business profile",
    blurb: "The basics the AI uses to introduce your business.",
    required: true,
  },
  industry: {
    title: "Industry",
    blurb: "Pick your category and business type so the AI asks callers the right questions.",
    required: true,
  },
  services: {
    title: "Services",
    blurb: "What you offer — the AI only discusses services on this list.",
    required: true,
  },
  pricing: {
    title: "Pricing & quoting",
    blurb:
      "How your AI talks about price. The AI never invents a number — real prices and live quoting are set up on the Prices & Services page.",
    required: false,
  },
  "service-area": {
    title: "Service area",
    blurb:
      "Your home base and how far you travel. Callers inside your radius are covered; those outside are politely declined.",
    required: true,
  },
  hours: {
    title: "Business hours",
    blurb: "When you operate. Booking only happens inside these windows.",
    required: true,
  },
  notifications: {
    title: "Staff notifications",
    blurb: "Who gets alerted when a new lead calls.",
    required: true,
  },
  sms: {
    title: "Text messaging",
    blurb: "How the AI asks customers for permission to text them.",
    required: true,
  },
  faqs: {
    title: "FAQs",
    blurb: "Questions callers ask and the answers the AI may give. Optional but recommended.",
    required: false,
  },
  phone: {
    title: "Phone number",
    blurb: "Get a business number — a new one, or forwarding for the one you already use.",
    required: true,
  },
  launch: {
    title: "Review & launch",
    blurb: "Approve pricing, hours, and service area — then go live.",
    required: true,
  },
};

/** Every industry a business can pick in setup: the catalog's sub-niches
 *  (grouped into categories in the UI) plus "Other", which falls back to the
 *  general on-site call script. See ./niches. */
export const NICHES: string[] = [...NICHE_CATALOG.map((n) => n.name), OTHER_NICHE];

export const US_TIMEZONES = [
  { value: "America/New_York", label: "Eastern (New York)" },
  { value: "America/Chicago", label: "Central (Chicago)" },
  { value: "America/Denver", label: "Mountain (Denver)" },
  { value: "America/Phoenix", label: "Arizona (no DST)" },
  { value: "America/Los_Angeles", label: "Pacific (Los Angeles)" },
  { value: "America/Anchorage", label: "Alaska" },
  { value: "Pacific/Honolulu", label: "Hawaii" },
] as const;

export const DAYS = [
  { dow: 0, label: "Sunday" },
  { dow: 1, label: "Monday" },
  { dow: 2, label: "Tuesday" },
  { dow: 3, label: "Wednesday" },
  { dow: 4, label: "Thursday" },
  { dow: 5, label: "Friday" },
  { dow: 6, label: "Saturday" },
] as const;
