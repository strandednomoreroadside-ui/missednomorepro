/** Plan catalog (master plan §6.1) — UI metadata + Stripe lookup keys. */

export const PLAN_ORDER = ["answer", "book", "revenue", "scale", "agency"] as const;
export type PlanId = (typeof PLAN_ORDER)[number];
export type EffectivePlan = PlanId | "none";

export type PlanMeta = {
  name: string;
  monthly: number; // dollars
  annualMonthly: number; // effective $/mo when billed annually
  blurb: string;
  highlights: string[];
  popular?: boolean;
};

export const PLAN_META: Record<PlanId, PlanMeta> = {
  answer: {
    name: "Answer",
    monthly: 99,
    annualMonthly: 79.2,
    blurb: "Solo operators replacing voicemail",
    highlights: ["500 AI minutes", "1 concurrent call", "1,000 texts", "1 user"],
  },
  book: {
    name: "Book",
    monthly: 199,
    annualMonthly: 159.2,
    blurb: "Teams that want appointments booked",
    highlights: ["1,500 AI minutes", "2 concurrent calls", "3,000 texts", "3 users"],
  },
  revenue: {
    name: "Revenue",
    monthly: 349,
    annualMonthly: 279.2,
    blurb: "Quoting, deposits, and job creation",
    highlights: ["3,000 AI minutes", "4 concurrent calls", "7,500 texts", "10 users"],
    popular: true,
  },
  scale: {
    name: "Scale",
    monthly: 599,
    annualMonthly: 479.2,
    blurb: "High-volume and multi-location teams",
    highlights: ["6,000 AI minutes", "8 concurrent calls", "15,000 texts", "25 users"],
  },
  agency: {
    name: "Agency",
    monthly: 899,
    annualMonthly: 719.2,
    blurb: "Agencies managing multiple clients",
    highlights: ["10,000 pooled minutes", "20 pooled calls", "30,000 texts", "+$89/location"],
  },
};

export function lookupKey(plan: PlanId, interval: "month" | "year") {
  return `plan_${plan}_${interval === "year" ? "annual" : "monthly"}`;
}

export const ALL_LOOKUP_KEYS = PLAN_ORDER.flatMap((p) => [
  lookupKey(p, "month"),
  lookupKey(p, "year"),
]);

/** Parses a Stripe price lookup key back into plan + interval. */
export function parseLookupKey(
  key: string | null | undefined
): { plan: PlanId; interval: "month" | "year" } | null {
  if (!key) return null;
  const m = /^plan_(answer|book|revenue|scale|agency)_(monthly|annual)$/.exec(key);
  if (!m) return null;
  return { plan: m[1] as PlanId, interval: m[2] === "annual" ? "year" : "month" };
}
