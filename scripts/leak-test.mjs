// Cross-tenant leak test (master plan §9 / §14, BUILD_GUIDE M2).
// Creates two throwaway users, each with their own organization, and
// verifies neither can see or touch the other's data through the API.
// Cleans up after itself. Run: node scripts/leak-test.mjs
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()])
);

const URL_ = env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const ts = Date.now();
const PASSWORD = `LeakTest!${ts}`;
let failures = 0;

function assert(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function makeUser(tag) {
  const email = `leaktest.${tag}.${ts}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
  });
  if (error) throw new Error(`createUser ${tag}: ${error.message}`);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: signInErr } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInErr) throw new Error(`signIn ${tag}: ${signInErr.message}`);
  const { data: orgId, error: rpcErr } = await client.rpc("create_organization", {
    org_name: `Leak Test Co ${tag.toUpperCase()}`,
  });
  if (rpcErr) throw new Error(`create_organization ${tag}: ${rpcErr.message}`);
  return { email, userId: data.user.id, client, orgId };
}

let a, b;
try {
  a = await makeUser("a");
  b = await makeUser("b");
  console.log(`\nUser A org: ${a.orgId}\nUser B org: ${b.orgId}\n`);

  // 1. Each user sees exactly one org — their own.
  const { data: aOrgs } = await a.client.from("organizations").select("id, name");
  assert(
    "A sees only their own organization",
    aOrgs?.length === 1 && aOrgs[0].id === a.orgId,
    `sees ${aOrgs?.length} org(s)`
  );
  const { data: bOrgs } = await b.client.from("organizations").select("id, name");
  assert(
    "B sees only their own organization",
    bOrgs?.length === 1 && bOrgs[0].id === b.orgId,
    `sees ${bOrgs?.length} org(s)`
  );

  // 2. Direct lookup of the other tenant's org returns nothing.
  const { data: cross } = await b.client
    .from("organizations")
    .select("id")
    .eq("id", a.orgId);
  assert("B cannot read A's organization by id", (cross ?? []).length === 0);

  // 3. Membership rows don't leak.
  const { data: bMembers } = await b.client
    .from("organization_members")
    .select("organization_id, user_id");
  const leakedMembers = (bMembers ?? []).filter(
    (m) => m.organization_id === a.orgId || m.user_id === a.userId
  );
  assert("B cannot see A's membership rows", leakedMembers.length === 0);

  // 4. B cannot modify A's organization (update affects 0 rows).
  const { data: updated } = await b.client
    .from("organizations")
    .update({ name: "HACKED" })
    .eq("id", a.orgId)
    .select();
  assert("B cannot update A's organization", (updated ?? []).length === 0);
  const { data: aCheck } = await a.client
    .from("organizations")
    .select("name")
    .eq("id", a.orgId)
    .single();
  assert(
    "A's organization name unchanged",
    aCheck?.name === "Leak Test Co A",
    aCheck?.name
  );

  // 5. Audit logs are tenant-scoped.
  const { data: bAudit } = await b.client.from("audit_logs").select("tenant_id");
  const leakedAudit = (bAudit ?? []).filter((r) => r.tenant_id === a.orgId);
  assert("B cannot see A's audit logs", leakedAudit.length === 0);

  // 6. Signed-out (anon) sees nothing at all.
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { data: anonOrgs, error: anonErr } = await anonClient
    .from("organizations")
    .select("id");
  assert(
    "Signed-out visitor sees zero organizations",
    (anonOrgs ?? []).length === 0 || !!anonErr
  );
} finally {
  // Cleanup: orgs cascade members + audit logs; then remove the users.
  for (const u of [a, b].filter(Boolean)) {
    await admin.from("organizations").delete().eq("id", u.orgId);
    await admin.auth.admin.deleteUser(u.userId);
  }
  console.log("\nCleanup done (test orgs and users removed).");
}

console.log(
  failures === 0
    ? "\n✅ LEAK TEST PASSED — tenant isolation holds."
    : `\n❌ LEAK TEST FAILED — ${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);
