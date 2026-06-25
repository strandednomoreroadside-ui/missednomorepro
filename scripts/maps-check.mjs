// Maps health check — confirms GOOGLE_MAPS_API_KEY works server-side for the
// three APIs the product relies on: Geocoding (home base + caller location),
// Distance Matrix (radius service-area + zone/tow pricing), and Places (New)
// (tow-destination finder).
//
// Run after changing the key's restrictions in Google Cloud Console:
//   node scripts/maps-check.mjs
//
// The #1 gotcha: a key with an "HTTP referrer" Application restriction is
// DENIED for these server-side calls (Vercel/Node send no referrer). For a
// server-only key, set Application restriction = None and restrict by API
// instead (Geocoding API, Distance Matrix API, Places API (New)).
import process from "node:process";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be present in the shell */
}

const key = process.env.GOOGLE_MAPS_API_KEY;
if (!key) {
  console.error("❌ GOOGLE_MAPS_API_KEY is not set in .env.local");
  process.exit(1);
}
console.log(`Using key ${key.slice(0, 6)}…${key.slice(-4)} (length ${key.length})\n`);

let failed = false;
const referrerHint =
  "   → Likely cause: the key has an HTTP-referrer Application restriction.\n" +
  "     Set Application restriction = None for this server-only key.";

// ── 1. Geocoding ──────────────────────────────────────────────────
const addr = "6466 Haviland Dr, Brook Park, OH 44142";
let base = null;
{
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(addr)}&key=${key}`;
  const j = await fetch(url).then((r) => r.json());
  if (j.status === "OK") {
    base = j.results[0].geometry.location;
    console.log(`✅ Geocoding OK   — "${addr}" → ${base.lat},${base.lng}`);
  } else {
    failed = true;
    console.log(`❌ Geocoding FAIL — status ${j.status}${j.error_message ? `: ${j.error_message}` : ""}`);
    if (j.status === "REQUEST_DENIED") console.log(referrerHint);
  }
}

// ── 2. Distance Matrix ────────────────────────────────────────────
if (base) {
  const url =
    `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${base.lat},${base.lng}` +
    `&destinations=${encodeURIComponent("Lakewood, OH")}&units=imperial&key=${key}`;
  const j = await fetch(url).then((r) => r.json());
  const el = j.rows?.[0]?.elements?.[0];
  if (j.status === "OK" && el?.status === "OK") {
    console.log(`✅ Distance OK    — base → Lakewood, OH = ${el.distance.text}`);
  } else {
    failed = true;
    console.log(
      `❌ Distance FAIL  — status ${j.status}/${el?.status ?? "?"}${j.error_message ? `: ${j.error_message}` : ""}`
    );
    if (j.status === "REQUEST_DENIED") console.log(referrerHint);
  }
} else {
  console.log("⏭  Distance skipped (geocoding failed)");
}

// ── 3. Places API (New) ───────────────────────────────────────────
{
  const j = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "places.displayName",
    },
    body: JSON.stringify({ textQuery: "tire shop near Brook Park OH", maxResultCount: 1 }),
  }).then((r) => r.json());
  if (!j.error && Array.isArray(j.places)) {
    console.log(`✅ Places OK      — found ${j.places.length} result`);
  } else {
    failed = true;
    console.log(`❌ Places FAIL    — ${j.error?.status ?? "?"}: ${j.error?.message ?? "unknown"}`);
    if (j.error?.status === "PERMISSION_DENIED") {
      console.log("   → Set Application restriction = None, and enable 'Places API (New)' on the key.");
    }
  }
}

console.log(
  failed
    ? "\n❌ One or more Maps APIs are blocked. Fix the key restriction, wait ~2 min, re-run."
    : "\n✅ All Maps APIs working. Home base, radius service-area, and tow finder are good to go."
);
process.exit(failed ? 1 : 0);
