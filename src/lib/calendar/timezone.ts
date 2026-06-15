/**
 * Timezone helpers — convert between a business's local wall-clock and UTC
 * instants, DST-safe, with no external dependency (Intl only).
 *
 * Booking is safety-critical: "9 AM" must mean 9 AM in the BUSINESS's
 * timezone, stored as the correct absolute instant. The offset-diff
 * technique below handles DST (including the rare spring-forward gap) by
 * refining once against the candidate instant's own offset.
 *
 * Verified against known cases in scripts/m9-verify.mjs.
 */

/** Offset (ms) of `tz` at the given instant: (wall-clock as UTC) − instant. */
function tzOffsetMs(tz: string, date: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const hour = map.hour === 24 ? 0 : map.hour; // some envs emit "24" at midnight
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, hour, map.minute, map.second);
  return asUtc - date.getTime();
}

/** Wall-clock (y/mo/d h:mi, 1-based month) in `tz` → UTC instant. */
export function zonedTimeToUtc(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
  tz: string
): Date {
  const guess = Date.UTC(y, mo - 1, d, h, mi, 0);
  const offset = tzOffsetMs(tz, new Date(guess));
  let utc = guess - offset;
  const refined = tzOffsetMs(tz, new Date(utc));
  if (refined !== offset) utc = guess - refined;
  return new Date(utc);
}

export interface ZonedParts {
  year: number;
  month: number; // 1-based
  day: number;
  hour: number;
  minute: number;
  /** 0 = Sunday … 6 = Saturday (matches business_hours.day_of_week). */
  weekday: number;
}

/** A UTC instant expressed as local calendar/clock parts in `tz`. */
export function getZonedParts(date: Date, tz: string): ZonedParts {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(date)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const hour = map.hour === 24 ? 0 : map.hour;
  // Weekday depends only on the calendar date, so a UTC date with the same
  // y/m/d yields the correct day-of-week.
  const weekday = new Date(Date.UTC(map.year, map.month - 1, map.day)).getUTCDay();
  return { year: map.year, month: map.month, day: map.day, hour, minute: map.minute, weekday };
}

/** Today's local date in `tz` (for resolving "today"/"tomorrow"). */
export function todayInZone(tz: string): { year: number; month: number; day: number } {
  const p = getZonedParts(new Date(), tz);
  return { year: p.year, month: p.month, day: p.day };
}

/** Add `n` calendar days to a {year, month, day} (month is 1-based). */
export function addDays(
  date: { year: number; month: number; day: number },
  n: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

/** "Tuesday, July 7 at 9:00 AM" in `tz`. */
export function formatSlotLabel(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** "9:00 AM" in `tz` (compact, for slot lists). */
export function formatTimeLabel(date: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

/** Prompt dynamic-variable strings — date (YYYY-MM-DD), weekday name, and
 *  clock time, all in `tz`. Used by the voice webhook for booking dates. */
export function currentZonedStrings(
  tz: string,
  at: Date = new Date()
): { date: string; day: string; time: string } {
  const p = getZonedParts(at, tz);
  const date = `${p.year}-${String(p.month).padStart(2, "0")}-${String(p.day).padStart(2, "0")}`;
  const day = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "long" }).format(at);
  return { date, day, time: formatTimeLabel(at, tz) };
}

/** Parse "YYYY-MM-DD" → {year, month, day}; null if malformed. */
export function parseDateString(
  s: string
): { year: number; month: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
}

/** "HH:MM" (24h) → {hour, minute}; null if malformed. */
export function parseTimeString(s: string): { hour: number; minute: number } | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(s.trim());
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = Number(m[2]);
  if (hour > 23 || minute > 59) return null;
  return { hour, minute };
}
