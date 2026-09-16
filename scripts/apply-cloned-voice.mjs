// Points Stranded No More's live agent and the Summit Home Services demo
// agent at a specific Retell voice_id. Run register-elevenlabs-voice.mjs
// first to get one — this script is deliberately separate so there's a
// checkpoint to preview the voice before it reaches a real caller.
//
// Run: node scripts/apply-cloned-voice.mjs <retell_voice_id>
//
// Safe to re-run. Business lookup mirrors seed-pricing.mjs's pattern
// (ilike name match, prefer status='live') rather than a hardcoded id,
// since agents are keyed by tenant_id, not business_id.
import process from "node:process";
import { createClient } from "@supabase/supabase-js";

try {
  process.loadEnvFile(".env.local");
} catch {
  /* env may already be set */
}

const [, , voiceId] = process.argv;
if (!voiceId) {
  console.error("Usage: node scripts/apply-cloned-voice.mjs <retell_voice_id>");
  process.exit(1);
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
const db = createClient(url, key, { auth: { persistSession: false } });

async function findBusiness(pattern) {
  const { data, error } = await db
    .from("businesses")
    .select("id, tenant_id, name, status")
    .ilike("name", pattern)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  if (!data?.length) return null;
  return data.find((b) => b.status === "live") ?? data[0];
}

const targets = [
  { label: "Stranded No More (live)", pattern: "%stranded%" },
  { label: "Summit Home Services (demo)", pattern: "Summit Home Services" },
];

console.log(`\nApplying voice_id "${voiceId}" to:\n`);

for (const { label, pattern } of targets) {
  const biz = await findBusiness(pattern);
  if (!biz) {
    console.log(`  ✗ ${label} — no business matched "${pattern}", skipped`);
    continue;
  }

  const { data: existing, error: readErr } = await db
    .from("agents")
    .select("id, voice_id")
    .eq("tenant_id", biz.tenant_id);
  if (readErr) {
    console.log(`  ✗ ${label} (${biz.name}) — read failed: ${readErr.message}`);
    continue;
  }
  if (!existing?.length) {
    console.log(`  ✗ ${label} (${biz.name}) — no agent row yet for this tenant, skipped`);
    continue;
  }

  const { error: updErr } = await db.from("agents").update({ voice_id: voiceId }).eq("tenant_id", biz.tenant_id);
  if (updErr) {
    console.log(`  ✗ ${label} (${biz.name}) — update failed: ${updErr.message}`);
    continue;
  }
  console.log(`  ✓ ${label} (${biz.name}) — voice_id ${existing[0].voice_id ?? "(none)"} -> ${voiceId}`);
}

console.log(
  "\nTakes effect on each agent's next call — voice_id feeds prompt.ts's promptHash, " +
    "so syncAgent re-syncs automatically on the next inbound call. No redeploy needed.\n"
);
