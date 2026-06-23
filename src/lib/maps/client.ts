import "server-only";

import { env } from "@/lib/env";

/**
 * Google Maps Platform — Geocoding + Distance Matrix, raw fetch (no SDK).
 * Used by the pricing engine to turn a caller's address into driving miles
 * from the business's home base (zone pricing) and, for tows, the
 * pickup→drop-off distance. Server-only: the API key never reaches a
 * browser.
 */

const GEOCODE = "https://maps.googleapis.com/maps/api/geocode/json";
const DISTANCE = "https://maps.googleapis.com/maps/api/distancematrix/json";
const PLACES_SEARCH = "https://places.googleapis.com/v1/places:searchText";
const METERS_PER_MILE = 1609.344;

export function isMapsConfigured(): boolean {
  return Boolean(env.GOOGLE_MAPS_API_KEY);
}

export interface GeoPoint {
  lat: number;
  lng: number;
  formatted: string;
}

/** Geocode an address to coordinates. Returns null on failure / no match. */
export async function geocodeAddress(address: string): Promise<GeoPoint | null> {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  const url = `${GEOCODE}?address=${encodeURIComponent(address)}&key=${env.GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      results?: { geometry?: { location?: { lat: number; lng: number } }; formatted_address?: string }[];
    };
    if (json.status !== "OK" || !json.results?.length) {
      if (json.status && json.status !== "ZERO_RESULTS") {
        console.error(`[maps] geocode status ${json.status} for "${address}"`);
      }
      return null;
    }
    const r = json.results[0];
    const loc = r.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng, formatted: r.formatted_address ?? address };
  } catch (err) {
    console.error("[maps] geocode error:", err);
    return null;
  }
}

/** Format a point or address for a Distance Matrix origin/destination. */
function place(p: GeoPoint | string): string {
  return typeof p === "string" ? p : `${p.lat},${p.lng}`;
}

/**
 * Driving distance in miles between two places (each a "lat,lng" point or a
 * plain address). Returns null if the route can't be determined.
 */
export async function drivingDistanceMiles(
  origin: GeoPoint | string,
  destination: GeoPoint | string
): Promise<number | null> {
  if (!env.GOOGLE_MAPS_API_KEY) return null;
  const url =
    `${DISTANCE}?origins=${encodeURIComponent(place(origin))}` +
    `&destinations=${encodeURIComponent(place(destination))}` +
    `&units=imperial&key=${env.GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      rows?: { elements?: { status?: string; distance?: { value?: number } }[] }[];
    };
    const el = json.rows?.[0]?.elements?.[0];
    if (json.status !== "OK" || !el || el.status !== "OK" || el.distance?.value == null) {
      console.error(
        `[maps] distance status ${json.status}/${el?.status ?? "?"} for ${place(origin)} -> ${place(destination)}`
      );
      return null;
    }
    return el.distance.value / METERS_PER_MILE;
  } catch (err) {
    console.error("[maps] distance error:", err);
    return null;
  }
}

/**
 * Driving miles from one origin to MANY destinations in a single Distance
 * Matrix request (cheaper than N calls). Returns an array aligned to
 * `destinations`; an entry is null if that leg couldn't be routed.
 */
export async function drivingDistanceMilesMulti(
  origin: GeoPoint | string,
  destinations: (GeoPoint | string)[]
): Promise<(number | null)[]> {
  if (!env.GOOGLE_MAPS_API_KEY || destinations.length === 0) {
    return destinations.map(() => null);
  }
  const dest = destinations.map((d) => encodeURIComponent(place(d))).join("|");
  const url =
    `${DISTANCE}?origins=${encodeURIComponent(place(origin))}` +
    `&destinations=${dest}&units=imperial&key=${env.GOOGLE_MAPS_API_KEY}`;
  try {
    const res = await fetch(url);
    const json = (await res.json()) as {
      status?: string;
      rows?: { elements?: { status?: string; distance?: { value?: number } }[] }[];
    };
    if (json.status !== "OK") {
      console.error(`[maps] distance multi status ${json.status}`);
      return destinations.map(() => null);
    }
    const els = json.rows?.[0]?.elements ?? [];
    return destinations.map((_, i) => {
      const el = els[i];
      return el && el.status === "OK" && el.distance?.value != null
        ? el.distance.value / METERS_PER_MILE
        : null;
    });
  } catch (err) {
    console.error("[maps] distance multi error:", err);
    return destinations.map(() => null);
  }
}

export interface PlaceResult {
  name: string;
  address: string;
  lat: number;
  lng: number;
}

/**
 * Find real places matching a text query near a point (Google Places API
 * "Text Search (New)"). Used so the AI can offer a stranded caller real tow
 * destinations (nearest mechanic, tire shop, etc.) instead of inventing one.
 * Results are biased to a circle around `center`; the caller sorts by actual
 * driving distance afterward. Returns [] on any failure (caller degrades
 * gracefully). Requires the "Places API (New)" enabled on the key.
 */
export async function findNearbyPlaces(
  center: GeoPoint,
  query: string,
  opts?: { radiusMeters?: number; max?: number }
): Promise<PlaceResult[]> {
  if (!env.GOOGLE_MAPS_API_KEY) return [];
  const radius = Math.min(Math.max(opts?.radiusMeters ?? 40000, 1), 50000);
  const max = Math.min(Math.max(opts?.max ?? 8, 1), 20);
  try {
    const res = await fetch(PLACES_SEARCH, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": env.GOOGLE_MAPS_API_KEY,
        "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.location",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: max,
        locationBias: {
          circle: { center: { latitude: center.lat, longitude: center.lng }, radius },
        },
      }),
    });
    const json = (await res.json()) as {
      places?: {
        displayName?: { text?: string };
        formattedAddress?: string;
        location?: { latitude?: number; longitude?: number };
      }[];
      error?: { message?: string; status?: string };
    };
    if (!res.ok || json.error) {
      console.error(
        `[maps] places searchText ${res.status} ${json.error?.status ?? ""}: ${json.error?.message ?? ""}`
      );
      return [];
    }
    const out: PlaceResult[] = [];
    for (const p of json.places ?? []) {
      const lat = p.location?.latitude;
      const lng = p.location?.longitude;
      const name = p.displayName?.text;
      if (lat == null || lng == null || !name) continue;
      out.push({ name, address: p.formattedAddress ?? "", lat, lng });
    }
    return out;
  } catch (err) {
    console.error("[maps] places error:", err);
    return [];
  }
}
