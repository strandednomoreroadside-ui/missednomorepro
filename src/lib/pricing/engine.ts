/**
 * Deterministic quote engine. PURE — no I/O. Given a business's approved
 * rules + a real driving distance + the call time, it produces an itemized,
 * exact quote for a single trip. The AI's calculate_quote tool calls this and
 * reads the result back verbatim; the LLM never computes a price itself.
 *
 * A trip is ONE visit to ONE location that may perform SEVERAL services. So:
 *
 * Total = zone dispatch fee (by miles from home base)     <- charged ONCE
 *       + service fee for EACH service (flat, or tow = hook + per-mile × miles)
 *       + auto time-window surcharges (e.g. late-night)    <- charged ONCE
 *
 * Charging the dispatch/trip fee per service would over-bill a caller who asks
 * for two things at one stop, so it is added a single time for the visit.
 * Conditional surcharges are returned for the AI to MENTION, never added.
 */

export interface PricingZone {
  zone_number: number;
  min_miles: number;
  max_miles: number;
  dispatch_fee: number;
}

export interface ServicePrice {
  name: string;
  pricing_type: "flat" | "tow";
  service_fee: number;
  hook_fee: number | null;
  per_mile_rate: number | null;
  /** Tow only: included miles before the per-mile rate kicks in. */
  free_miles: number | null;
  variable_part: string | null;
  available_start: string | null; // "HH:MM[:SS]"
  available_end: string | null;
}

export interface Surcharge {
  name: string;
  amount: number;
  apply_type: "auto_time" | "conditional";
  window_start: string | null;
  window_end: string | null;
}

export interface QuoteLine {
  label: string;
  amount: number;
}

/** One service on a trip, with its tow distance when it's a tow. */
export interface QuoteServiceInput {
  service: ServicePrice;
  /** Tow only: pickup → drop-off driving miles for THIS service. */
  towMiles?: number | null;
}

export interface QuoteInput {
  /** Every service the caller wants at this stop. One dispatch fee covers all. */
  services: QuoteServiceInput[];
  zones: PricingZone[];
  surcharges: Surcharge[];
  /** Driving miles from home base to the customer (tow: to the pickup). */
  distanceMiles: number;
  maxServiceMiles: number;
  /** Business-local call time, for availability + auto surcharges. */
  localTime: { hour: number; minute: number };
  currency?: string;
}

export interface QuoteResult {
  ok: boolean;
  /** Set when ok=false: out_of_area | service_unavailable | no_zone | need_destination | no_service */
  reason?: string;
  /** Services actually priced into the total. */
  services: string[];
  /** Requested services outside their availability window — MENTION, not charged. */
  unavailableServices: { name: string; window: { start: string; end: string } }[];
  zoneNumber?: number;
  lines: QuoteLine[];
  total: number;
  /** Services with a variable add-on (e.g. the tire), for the AI to disclose. */
  variableParts: { service: string; part: string }[];
  /** Conditional surcharges to MENTION (not added to total). */
  possibleSurcharges: { name: string; amount: number }[];
  miles: number;
  currency: string;
}

function money(n: number): number {
  return Math.round(n * 100) / 100;
}

