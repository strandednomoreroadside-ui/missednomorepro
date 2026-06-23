import { describe, it, expect } from "vitest";

import {
  calculateQuote,
  resolveZone,
  type PricingZone,
  type ServicePrice,
  type Surcharge,
  type QuoteInput,
} from "@/lib/pricing/engine";

/**
 * Golden cases for the deterministic quote engine — the crown jewel of the
 * §5.1 "never invent a price" promise. The AI reads these numbers back
 * verbatim, so a regression here is a spoken wrong price. Mirrors the seeded
 * Stranded No More rule sheet.
 */

const ZONES: PricingZone[] = [
  { zone_number: 1, min_miles: 0, max_miles: 8, dispatch_fee: 55 },
  { zone_number: 2, min_miles: 8, max_miles: 16, dispatch_fee: 65 },
  { zone_number: 3, min_miles: 16, max_miles: 25, dispatch_fee: 75 },
];

const flat = (over: Partial<ServicePrice> & Pick<ServicePrice, "name" | "service_fee">): ServicePrice => ({
  pricing_type: "flat",
  hook_fee: null,
  per_mile_rate: null,
  free_miles: null,
  variable_part: null,
  available_start: null,
  available_end: null,
  ...over,
});

const JUMP = flat({ name: "Jump Start", service_fee: 40 });
const TIRE_NO_SPARE = flat({
  name: "Tire Change (no spare)",
  service_fee: 80,
  variable_part: "tire",
  available_start: "09:00",
  available_end: "16:00",
});
const TOW: ServicePrice = {
  name: "Tow",
  pricing_type: "tow",
  service_fee: 0,
  hook_fee: 60,
  per_mile_rate: 2.5,
  free_miles: 5,
  variable_part: null,
  available_start: null,
  available_end: null,
};

const LATE_NIGHT: Surcharge = {
  name: "Late night",
  amount: 20,
  apply_type: "auto_time",
  window_start: "21:00",
  window_end: "05:00",
};
const SEVERE_WEATHER: Surcharge = {
  name: "Severe weather",
  amount: 25,
  apply_type: "conditional",
  window_start: null,
  window_end: null,
};

const base = (over: Partial<QuoteInput>): QuoteInput => ({
  service: JUMP,
  zones: ZONES,
  surcharges: [],
  distanceMiles: 5,
  maxServiceMiles: 25,
  localTime: { hour: 12, minute: 0 },
  ...over,
});

describe("calculateQuote — flat services", () => {
  it("Zone 1 jump: dispatch + service fee", () => {
    const q = calculateQuote(base({ distanceMiles: 5 }));
    expect(q.ok).toBe(true);
    expect(q.zoneNumber).toBe(1);
    expect(q.total).toBe(95); // 55 + 40
    expect(q.lines).toHaveLength(2);
  });

  it("Zone 2 jump picks the correct zone fee", () => {
    const q = calculateQuote(base({ distanceMiles: 12 }));
    expect(q.zoneNumber).toBe(2);
    expect(q.total).toBe(105); // 65 + 40
  });

  it("out of service area returns out_of_area, never a price", () => {
    const q = calculateQuote(base({ distanceMiles: 30 }));
    expect(q.ok).toBe(false);
    expect(q.reason).toBe("out_of_area");
    expect(q.total).toBe(0);
    expect(q.miles).toBe(30);
  });
});

describe("calculateQuote — tow (hook + per-mile after free miles)", () => {
  it("charges only miles beyond the free allowance", () => {
    const q = calculateQuote(
      base({ service: TOW, distanceMiles: 10, towMiles: 20 })
    );
    expect(q.ok).toBe(true);
    // zone 2 (65) + hook (60) + (20 - 5 free) * 2.50 = 65 + 60 + 37.50
    expect(q.total).toBe(162.5);
    expect(q.lines).toHaveLength(3);
  });

  it("free miles never produce a negative towing charge", () => {
    const q = calculateQuote(base({ service: TOW, distanceMiles: 5, towMiles: 3 }));
    expect(q.total).toBe(115); // Zone 1 dispatch 55 + hook 60 + 0 towing
  });

  it("refuses to price a tow without a destination", () => {
    const q = calculateQuote(base({ service: TOW, distanceMiles: 10, towMiles: null }));
    expect(q.ok).toBe(false);
    expect(q.reason).toBe("need_destination");
  });
});

describe("calculateQuote — availability windows", () => {
  it("quotes a windowed service inside its hours", () => {
    const q = calculateQuote(
      base({ service: TIRE_NO_SPARE, localTime: { hour: 10, minute: 0 } })
    );
    expect(q.ok).toBe(true);
    expect(q.total).toBe(135); // 55 + 80
    expect(q.variablePart).toBe("tire");
  });

  it("refuses a windowed service outside its hours", () => {
    const q = calculateQuote(
      base({ service: TIRE_NO_SPARE, localTime: { hour: 20, minute: 0 } })
    );
    expect(q.ok).toBe(false);
    expect(q.reason).toBe("service_unavailable");
    expect(q.availabilityWindow).toEqual({ start: "09:00", end: "16:00" });
  });
});

describe("calculateQuote — surcharges", () => {
  it("adds an auto time-window surcharge only inside the window (overnight)", () => {
    const night = calculateQuote(
      base({ surcharges: [LATE_NIGHT], localTime: { hour: 23, minute: 0 } })
    );
    expect(night.total).toBe(115); // 55 + 40 + 20

    const day = calculateQuote(
      base({ surcharges: [LATE_NIGHT], localTime: { hour: 12, minute: 0 } })
    );
    expect(day.total).toBe(95); // no surcharge midday
  });

  it("surfaces conditional surcharges but never adds them to the total", () => {
    const q = calculateQuote(base({ surcharges: [SEVERE_WEATHER] }));
    expect(q.total).toBe(95);
    expect(q.possibleSurcharges).toEqual([{ name: "Severe weather", amount: 25 }]);
  });
});

describe("resolveZone — boundary behavior", () => {
  it("picks the smallest zone whose max covers the distance", () => {
    expect(resolveZone(ZONES, 8)?.zone_number).toBe(1);
    expect(resolveZone(ZONES, 8.1)?.zone_number).toBe(2);
    expect(resolveZone(ZONES, 25)?.zone_number).toBe(3);
  });

  it("returns null past the furthest zone", () => {
    expect(resolveZone(ZONES, 26)).toBeNull();
  });
});
