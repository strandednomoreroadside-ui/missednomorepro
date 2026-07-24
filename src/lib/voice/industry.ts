/**
 * Industry-aware prompt behavior. PURE — no I/O, no secrets (same convention
 * as the pricing engine), so it's directly unit-testable.
 *
 * The setup wizard promises "pick your trade so the AI talks like it knows
 * your work", but until now `industry` only appeared in the prompt as a
 * parenthetical label — it changed no behavior. That left roadside-specific
 * intake baked into EVERY tenant's prompt: a plumbing, cleaning, or
 * landscaping business had an AI asking each caller for their vehicle's
 * year, make, and model.
 *
 * These predicates gate the parts of the call script that only make sense
 * for some trades. Matching is substring-based on a normalized string so a
 * free-typed industry ("Auto repair & towing") still resolves correctly, and
 * anything unrecognized falls back to the safe general-trade behavior.
 */

function normalize(industry: string | null | undefined): string {
  return (industry ?? "").toLowerCase().trim();
}

/** Trades where the caller's VEHICLE is the thing being worked on, so its
 *  year/make/model is core intake (and a tow may need a drop-off point). */
const VEHICLE_KEYWORDS = [
  "roadside",
  "towing",
  "tow ",
  "mobile mechanic",
  "auto",
  "automotive",
  "car ",
  "vehicle",
  "fleet",
  "tire",
  "collision",
  "body shop",
];

/**
 * Should the AI collect the caller's vehicle (year/make/model)?
 *
 * True for roadside/towing/mobile-mechanic-style trades. False for the home
 * trades (HVAC, plumbing, cleaning, landscaping, …), where asking a caller
 * about their car is a non-sequitur that damages trust on the first call.
 */
export function capturesVehicle(industry: string | null | undefined): boolean {
  const v = normalize(industry);
  if (!v) return false;
  return VEHICLE_KEYWORDS.some((k) => v.includes(k));
}

/** Trades where the CUSTOMER travels to a fixed location (salon, barber,
 *  spa, clinic, shop) rather than the business driving out to them. */
const LOCATION_KEYWORDS = [
  "salon",
  "barber",
  "spa",
  "studio",
  "clinic",
  "dental",
  "dentist",
  "restaurant",
  "retail",
  "gym",
  "repair shop",
];

/**
 * Does this business drive out to the customer?
 *
 * Defaults to TRUE — every niche shipped today is a mobile service, and the
 * whole intake script (service address, service-area check, dispatch) assumes
 * it. Location-based trades invert that, so they're opted out explicitly.
 */
export function travelsToCustomer(industry: string | null | undefined): boolean {
  const v = normalize(industry);
  if (!v) return true;
  return !LOCATION_KEYWORDS.some((k) => v.includes(k));
}
