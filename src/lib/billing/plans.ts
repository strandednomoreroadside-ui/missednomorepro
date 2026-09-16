/** Plan catalog — the public pricing tiers.
 *
 *  Sept 2026 (3-tier simplification, operator decision): traded margin per
 *  account for signup volume while the product is still building its first
 *  case studies. Voice minutes are the only material COGS — the blended
 *  rate this app actually models is $0.15/min (cost-controls.ts
 *  COST_PER_MINUTE, finalize.ts), not the older ~$0.10-0.13 estimate this
 *  comment used to cite. There's no metered overage (reversed to a hard
 *  cap — see the plan-picker copy in dashboard/billing/page.tsx): once a
 *  plan's minutes run out, calls forward to the owner's phone. That makes
 *  included minutes a hard ceiling on monthly voice cost per tenant, not
 *  just a soft average, so minutes below are sized to stay gross-margin-
 *  positive even at 100% utilization — thinner than the old 70%-safe
 *  target, deliberately, in exchange for lower prices and more signups. */

// Every plan id we've ever sold, including retired ones (PlanMeta.retired).
// SELF_SERVE_PLAN_ORDER below is what's actually offered to new signups —
// never remove a plan id from here, or an existing subscriber still on it
// resolves to "none" via effectivePlan()'s stale-id guard (subscription.ts)
// and loses their entitlements outright.
export const PLAN_ORDER = ["starter", "growth", "professional", "elite"] as const;
export type PlanId = (typeof PLAN_ORDER)[number];
// Enterprise is custom (contact sales) — no self-serve Stripe price, but it is
// a valid assigned plan, so it has metadata + a plan_limits row.
export type EffectivePlan = PlanId | "enterprise" | "none";

/** Every plan id the app recognises as an active entitlement. */
export const KNOWN_PLANS: readonly EffectivePlan[] = [...PLAN_ORDER, "enterprise"];

export function isKnownPlan(value: string | null | undefined): value is Exclude<EffectivePlan, "none"> {
  return !!value && (KNOWN_PLANS as readonly string[]).includes(value);
}

export type PlanMeta = {
  name: string;
  monthly: number; // dollars (0 for custom/enterprise)
  annualMonthly: number; // effective $/mo when billed annually
  blurb: string;
  minutes: string;
  highlights: string[];
  popular?: boolean;
  custom?: boolean; // enterprise: "contact sales", no self-serve checkout
  /** No longer offered to new signups (Sept 2026 3-tier simplification).
   *  Kept in PLAN_META + plan_limits so an existing subscriber's plan still
   *  resolves correctly — never delete a retired plan id outright. */
  retired?: boolean;
};

export const PLAN_META: Record<PlanId | "enterprise", PlanMeta> = {
  starter: {
    name: "Starter",
    monthly: 50,
    annualMonthly: 40,
    blurb: "Solo operators who never want to miss a call",
    minutes: "200 AI minutes",
    highlights: [
      "AI receptionist + basic CRM",
      "Booking, cancel & reschedule",
      "Human transfer + Google Calendar",
      "Website chat + AI business insights",
      "Review requests + missed-call recovery",
      "1 user",
    ],
  },
  growth: {
    name: "Growth",
    monthly: 100,
    annualMonthly: 80,
    blurb: "Teams that want more leads converted",
    minutes: "400 AI minutes",
    highlights: [
      "Everything in Starter",
      "Lead pipeline + customer timeline",
      "AI follow-ups, reminders & quote intake",
      "Payment requests + analytics dashboard",
      "3 users",
    ],
    popular: true,
  },
  professional: {
    name: "Professional",
    monthly: 200,
    annualMonthly: 160,
    blurb: "Growing teams that dispatch and need insight",
    minutes: "800 AI minutes",
    highlights: [
      "Everything in Growth",
      "Dispatch board + team calendar",
      "Make & Zapier integrations",
      "10 users",
    ],
  },
  elite: {
    name: "Elite",
    monthly: 479,
    annualMonthly: 383.2,
    blurb: "Higher-volume teams ready for advanced automation",
    minutes: "1,500 AI minutes",
    highlights: [
      "Everything in Professional",
      "Additional business phone numbers",
      "Membership management",
      "API access + advanced automations",
      "25 users",
    ],
    // Retired from self-serve (Sept 2026) — Professional is now the top
    // self-serve tier; anyone who needs more goes to Enterprise. Left fully
    // intact so an existing Elite subscriber's plan, Stripe price, and
    // entitlements keep working untouched.
    retired: true,
  },
  enterprise: {
    name: "Enterprise",
    monthly: 0,
    annualMonthly: 0,
    blurb: "Organizations needing custom volume and support",
    minutes: "Custom minutes",
    highlights: [
      "Custom minutes & pricing",
      "Dedicated onboarding",
      "Custom integrations",
      "Priority support",
    ],
    custom: true,
  },
};

/** Tiers actually offered to new/switching customers — every checkout
 *  button, Stripe price sync, and plan-deep-link check should read this,
 *  not PLAN_ORDER, so a retired plan can never be (re)selected. */
export const SELF_SERVE_PLAN_ORDER = PLAN_ORDER.filter((p) => !PLAN_META[p].retired);

export function lookupKey(plan: PlanId, interval: "month" | "year") {
  return `plan_${plan}_${interval === "year" ? "annual" : "monthly"}`;
}

export const ALL_LOOKUP_KEYS = SELF_SERVE_PLAN_ORDER.flatMap((p) => [
  lookupKey(p, "month"),
  lookupKey(p, "year"),
]);

/** Parses a Stripe price lookup key back into plan + interval. */
export function parseLookupKey(
  key: string | null | undefined
): { plan: PlanId; interval: "month" | "year" } | null {
  if (!key) return null;
  const m = /^plan_(starter|growth|professional|elite)_(monthly|annual)$/.exec(key);
  if (!m) return null;
  return { plan: m[1] as PlanId, interval: m[2] === "annual" ? "year" : "month" };
}
