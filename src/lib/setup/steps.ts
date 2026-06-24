/** Setup wizard step registry + option lists (master plan Phase 3, §1.3). */

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
    blurb: "Pick your trade so the AI talks like it knows your work.",
    required: true,
  },
  services: {
    title: "Services",
    blurb: "What you offer — the AI only discusses services on this list.",
    required: true,
  },
  pricing: {
    title: "Pricing rules",
    blurb:
      "Simple flat or starting prices. The AI never invents a number — anything not listed here gets “the owner will text you an exact quote.”",
    required: true,
  },
  "service-area": {
    title: "Service area",
    blurb:
      "Your home base and how far you travel. Callers inside your radius are covered; those outside are politely declined.",
    required: true,
  },
  hours: {
    title: "Business hours",
    blurb: "When you operate. Booking (at M9) only happens inside these windows.",
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
  launch: {
    title: "Review & launch",
    blurb: "Approve pricing, hours, and service area — then go live.",
    required: true,
  },
};

/** Primary niches from master plan §1.3. */
export const NICHES = [
  "Roadside assistance",
  "Towing",
  "HVAC",
  "Plumbing",
  "Electrician",
  "Roofing",
  "Garage door repair",
  "Pest control",
  "Landscaping",
  "Cleaning",
  "Locksmith",
  "Mobile mechanic",
  "Appliance repair",
  "Handyman",
] as const;

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
