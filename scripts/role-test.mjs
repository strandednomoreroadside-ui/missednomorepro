// Same-tenant role-boundary test.
//
// Run after applying 20260721090000_role_hardening.sql:
//   node scripts/role-test.mjs
//
// Creates one throwaway organization with owner/admin/member users, verifies
// manager-only writes and intended member operations, then removes everything.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.trim().startsWith("#"))
    .map((line) => [
      line.slice(0, line.indexOf("=")).trim(),
      line.slice(line.indexOf("=") + 1).trim(),
    ])
);

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !anonKey || !serviceKey) {
  throw new Error("Missing Supabase environment variables in .env.local");
}

const adminClient = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const stamp = Date.now();
const password = `RoleTest!${stamp}`;
let failures = 0;
let organizationId;

function assert(label, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function createUser(role) {
  const email = `roletest.${role}.${stamp}@example.com`;
  const { data, error } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw new Error(`create ${role}: ${error.message}`);
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw new Error(`sign in ${role}: ${signInError.message}`);
  return { role, userId: data.user.id, client };
}

const users = [];
try {
  const owner = await createUser("owner");
  const orgResult = await owner.client.rpc("create_organization", {
    org_name: `Role Test Co ${stamp}`,
  });
  if (orgResult.error) throw new Error(`create organization: ${orgResult.error.message}`);
  organizationId = orgResult.data;
  users.push(owner);

  const manager = await createUser("admin");
  const member = await createUser("member");
  users.push(manager, member);

  const { error: membershipError } = await adminClient.from("organization_members").insert([
    { organization_id: organizationId, user_id: manager.userId, role: "admin" },
    { organization_id: organizationId, user_id: member.userId, role: "member" },
  ]);
  if (membershipError) throw new Error(`seed memberships: ${membershipError.message}`);

  const { data: business, error: businessError } = await owner.client
    .from("businesses")
    .insert({
      tenant_id: organizationId,
      organization_id: organizationId,
      name: "Role Test Business",
    })
    .select("id")
    .single();
  if (businessError) throw new Error(`seed business: ${businessError.message}`);

  const { error: smsError } = await adminClient.from("sms_settings").insert({
    tenant_id: organizationId,
    business_id: business.id,
  });
  if (smsError) throw new Error(`seed sms settings: ${smsError.message}`);

  const { data: plan, error: planError } = await owner.client
    .from("membership_plans")
    .insert({
      tenant_id: organizationId,
      business_id: business.id,
      name: "Role Test Plan",
      price_cents: 2500,
      created_by: owner.userId,
    })
    .select("id, name")
    .single();
  if (planError) throw new Error(`owner creates plan: ${planError.message}`);

  const memberRead = await member.client
    .from("membership_plans")
    .select("id")
    .eq("id", plan.id);
  assert("Member can read the membership catalog", memberRead.data?.length === 1);

  const memberPlanWrite = await member.client
    .from("membership_plans")
    .update({ name: "Member changed this" })
    .eq("id", plan.id)
    .select("id");
  assert(
    "Member cannot change membership plans",
    !!memberPlanWrite.error || (memberPlanWrite.data ?? []).length === 0,
    memberPlanWrite.error?.message
  );

  const adminPlanWrite = await manager.client
    .from("membership_plans")
    .update({ name: "Admin changed this" })
    .eq("id", plan.id)
    .select("name")
    .single();
  assert(
    "Admin can change membership plans",
    !adminPlanWrite.error && adminPlanWrite.data?.name === "Admin changed this",
    adminPlanWrite.error?.message
  );

  const memberOperationalWrite = await member.client
    .from("sms_settings")
    .update({ text_back_enabled: false })
    .eq("business_id", business.id)
    .select("text_back_enabled")
    .single();
  assert(
    "Member keeps intended operational SMS-setting access",
    !memberOperationalWrite.error && memberOperationalWrite.data?.text_back_enabled === false,
    memberOperationalWrite.error?.message
  );

  const memberProtectedWrite = await member.client
    .from("sms_settings")
    .update({ callback_ivr_enabled: true, callback_ivr_pin: "2468" })
    .eq("business_id", business.id)
    .select("id");
  assert(
    "Member cannot change callback-IVR credentials",
    !!memberProtectedWrite.error,
    memberProtectedWrite.error?.message
  );

  const adminProtectedWrite = await manager.client
    .from("sms_settings")
    .update({ callback_ivr_enabled: true, callback_ivr_pin: "2468" })
    .eq("business_id", business.id)
    .select("callback_ivr_enabled")
    .single();
  assert(
    "Admin can change callback-IVR credentials",
    !adminProtectedWrite.error && adminProtectedWrite.data?.callback_ivr_enabled === true,
    adminProtectedWrite.error?.message
  );
} finally {
  if (organizationId) {
    await adminClient.from("organizations").delete().eq("id", organizationId);
  }
  for (const user of users) {
    await adminClient.auth.admin.deleteUser(user.userId);
  }
  console.log("Cleanup done (test organization and users removed).\n");
}

console.log(
  failures === 0
    ? "✅ ROLE TEST PASSED — same-tenant privilege boundaries hold."
    : `❌ ROLE TEST FAILED — ${failures} check(s) failed.`
);
process.exit(failures === 0 ? 0 : 1);

