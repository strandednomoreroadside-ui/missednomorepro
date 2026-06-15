import "server-only";

/**
 * Google Calendar API v3 — the three calls booking needs: free/busy
 * lookup, create event, delete event. Raw fetch with a bearer access
 * token (obtained/refreshed in connection.ts).
 */

const API = "https://www.googleapis.com/calendar/v3";

export interface BusyInterval {
  start: string; // RFC3339
  end: string; // RFC3339
}

/** Busy blocks on the calendar between timeMin/timeMax (RFC3339 UTC). */
export async function freeBusy(
  accessToken: string,
  calendarId: string,
  timeMinIso: string,
  timeMaxIso: string
): Promise<BusyInterval[]> {
  const res = await fetch(`${API}/freeBusy`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: timeMinIso,
      timeMax: timeMaxIso,
      items: [{ id: calendarId }],
    }),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`google freeBusy failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as {
    calendars?: Record<string, { busy?: BusyInterval[] }>;
  };
  return json.calendars?.[calendarId]?.busy ?? [];
}

export interface InsertEventInput {
  calendarId: string;
  summary: string;
  description?: string;
  location?: string;
  /** UTC ISO instants. */
  startIso: string;
  endIso: string;
  /** IANA timezone for display/recurrence (e.g. America/New_York). */
  timeZone: string;
}

/** Create an event; returns its Google event id. */
export async function insertEvent(
  accessToken: string,
  input: InsertEventInput
): Promise<string> {
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(input.calendarId)}/events`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: { dateTime: input.startIso, timeZone: input.timeZone },
        end: { dateTime: input.endIso, timeZone: input.timeZone },
      }),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`google insertEvent failed (${res.status}): ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error("google insertEvent returned no event id");
  return json.id;
}

/** Delete an event (best-effort; used when an appointment is canceled). */
export async function deleteEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const res = await fetch(
    `${API}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
    { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } }
  );
  // 410 Gone = already deleted; treat as success.
  if (!res.ok && res.status !== 410) {
    const text = await res.text().catch(() => "");
    throw new Error(`google deleteEvent failed (${res.status}): ${text.slice(0, 200)}`);
  }
}
