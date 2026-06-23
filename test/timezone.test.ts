import { describe, it, expect } from "vitest";

import {
  zonedTimeToUtc,
  getZonedParts,
  addDays,
  parseDateString,
  parseTimeString,
} from "@/lib/calendar/timezone";

/**
 * Timezone correctness underpins the "never book out of hours" promise: "9 AM"
 * must mean 9 AM in the BUSINESS's zone, stored as the right absolute instant,
 * DST included. A bug here silently books the wrong time.
 */

describe("zonedTimeToUtc — DST-aware offsets", () => {
  it("New York in July is EDT (UTC-4)", () => {
    const utc = zonedTimeToUtc(2026, 7, 7, 9, 0, "America/New_York");
    expect(utc.getUTCHours()).toBe(13); // 09:00 EDT = 13:00 UTC
    expect(utc.getUTCMinutes()).toBe(0);
  });

  it("New York in January is EST (UTC-5)", () => {
    const utc = zonedTimeToUtc(2026, 1, 15, 9, 0, "America/New_York");
    expect(utc.getUTCHours()).toBe(14); // 09:00 EST = 14:00 UTC
  });

  it("Chicago in July is CDT (UTC-5)", () => {
    const utc = zonedTimeToUtc(2026, 7, 7, 9, 0, "America/Chicago");
    expect(utc.getUTCHours()).toBe(14);
  });

  it("Phoenix never observes DST (UTC-7 year round)", () => {
    const utc = zonedTimeToUtc(2026, 7, 7, 9, 0, "America/Phoenix");
    expect(utc.getUTCHours()).toBe(16); // 09:00 MST = 16:00 UTC
  });

  it("round-trips a wall-clock time back to the same local parts", () => {
    const tz = "America/New_York";
    const utc = zonedTimeToUtc(2026, 7, 7, 9, 30, tz);
    const parts = getZonedParts(utc, tz);
    expect(parts).toMatchObject({ year: 2026, month: 7, day: 7, hour: 9, minute: 30 });
  });

  it("does not crash on the spring-forward gap", () => {
    // 2:30 AM does not exist on 2026-03-08 in New York (clocks jump 2→3).
    const utc = zonedTimeToUtc(2026, 3, 8, 2, 30, "America/New_York");
    expect(utc).toBeInstanceOf(Date);
    expect(Number.isNaN(utc.getTime())).toBe(false);
  });
});

describe("parseTimeString — rejects impossible clock times", () => {
  it("parses valid 24h times", () => {
    expect(parseTimeString("09:30")).toEqual({ hour: 9, minute: 30 });
    expect(parseTimeString("00:00")).toEqual({ hour: 0, minute: 0 });
  });

  it("rejects out-of-range and malformed times", () => {
    expect(parseTimeString("25:00")).toBeNull();
    expect(parseTimeString("12:60")).toBeNull();
    expect(parseTimeString("8:5")).toBeNull(); // needs two-digit minutes
  });
});

describe("parseDateString — rejects impossible dates", () => {
  it("parses ISO calendar dates", () => {
    expect(parseDateString("2026-07-07")).toEqual({ year: 2026, month: 7, day: 7 });
  });

  it("rejects bad months/days and loose formats", () => {
    expect(parseDateString("2026-13-07")).toBeNull();
    expect(parseDateString("2026-07-32")).toBeNull();
    expect(parseDateString("2026-7-7")).toBeNull();
  });
});

describe("addDays — calendar arithmetic across boundaries", () => {
  it("rolls over month and year ends", () => {
    expect(addDays({ year: 2026, month: 7, day: 31 }, 1)).toEqual({ year: 2026, month: 8, day: 1 });
    expect(addDays({ year: 2026, month: 12, day: 31 }, 1)).toEqual({ year: 2027, month: 1, day: 1 });
  });
});