/** "HH:MM[:SS]" → minutes since midnight, or null. */
function toMinutes(t: string | null): number | null {
  if (!t) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/** Is `minutes` inside [start, end), handling overnight windows (21:00–05:00)? */
function inWindow(minutes: number, start: number, end: number): boolean {
  if (start === end) return false;
  return start < end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** First zone (by ascending max_miles) that covers `miles`, else null. */
export function resolveZone(zones: PricingZone[], miles: number): PricingZone | null {
  const sorted = [...zones].sort((a, b) => a.max_miles - b.max_miles);
  for (const z of sorted) if (miles <= z.max_miles) return z;
  return null;
}

/** Can this service be performed at `minutes` (its availability window)? */
function serviceAvailable(service: ServicePrice, minutes: number): boolean {
  const start = toMinutes(service.available_start);
  const end = toMinutes(service.available_end);
  if (start == null || end == null) return true;
  return inWindow(minutes, start, end);
}

/** Fee line(s) for one service — NO dispatch, NO surcharges. Returns null when
 *  a tow is missing its drop-off distance (can't be priced yet). */
function serviceFeeLines(item: QuoteServiceInput): QuoteLine[] | null {
  const s = item.service;
  if (s.pricing_type === "tow") {
    if (item.towMiles == null) return null;
    const hook = s.hook_fee ?? 0;
    const rate = s.per_mile_rate ?? 0;
    const free = s.free_miles ?? 0;
    const towMiles = money(item.towMiles);
    const chargeableMiles = Math.max(0, item.towMiles - free);
    return [
      { label: "Tow hook fee", amount: money(hook) },
      {
        label:
          `Towing ${towMiles} mi @ $${rate.toFixed(2)}/mi` +
          (free > 0 ? ` (first ${free} free)` : ""),
        amount: money(rate * chargeableMiles),
      },
    ];
  }
  return [{ label: s.name, amount: money(s.service_fee) }];
}

export function calculateQuote(input: QuoteInput): QuoteResult {
  const currency = input.currency ?? "usd";
  const minutes = input.localTime.hour * 60 + input.localTime.minute;
  const base: QuoteResult = {
    ok: false,
    services: [],
    unavailableServices: [],
    lines: [],
    total: 0,
    variableParts: [],
    possibleSurcharges: [],
    miles: money(input.distanceMiles),
    currency,
  };

  // 0. Nothing to price.
  if (input.services.length === 0) return { ...base, reason: "no_service" };

  // 1. Out of service area (one location for the whole visit).
  if (input.distanceMiles > input.maxServiceMiles) {
    return { ...base, reason: "out_of_area" };
  }

  // 2. Zone dispatch fee — charged ONCE for the trip.
  const zone = resolveZone(input.zones, input.distanceMiles);
  if (!zone) return { ...base, reason: "no_zone" };

  // 3. A tow missing its drop-off can't be priced — pause the whole quote and
  //    ask for the destination, then re-quote every service together.
  const towNeedingDest = input.services.find(
    (i) => i.service.pricing_type === "tow" && i.towMiles == null
  );
  if (towNeedingDest) {
    return { ...base, reason: "need_destination", services: [towNeedingDest.service.name] };
  }

  // 4. One dispatch line, then a fee line per AVAILABLE service. Services
  //    outside their window are surfaced (to mention) but never charged.
  const lines: QuoteLine[] = [
    { label: `Dispatch (Zone ${zone.zone_number})`, amount: money(zone.dispatch_fee) },
  ];
  const priced: string[] = [];
  const unavailable: QuoteResult["unavailableServices"] = [];
  const variableParts: QuoteResult["variableParts"] = [];

  for (const item of input.services) {
    const svc = item.service;
    if (!serviceAvailable(svc, minutes)) {
      unavailable.push({
        name: svc.name,
        window: { start: svc.available_start!, end: svc.available_end! },
      });
      continue;
    }
    const feeLines = serviceFeeLines(item);
    if (!feeLines) continue; // tow-without-destination guarded in step 3
    lines.push(...feeLines);
    priced.push(svc.name);
    if (svc.variable_part) variableParts.push({ service: svc.name, part: svc.variable_part });
  }

  // 5. Every requested service is unavailable at this time.
  if (priced.length === 0) {
    return { ...base, reason: "service_unavailable", unavailableServices: unavailable };
  }

  // 6. Auto time-window surcharges (e.g. late-night) — applied ONCE to the trip.
  for (const s of input.surcharges) {
    if (s.apply_type !== "auto_time") continue;
    const ws = toMinutes(s.window_start);
    const we = toMinutes(s.window_end);
    if (ws != null && we != null && inWindow(minutes, ws, we)) {
      lines.push({ label: s.name, amount: money(s.amount) });
    }
  }

  // 7. Conditional surcharges — surfaced, not added.
  const possible = input.surcharges
    .filter((s) => s.apply_type === "conditional")
    .map((s) => ({ name: s.name, amount: money(s.amount) }));

  const total = money(lines.reduce((sum, l) => sum + l.amount, 0));

  return {
    ...base,
    ok: true,
    zoneNumber: zone.zone_number,
    services: priced,
    unavailableServices: unavailable,
    lines,
    total,
    variableParts,
    possibleSurcharges: possible,
  };
}
