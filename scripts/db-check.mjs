// One-off diagnostic: checks whether the M2 migration is applied, using
// the same supabase-js client the app uses. Run: node scripts/db-check.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function check(label, fn) {
  try {
    const { data, error } = await fn();
    if (error) console.log(`${label}: ERROR ${error.code ?? ""} — ${error.message}`);
    else console.log(`${label}: OK (${JSON.stringify(data)?.slice(0, 80)})`);
  } catch (e) {
    console.log(`${label}: THREW — ${e.message}`);
  }
}

await check("organizations table     ", () =>
  admin.from("organizations").select("id").limit(1)
);
await check("organization_members    ", () =>
  admin.from("organization_members").select("id").limit(1)
);
await check("businesses table        ", () =>
  admin.from("businesses").select("id").limit(1)
);
await check("audit_logs table        ", () =>
  admin.from("audit_logs").select("id").limit(1)
);
await check("create_organization RPC ", () =>
  admin.rpc("create_organization", { org_name: "__probe__" })
);
