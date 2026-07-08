/**
 * Deterministic quote engine. PURE — no I/O. Given a business's approved
 * rules + a real driving distance + the call time, it produces an itemized,
 * exact quote — for one service, or several quoted together in the SAME
 * visit. The AI's calculate_quote tool calls this and reads the result back
 * verbatim; the LLM never computes a price itself.
 *
 * Total = ONE zone dispatch fee (by miles from home base) — charged once
 *       for the whole visit, never once per service
 *       + each service's fee (flat, or tow = hook + per-mile × tow miles)
 *       + auto time-window surcharges (e.g. late-night), applied once.
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

export interface QuoteInput {
  /** One or more services quoted together in the same visit — the dispatch
   *  fee below is charged once for the whole list, never once per service. */
  services: ServicePrice[];
  zones: PricingZone[];
  surcharges: Surcharge[];
  /** Driving miles from home base to the customer (tow: to the pickup). */
  distanceMiles: number;
  /** Tow only: pickup → drop-off driving miles. */
  towMiles?: number | null;
  maxServiceMiles: number;
  /** Business-local call time, for availability + auto surcharges. */
  localTime: { hour: number; minute: number };
  currency?: string;
}

export interface QuoteResult {
  ok: boolean;
  /** Set when ok=false: out_of_area | service_unavailable | no_zone | need_destination */
  reason?: string;
  services: string[];
  zoneNumber?: number;
  lines: QuoteLine[];
  total: number;
  /** Non-null variable parts across the quoted services, e.g. ["tire"] → the
   *  AI says "+ the cost of the tire, confirmed before dispatch". */
  variableParts: string[];
  /** Conditional surcharges to MENTION (not added to total). */
  possibleSurcharges: { name: string; amount: number }[];
  miles: number;
  towMiles?: number | null;
  availabilityWindow?: { service: string; start: string; end: string };
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

export function calculateQuote(input: QuoteInput): QuoteResult {
  const currency = input.currency ?? "usd";
  const minutes = input.localTime.hour * 60 + input.localTime.minute;
  const base: QuoteResult = {
    ok: false,
    services: input.services.map((s) => s.name),
    lines: [],
    total: 0,
    variableParts: [],
    possibleSurcharges: [],
    miles: money(input.distanceMiles),
    towMiles: input.towMiles ?? null,
    currency,
  };

  // 1. Out of service area.
  if (input.distanceMiles > input.maxServiceMiles) {
    return { ...base, reason: "out_of_area" };
  }

  // 2. Service availability window (e.g. no-spare tire 9 AM–4 PM) — checked
  // for every requested service; the first one outside its window blocks
  // the whole quote.
  for (const svc of input.services) {
    const availStart = toMinutes(svc.available_start);
    const availEnd = toMinutes(svc.available_end);
    if (availStart != null && availEnd != null && !inWindow(minutes, availStart, availEnd)) {
      return {
        ...base,
        reason: "service_unavailable",
        availabilityWindow: {
          service: svc.name,
          start: svc.available_start!,
          end: svc.available_end!,
        },
      };
    }
  }

  // 3. ONE zone dispatch fee for the whole visit, regardless of how many
  // services are being quoted together.
  const zone = resolveZone(input.zones, input.distanceMiles);
  if (!zone) return { ...base, reason: "no_zone" };
  const lines: QuoteLine[] = [
    { label: `Dispatch (Zone ${zone.zone_number})`, amount: money(zone.dispatch_fee) },
  ];

  // 4. Each service's own fee.
  const variableParts: string[] = [];
  for (const svc of input.services) {
    if (svc.pricing_type === "tow") {
      if (input.towMiles == null) return { ...base, reason: "need_destination" };
      const hook = svc.hook_fee ?? 0;
      const rate = svc.per_mile_rate ?? 0;
      const free = svc.free_miles ?? 0;
      const towMiles = money(input.towMiles);
      const chargeableMiles = Math.max(0, input.towMiles - free);
      lines.push({ label: `${svc.name} — hook fee`, amount: money(hook) });
      lines.push({
        label:
          `Towing ${towMiles} mi @ $${rate.toFixed(2)}/mi` +
          (free > 0 ? ` (first ${free} free)` : ""),
        amount: money(rate * chargeableMiles),
      });
    } else {
      lines.push({ label: svc.name, amount: money(svc.service_fee) });
    }
    if (svc.variable_part && !variableParts.includes(svc.variable_part)) {
      variableParts.push(svc.variable_part);
    }
  }

  // 5. Auto time-window surcharges (e.g. late-night) — applied once per visit.
  for (const s of input.surcharges) {
    if (s.apply_type !== "auto_time") continue;
    const ws = toMinutes(s.window_start);
    const we = toMinutes(s.window_end);
    if (ws != null && we != null && inWindow(minutes, ws, we)) {
      lines.push({ label: s.name, amount: money(s.amount) });
    }
  }

  // 6. Conditional surcharges — surfaced, not added.
  const possible = input.surcharges
    .filter((s) => s.apply_type === "conditional")
    .map((s) => ({ name: s.name, amount: money(s.amount) }));

  const total = money(lines.reduce((sum, l) => sum + l.amount, 0));

  return {
    ...base,
    ok: true,
    zoneNumber: zone.zone_number,
    lines,
    total,
    variableParts,
    possibleSurcharges: possible,
  };
}
