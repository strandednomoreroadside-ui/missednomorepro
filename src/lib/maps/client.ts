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
