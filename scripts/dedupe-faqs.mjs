// Clean up the FAQ pile-up from repeated doc uploads (the approve path used to
// insert without a dedupe check — now fixed in upload/actions.ts).
//
//   node scripts/dedupe-faqs.mjs                  # dry run — shows what WOULD change
//   node scripts/dedupe-faqs.mjs --confirm        # delete identical-duplicate FAQs
//   node scripts/dedupe-faqs.mjs --confirm --fix-radius
//                                                 # also correct stale "within N miles"
//                                                 # coverage answers to the live radius
//
// Dedupe rule: identical (question + answer), case-insensitive, per business —
// keep the OLDEST row, delete the rest. Radius fix: only touches coverage FAQs
// (question about area/coverage) and only the number that sits between "within"
// and "miles", so tow "first 5 miles" style answers are never altered.
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set */
}
const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } }
);

const CONFIRM = process.argv.includes("--confirm");
const FIX_RADIUS = process.argv.includes("--fix-radius");
const norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

const { data: businesses } = await db.from("businesses").select("id, name");

let totalDeleted = 0;
let totalRadiusFixed = 0;

for (const b of businesses ?? []) {
  const { data: faqs } = await db
    .from("faqs")
    .select("id, question, answer, created_at")
    .eq("business_id", b.id)
    .order("created_at", { ascending: true });
  if (!faqs?.length) continue;

  const { data: ps } = await db
    .from("pricing_settings")
    .select("max_service_miles, base_lat, base_lng")
    .eq("business_id", b.id)
    .maybeSingle();
  const radius =
    ps && ps.base_lat != null && ps.base_lng != null ? ps.max_service_miles : null;

  // ── Pass A: identical-duplicate dedupe (keep the oldest of each group) ──
  const seen = new Map();
  const toDelete = [];
  for (const f of faqs) {
    const key = `${norm(f.question)}||${norm(f.answer)}`;
    if (seen.has(key)) toDelete.push(f);
    else seen.set(key, f);
  }

  // ── Pass B: stale coverage mileage (only the kept/unique rows) ──
  const radiusFixes = [];
  if (radius != null) {
    const keptRows = [...seen.values()];
    const coverageRe = /\b(area|serve|cover|radius|where.*you)\b/i;
    const withinRe = /(\bwithin\s+)(\d+(?:\.\d+)?)(\s*(?:mi\b|miles?\b))/i;
    for (const f of keptRows) {
      if (!coverageRe.test(f.question) && !coverageRe.test(f.answer)) continue;
      const m = f.answer.match(withinRe);
      if (m && Number(m[2]) !== Number(radius)) {
        const fixed = f.answer.replace(withinRe, `$1${radius}$3`);
        radiusFixes.push({ id: f.id, before: f.answer, after: fixed });
      }
    }
  }

  if (toDelete.length === 0 && radiusFixes.length === 0) {
    console.log(`\n${b.name}: ${faqs.length} FAQs — clean, nothing to do.`);
    continue;
  }

  console.log(`\n${b.name}: ${faqs.length} FAQs → ${seen.size} unique`);
  if (toDelete.length) {
    console.log(`  • ${toDelete.length} identical duplicates to delete.`);
    // Show a sample of the distinct questions being collapsed.
    const sample = [...new Set(toDelete.map((d) => d.question))].slice(0, 8);
    for (const q of sample) console.log(`      - "${q}"`);
    if (sample.length < new Set(toDelete.map((d) => d.question)).size)
      console.log(`      …`);
  }
  if (radiusFixes.length) {
    console.log(`  • ${radiusFixes.length} coverage FAQ(s) with stale mileage (live radius = ${radius} mi):`);
    for (const r of radiusFixes) {
      console.log(`      FROM: ${r.before}`);
      console.log(`      TO:   ${r.after}`);
    }
    if (!FIX_RADIUS)
      console.log(`    (add --fix-radius to correct the number, or edit it in /dashboard/faqs)`);
  }

  if (CONFIRM) {
    if (toDelete.length) {
      const ids = toDelete.map((d) => d.id);
      // delete in chunks to stay well under any URL limits
      for (let i = 0; i < ids.length; i += 100) {
        const chunk = ids.slice(i, i + 100);
        const { error } = await db.from("faqs").delete().in("id", chunk);
        if (error) console.log(`    ! delete error: ${error.message}`);
        else totalDeleted += chunk.length;
      }
    }
    if (FIX_RADIUS) {
      for (const r of radiusFixes) {
        const { error } = await db.from("faqs").update({ answer: r.after }).eq("id", r.id);
        if (error) console.log(`    ! update error: ${error.message}`);
        else totalRadiusFixed += 1;
      }
    }
  }
}

console.log(
  CONFIRM
    ? `\n✅ Done. Deleted ${totalDeleted} duplicate FAQ(s)${
        FIX_RADIUS ? `, fixed ${totalRadiusFixed} stale-mileage answer(s)` : ""
      }.`
    : `\n(DRY RUN — nothing changed. Re-run with --confirm${
        FIX_RADIUS ? " --fix-radius" : ""
      } to apply.)`
);
