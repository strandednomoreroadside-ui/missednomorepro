/** Add-on catalog — optional paid modules layered on top of a base plan
 *  (vision pricing, June 2026). Sold as separate Stripe subscription items;
 *  entitlements live in tenant_addons and are mirrored from Stripe by the
 *  webhook. Add-ons are LLM/text based → high margin. */

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
    blurb: "One AI brain across every channel",
    highlights: ["Website chat", "Two-way AI SMS", "Facebook Messenger", "Unified inbox"],
    grantsFeatures: ["omnichannel_chat", "web_chat"],
  },
  business_assistant: {
    name: "AI Business Assistant",
    monthly: 39,
    blurb: "Ask your business anything",
    highlights: [
      "Natural-language CRM queries",
      "“Who needs follow-up?”",
      "“How are we doing this week?”",
    ],
    grantsFeatures: ["business_assistant"],
  },
  growth_suite_bundle: {
    name: "AI Growth Suite",
    monthly: 100,
    blurb: "All three growth add-ons, bundled (save $17/mo)",
    highlights: ["Outbound Assistant", "Omnichannel Chat", "Business Assistant"],
    grantsAddons: ["outbound_assistant", "omnichannel_chat", "business_assistant"],
  },
  reputation_manager: {
    name: "AI Reputation Manager",
    monthly: 29,
    blurb: "More 5-star reviews, fewer public 1-stars",
    highlights: [
      "Google & Facebook review requests",
      "Unhappy customers routed to private feedback",
      "AI review responses (Google)",
      "Weekly reputation report",
    ],
    grantsFeatures: ["reputation_manager"],
  },
  call_intelligence: {
    name: "AI Call Intelligence",
    monthly: 19,
    blurb: "A weekly read on what your calls are telling you",
    highlights: [
      "Booking & transfer rate",
      "Missed opportunities + common questions",
      "Revenue estimate + call sentiment",
      "AI recommendations",
    ],
    grantsFeatures: ["call_intelligence"],
  },
};

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
