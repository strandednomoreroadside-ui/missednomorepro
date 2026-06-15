import {
  formatSlotLabel,
  formatTimeLabel,
  parseTimeString,
  zonedTimeToUtc,
} from "./timezone";

/**
 * Availability engine — derive bookable slots from a business's weekly
 * hours, then subtract anything already busy (our confirmed appointments
 * + the owner's Google "busy" blocks). Pure and deterministic: same
 * inputs → same slots, so it's easy to verify and reason about.
 *
 * Every candidate start is converted from local wall-clock to a UTC
 * instant independently (zonedTimeToUtc), which keeps DST correct.
 */

export interface HoursRow {
  day_of_week: number; // 0 = Sun … 6 = Sat
  closed: boolean;
  opens_at: string | null; // "HH:MM[:SS]"
  closes_at: string | null;
}

export interface BusyInterval {
  start: Date;
  end: Date;
}

export interface AvailabilityConfig {
  /** How far ahead to look when no specific date is requested. */
  horizonDays: number;
  /** Don't offer slots starting sooner than this many minutes from now. */
  leadMinutes: number;
  /** Granularity of offered start times. */
  slotMinutes: number;
  /** Appointment length. */
  durationMinutes: number;
  /** Max slots to return. */
  maxSlots: number;
}

export const DEFAULT_AVAILABILITY: AvailabilityConfig = {
  horizonDays: 14,
  leadMinutes: 60,
  slotMinutes: 30,
  durationMinutes: 60,
  maxSlots: 3,
};

export interface Slot {
  start: Date;
  end: Date;
  startIso: string;
  endIso: string;
  /** "Tuesday, July 7 at 9:00 AM" */
  label: string;
  /** "9:00 AM" */
  timeLabel: string;
}

export interface AvailabilityInput {
  tz: string;
  hours: HoursRow[];
  busy: BusyInterval[];
  now: Date;
  config?: Partial<AvailabilityConfig>;
  /** A specific requested date in business-local time, or null to scan ahead. */
  targetDate?: { year: number; month: number; day: number } | null;
  /** A preferred time-of-day to bias toward, when a date is requested. */
  preferredTime?: { hour: number; minute: number } | null;
}

function weekdayOf(y: number, mo: number, d: number): number {
  return new Date(Date.UTC(y, mo - 1, d)).getUTCDay();
}

function addDays(
  date: { year: number; month: number; day: number },
  n: number
): { year: number; month: number; day: number } {
  const d = new Date(Date.UTC(date.year, date.month - 1, date.day + n));
  return { year: d.getUTCFullYear(), month: d.getUTCMonth() + 1, day: d.getUTCDate() };
}

function overlapsBusy(start: Date, end: Date, busy: BusyInterval[]): boolean {
  for (const b of busy) {
    if (start < b.end && end > b.start) return true;
  }
  return false;
}

/** Generate the day's open slots (chronological). */
function slotsForDay(
  date: { year: number; month: number; day: number },
  input: AvailabilityInput,
  cfg: AvailabilityConfig,
  earliest: Date
): Slot[] {
  const dow = weekdayOf(date.year, date.month, date.day);
  const row = input.hours.find((h) => h.day_of_week === dow);
  if (!row || row.closed || !row.opens_at || !row.closes_at) return [];

  const open = parseTimeString(row.opens_at);
  const close = parseTimeString(row.closes_at);
  if (!open || !close) return [];

  const openMin = open.hour * 60 + open.minute;
  const closeMin = close.hour * 60 + close.minute;
  const out: Slot[] = [];

  for (let t = openMin; t + cfg.durationMinutes <= closeMin; t += cfg.slotMinutes) {
    const hour = Math.floor(t / 60);
    const minute = t % 60;
    const start = zonedTimeToUtc(date.year, date.month, date.day, hour, minute, input.tz);
    const end = new Date(start.getTime() + cfg.durationMinutes * 60_000);
    if (start < earliest) continue;
    if (overlapsBusy(start, end, input.busy)) continue;
    out.push({
      start,
      end,
      startIso: start.toISOString(),
      endIso: end.toISOString(),
      label: formatSlotLabel(start, input.tz),
      timeLabel: formatTimeLabel(start, input.tz),
    });
  }
  return out;
}

/** Compute up to config.maxSlots offerable slots. */
export function computeAvailableSlots(input: AvailabilityInput): Slot[] {
  const cfg = { ...DEFAULT_AVAILABILITY, ...input.config };
  const earliest = new Date(input.now.getTime() + cfg.leadMinutes * 60_000);

  if (input.targetDate) {
    let slots = slotsForDay(input.targetDate, input, cfg, earliest);
    const pref = input.preferredTime;
    if (pref) {
      const prefMin = pref.hour * 60 + pref.minute;
      slots = [...slots].sort((a, b) => {
        const am = a.start.getTime();
        const bm = b.start.getTime();
        // distance from preferred time-of-day, comparing within the same day
        const ad = Math.abs(minutesOfDay(a, input.tz) - prefMin);
        const bd = Math.abs(minutesOfDay(b, input.tz) - prefMin);
        return ad - bd || am - bm;
      });
    }
    return slots.slice(0, cfg.maxSlots);
  }

  // No specific date: scan forward and collect the soonest slots.
  const out: Slot[] = [];
  const startDate = {
    // begin from today in the business zone
    ...dateOf(input.now, input.tz),
  };
  for (let i = 0; i <= cfg.horizonDays && out.length < cfg.maxSlots; i++) {
    const day = addDays(startDate, i);
    const daySlots = slotsForDay(day, input, cfg, earliest);
    for (const s of daySlots) {
      out.push(s);
      if (out.length >= cfg.maxSlots) break;
    }
  }
  return out;
}

function minutesOfDay(slot: Slot, tz: string): number {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map: Record<string, number> = {};
  for (const p of f.formatToParts(slot.start)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const hour = map.hour === 24 ? 0 : map.hour;
  return hour * 60 + map.minute;
}

function dateOf(d: Date, tz: string): { year: number; month: number; day: number } {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const map: Record<string, number> = {};
  for (const p of f.formatToParts(d)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  return { year: map.year, month: map.month, day: map.day };
}

/** Is a UTC instant inside an open business-hours window? (Booking guard.) */
export function isWithinBusinessHours(
  start: Date,
  end: Date,
  hours: HoursRow[],
  tz: string
): boolean {
  const f = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const map: Record<string, number> = {};
  for (const p of f.formatToParts(start)) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const sh = map.hour === 24 ? 0 : map.hour;
  const dow = weekdayOf(map.year, map.month, map.day);
  const row = hours.find((h) => h.day_of_week === dow);
  if (!row || row.closed || !row.opens_at || !row.closes_at) return false;

  const open = parseTimeString(row.opens_at);
  const close = parseTimeString(row.closes_at);
  if (!open || !close) return false;

  const startMin = sh * 60 + map.minute;
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60_000);
  const openMin = open.hour * 60 + open.minute;
  const closeMin = close.hour * 60 + close.minute;
  return startMin >= openMin && startMin + durationMin <= closeMin;
}
