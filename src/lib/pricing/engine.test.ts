import assert from "node:assert/strict";
import test from "node:test";

import { calculateQuote, type ServicePrice, type Surcharge } from "./engine.ts";

const svc = (name: string, fee: number, extra: Partial<ServicePrice> = {}): ServicePrice => ({
  name,
  pricing_type: "flat",
  service_fee: fee,
  hook_fee: null,
  per_mile_rate: null,
  free_miles: null,
  variable_part: null,
  available_start: null,
  available_end: null,
  ...extra,
});

const surcharges: Surcharge[] = [
  { name: "Evening", amount: 10, apply_type: "auto_time", window_start: "18:00", window_end: "21:00" },
  { name: "Long hair", amount: 15, apply_type: "conditional", window_start: null, window_end: null },
];

test("in-shop quote: services plus auto surcharge, no trip, no zones needed", () => {
  const r = calculateQuote({
    services: [svc("Gel manicure", 45), svc("Pedicure", 50)],
    zones: [],
    surcharges,
    distanceMiles: 0,
    maxServiceMiles: 25,
    inShop: true,
    localTime: { hour: 19, minute: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(r.total, 105);
  assert.equal(r.miles, 0);
  assert.equal(r.zoneNumber, undefined);
  assert.deepEqual(r.lines.map((l) => l.label), ["Gel manicure", "Pedicure", "Evening"]);
  assert.deepEqual(r.possibleSurcharges, [{ name: "Long hair", amount: 15 }]);
});

test("in-shop quote ignores distance and service radius", () => {
  const r = calculateQuote({
    services: [svc("Haircut", 40)],
    zones: [],
    surcharges: [],
    distanceMiles: 999,
    maxServiceMiles: 5,
    inShop: true,
    localTime: { hour: 10, minute: 0 },
  });
  assert.equal(r.ok, true);
  assert.equal(r.total, 40);
});

test("travel businesses still need a zone and stay inside the radius", () => {
  const base = {
    services: [svc("Drain cleaning", 189)],
    surcharges: [],
    maxServiceMiles: 40,
    localTime: { hour: 10, minute: 0 },
  };
  assert.equal(calculateQuote({ ...base, zones: [], distanceMiles: 5 }).reason, "no_zone");
  assert.equal(
    calculateQuote({ ...base, zones: [{ zone_number: 1, min_miles: 0, max_miles: 40, dispatch_fee: 29 }], distanceMiles: 50 }).reason,
    "out_of_area"
  );
  const ok = calculateQuote({
    ...base,
    zones: [{ zone_number: 1, min_miles: 0, max_miles: 40, dispatch_fee: 29 }],
    distanceMiles: 10,
  });
  assert.equal(ok.total, 218);
  assert.equal(ok.lines[0].label, "Dispatch (Zone 1)");
});
