/** Add-on catalog — optional paid modules layered on top of a base plan
 *  (vision pricing, June 2026). Sold as separate Stripe subscription items;
 *  entitlements live in tenant_addons and are mirrored from Stripe by the
 *  webhook. Add-ons are LLM/text based → high margin.
 *
 *  July 2026 simplification: four of the six add-ons (omnichannel_chat,
 *  business_assistant, reputation_manager, call_intelligence) cost pennies
 *  to run — no reason to nickel-and-dime them. They're now included free on
 *  every plan via plan_limits.feature_flags_json (see the migration this
 *  landed with), and growth_suite_bundle (which only ever repackaged three
 *  of them) no longer makes sense as a bundle. All five are marked
 *  `retired: true` here — kept in the catalog (not deleted) purely so an
 *  existing paid subscriber can still see and remove that Stripe
 *  subscription item; `retired` addons are never offered to new buyers.
 *  outbound_assistant is the one add-on with real usage-scaling cost (it
 *  sends actual SMS/voice campaigns), so it stays the sole paid add-on. */

export const ADDON_ORDER = [
  "outbound_assistant",
  "omnichannel_chat",
  "business_assistant",
  "growth_suite_bundle",
  "reputation_manager",
  "call_intelligence",
] as const;

export type AddonKey = (typeof ADDON_ORDER)[number];

export type AddonMeta = {
  name: string;
  monthly: number; // dollars
  blurb: string;
  highlights: string[];
  /** Bundle: activating this grants these member add-ons too. */
  grantsAddons?: AddonKey[];
  /** Feature flags this add-on unlocks (OR'd with plan flags). */
  grantsFeatures?: string[];
  /** No longer sold — every plan already grants its feature(s) for free.
   *  Kept in the catalog only so an existing paid subscriber can still see
   *  and remove the old Stripe subscription item. */
  retired?: boolean;
};

export const ADDON_META: Record<AddonKey, AddonMeta> = {
  outbound_assistant: {
    name: "AI Outbound Assistant",
    monthly: 49,
    blurb: "Proactive texts that bring work back in",
    highlights: [
      "Estimate & quote follow-ups",
      "Win-back + re-engagement",
      "Membership renewal reminders",
      "AI texting campaigns",
    ],
    grantsFeatures: ["outbound_assistant"],
  },
  omnichannel_chat: {
    name: "Omnichannel AI Chat",
    monthly: 29,
    blurb: "One AI brain across every channel — now included free on every plan.",
    highlights: ["Website chat", "Two-way AI SMS", "Facebook Messenger", "Unified inbox"],
    grantsFeatures: ["omnichannel_chat", "web_chat"],
    retired: true,
  },
  business_assistant: {
    name: "AI Business Assistant",
    monthly: 39,
    blurb: "Ask your business anything — now included free on every plan.",
    highlights: [
      "Natural-language CRM queries",
      "“Who needs follow-up?”",
      "“How are we doing this week?”",
    ],
    grantsFeatures: ["business_assistant"],
    retired: true,
  },
  growth_suite_bundle: {
    name: "AI Growth Suite",
    monthly: 100,
    blurb:
      "Retired — Omnichannel Chat and Business Assistant are now free on every plan; Outbound Assistant is available on its own.",
    highlights: ["Outbound Assistant", "Omnichannel Chat", "Business Assistant"],
    grantsAddons: ["outbound_assistant", "omnichannel_chat", "business_assistant"],
    retired: true,
  },
  reputation_manager: {
    name: "AI Reputation Manager",
    monthly: 29,
    blurb: "More 5-star reviews, fewer public 1-stars — now included free on every plan.",
    highlights: [
      "Google & Facebook review requests",
      "Unhappy customers routed to private feedback",
      "AI review responses (Google)",
      "Weekly reputation report",
    ],
    grantsFeatures: ["reputation_manager"],
    retired: true,
  },
  call_intelligence: {
    name: "AI Call Intelligence",
    monthly: 19,
    blurb: "A weekly read on what your calls are telling you — now included free on every plan.",
    highlights: [
      "Booking & transfer rate",
      "Missed opportunities + common questions",
      "Revenue estimate + call sentiment",
      "AI recommendations",
    ],
    grantsFeatures: ["call_intelligence"],
    retired: true,
  },
};

/** Add-ons still offered to new buyers (excludes retired/included-free ones). */
export const PURCHASABLE_ADDON_ORDER = ADDON_ORDER.filter((k) => !ADDON_META[k].retired);

export function addonLookupKey(key: AddonKey): string {
  return `addon_${key}`;
}

export const ALL_ADDON_LOOKUP_KEYS = ADDON_ORDER.map(addonLookupKey);

export function parseAddonLookupKey(key: string | null | undefined): AddonKey | null {
  if (!key) return null;
  const m = /^addon_(outbound_assistant|omnichannel_chat|business_assistant|growth_suite_bundle|reputation_manager|call_intelligence)$/.exec(
    key
  );
  return m ? (m[1] as AddonKey) : null;
}

export function isAddonKey(value: string | null | undefined): value is AddonKey {
  return !!value && (ADDON_ORDER as readonly string[]).includes(value);
}

/** Expand directly-purchased add-ons into the full set the tenant is
 *  entitled to (the bundle grants its three members). */
export function effectiveAddonKeys(active: Iterable<AddonKey>): Set<AddonKey> {
  const out = new Set<AddonKey>();
  for (const key of active) {
    out.add(key);
    for (const granted of ADDON_META[key].grantsAddons ?? []) out.add(granted);
  }
  return out;
}

/** True when an active (expanded) add-on set unlocks a given feature flag. */
export function addonGrantsFeature(effective: Set<AddonKey>, feature: string): boolean {
  for (const key of effective) {
    if (ADDON_META[key].grantsFeatures?.includes(feature)) return true;
  }
  return false;
}
