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

  // ── M4: setup wizard tables + launch gate ─────────────────────

  // A creates a business with one service and one FAQ.
  const { data: aBiz, error: aBizErr } = await a.client
    .from("businesses")
    .insert({ tenant_id: a.orgId, organization_id: a.orgId, name: "Leak Test Biz A" })
    .select("id")
    .single();
  if (aBizErr) throw new Error(`A create business: ${aBizErr.message}`);
  await a.client.from("services").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    name: "Secret Service",
  });
  await a.client.from("faqs").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    question: "Secret question?",
    answer: "Secret answer.",
  });

  // 7. B sees none of A's wizard data.
  const { data: bSvcs } = await b.client.from("services").select("id, tenant_id");
  const { data: bFaqs } = await b.client.from("faqs").select("id, tenant_id");
  const { data: bSetup } = await b.client.from("setup_states").select("id, tenant_id");
  const wizardLeak = [...(bSvcs ?? []), ...(bFaqs ?? []), ...(bSetup ?? [])].filter(
    (r) => r.tenant_id === a.orgId
  );
  assert("B cannot see A's services/FAQs/setup state", wizardLeak.length === 0);

  // 8. B cannot plant data inside A's tenant.
  const { error: plantErr } = await b.client.from("services").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    name: "HACKED SERVICE",
  });
  assert("B cannot insert a service into A's tenant", !!plantErr);

  // 9. Launch gate: even the OWNER cannot go live with incomplete setup.
  const { data: liveTry, error: liveErr } = await a.client
    .from("businesses")
    .update({ status: "live" })
    .eq("id", aBiz.id)
    .select();
  assert(
    "Owner cannot set status='live' while setup is incomplete",
    !!liveErr || (liveTry ?? []).length === 0,
    liveErr?.message?.slice(0, 60)
  );
  const { error: rpcLaunchErr } = await a.client.rpc("launch_business", {
    biz: aBiz.id,
  });
  assert("launch_business RPC refuses incomplete setup", !!rpcLaunchErr);

  // 10. Approval stamps cannot be forged with a direct table write.
  const { data: forge, error: forgeErr } = await a.client
    .from("setup_states")
    .update({ pricing_approved_at: new Date().toISOString() })
    .eq("business_id", aBiz.id)
    .select();
  assert(
    "Approval stamps cannot be written directly",
    !!forgeErr || (forge ?? []).length === 0
  );

  // 11. B cannot approve or launch A's business via the RPCs.
  const { error: crossApproveErr } = await b.client.rpc("approve_setup_section", {
    biz: aBiz.id,
    section: "pricing",
  });
  assert("B cannot approve A's setup sections", !!crossApproveErr);
  const { error: crossLaunchErr } = await b.client.rpc("launch_business", {
    biz: aBiz.id,
  });
  assert("B cannot launch A's business", !!crossLaunchErr);

  // ── M5: CRM tables ────────────────────────────────────────────

  // A creates a contact with a note (note also lands on the timeline).
  const { data: aContact, error: aContactErr } = await a.client
    .from("contacts")
    .insert({ tenant_id: a.orgId, name: "Secret Customer", phone: "+15555550100" })
    .select("id")
    .single();
  if (aContactErr) throw new Error(`A create contact: ${aContactErr.message}`);
  await a.client.from("customer_notes").insert({
    tenant_id: a.orgId,
    contact_id: aContact.id,
    note: "Secret note about the secret customer.",
  });

  // 12. B sees none of A's CRM data — including a phone-number search.
  const { data: bContacts } = await b.client
    .from("contacts")
    .select("id, tenant_id")
    .eq("phone", "+15555550100");
  const { data: bNotes } = await b.client.from("customer_notes").select("tenant_id");
  const { data: bEvents } = await b.client
    .from("customer_timeline_events")
    .select("tenant_id");
  const crmLeak = [...(bContacts ?? []), ...(bNotes ?? []), ...(bEvents ?? [])].filter(
    (r) => r.tenant_id === a.orgId
  );
  assert("B cannot see A's contacts/notes/timeline", crmLeak.length === 0);

  // 13. B cannot modify A's contact.
  const { data: bEdit } = await b.client
    .from("contacts")
    .update({ name: "HACKED" })
    .eq("id", aContact.id)
    .select();
  assert("B cannot update A's contact", (bEdit ?? []).length === 0);

  // 14. The timeline is history — even members can't write it directly.
  const { error: directTimelineErr } = await a.client
    .from("customer_timeline_events")
    .insert({
      tenant_id: a.orgId,
      contact_id: aContact.id,
      event_type: "call",
      summary: "Forged call record",
    });
  assert("Timeline events cannot be written directly", !!directTimelineErr);

  // ── M6: phone tables ──────────────────────────────────────────

  // Server (service role) logs a call + number for A.
  const { error: numErr } = await admin.from("phone_numbers").insert({
    tenant_id: a.orgId,
    phone_number: "+15555550111",
  });
  if (numErr) throw new Error(`seed phone number: ${numErr.message}`);
  const { error: callSeedErr } = await admin.from("calls").insert({
    tenant_id: a.orgId,
    provider_call_id: `CAleaktest${ts}`,
    from_number: "+15555550123",
    to_number: "+15555550111",
    status: "voicemail",
  });
  if (callSeedErr) throw new Error(`seed call: ${callSeedErr.message}`);

  // 15. B sees none of A's numbers or calls.
  const { data: bNumbers } = await b.client.from("phone_numbers").select("tenant_id");
  const { data: bCalls } = await b.client.from("calls").select("tenant_id");
  const phoneLeak = [...(bNumbers ?? []), ...(bCalls ?? [])].filter(
    (r) => r.tenant_id === a.orgId
  );
  assert("B cannot see A's phone numbers or calls", phoneLeak.length === 0);

  // 16. Call logs are server-written history — members can't forge them.
  const { error: forgeCallErr } = await a.client.from("calls").insert({
    tenant_id: a.orgId,
    provider_call_id: `CAforged${ts}`,
    status: "completed",
  });
  assert("Members cannot write call logs directly", !!forgeCallErr);
  const { error: claimErr } = await a.client.from("phone_numbers").insert({
    tenant_id: a.orgId,
    phone_number: "+15555550112",
  });
  assert("Members cannot claim phone numbers directly", !!claimErr);

  // ── M9: calendar, appointments, jobs ──────────────────────────

  // Server seeds an appointment + a Google connection (with a fake
  // encrypted token) for A. A (a member) creates a job directly.
  const apptStart = new Date(Date.now() + 86_400_000).toISOString();
  const apptEnd = new Date(Date.now() + 90_000_000).toISOString();
  const { error: apptSeedErr } = await admin.from("appointments").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    title: "Secret appointment",
    starts_at: apptStart,
    ends_at: apptEnd,
  });
  if (apptSeedErr) throw new Error(`seed appointment: ${apptSeedErr.message}`);
  const { error: connSeedErr } = await admin.from("calendar_connections").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    google_account_email: "secret@example.com",
    refresh_token_encrypted: "v1:fake-secret-token",
    status: "connected",
  });
  if (connSeedErr) throw new Error(`seed connection: ${connSeedErr.message}`);
  const { data: aJob, error: aJobErr } = await a.client
    .from("jobs")
    .insert({ tenant_id: a.orgId, business_id: aBiz.id, title: "A's job", status: "scheduled" })
    .select("id")
    .single();
  assert("Owner can create a job in their tenant", !aJobErr && !!aJob?.id, aJobErr?.message);

  // 17. B sees none of A's calendar/appointment/job data.
  const { data: bAppts } = await b.client.from("appointments").select("tenant_id");
  const { data: bJobs } = await b.client.from("jobs").select("tenant_id");
  const { data: bJse } = await b.client.from("job_status_events").select("tenant_id");
  const { data: bConn } = await b.client.from("calendar_connections").select("tenant_id");
  const m9Leak = [
    ...(bAppts ?? []),
    ...(bJobs ?? []),
    ...(bJse ?? []),
    ...(bConn ?? []),
  ].filter((r) => r.tenant_id === a.orgId);
  assert("B cannot see A's appointments/jobs/calendar connection", m9Leak.length === 0);

  // 18. Appointments are server-written — members can't forge them.
  const { error: apptForgeErr } = await a.client.from("appointments").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    title: "Forged appointment",
    starts_at: apptStart,
    ends_at: apptEnd,
  });
  assert("Members cannot write appointments directly", !!apptForgeErr);

  // 19. OAuth tokens are NOT selectable by members (column-level grant),
  //     even though the connection row itself is readable.
  const tokenRead = await a.client
    .from("calendar_connections")
    .select("refresh_token_encrypted")
    .eq("business_id", aBiz.id);
  assert(
    "OAuth token columns are not selectable by members",
    !!tokenRead.error,
    tokenRead.error?.message?.slice(0, 60)
  );
  const safeRead = await a.client
    .from("calendar_connections")
    .select("status, google_account_email")
    .eq("business_id", aBiz.id)
    .maybeSingle();
  assert(
    "Members can still read safe connection columns",
    !safeRead.error && safeRead.data?.status === "connected",
    safeRead.error?.message?.slice(0, 60)
  );

  // 20. Job status trail is server/trigger-written — members can't forge it.
  const { error: jseForgeErr } = await a.client.from("job_status_events").insert({
    tenant_id: a.orgId,
    job_id: aJob?.id ?? a.orgId,
    status: "completed",
  });
  assert("Members cannot write job status events directly", !!jseForgeErr);

  // ── Knowledge Hub: documents + extraction suggestions ─────────
  // Server seeds an uploaded document + a pending suggestion for A.
  const { data: aDoc, error: docSeedErr } = await admin
    .from("knowledge_documents")
    .insert({
      tenant_id: a.orgId,
      business_id: aBiz.id,
      file_name: "secret-price-sheet.pdf",
      mime_type: "application/pdf",
      status: "extracted",
    })
    .select("id")
    .single();
  if (docSeedErr) throw new Error(`seed knowledge document: ${docSeedErr.message}`);
  const { error: sugSeedErr } = await admin.from("knowledge_suggestions").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    document_id: aDoc.id,
    kind: "faq",
    payload: { question: "secret?", answer: "secret answer" },
  });
  if (sugSeedErr) throw new Error(`seed knowledge suggestion: ${sugSeedErr.message}`);

  // 21. B sees none of A's knowledge documents or suggestions.
  const { data: bDocs } = await b.client.from("knowledge_documents").select("tenant_id");
  const { data: bSugs } = await b.client.from("knowledge_suggestions").select("tenant_id");
  const knowledgeLeak = [...(bDocs ?? []), ...(bSugs ?? [])].filter(
    (r) => r.tenant_id === a.orgId
  );
  assert("B cannot see A's knowledge documents/suggestions", knowledgeLeak.length === 0);

  // 22. B cannot approve A's suggestion into B's own tenant.
  const { error: crossKnowledgeErr } = await b.client
    .from("knowledge_suggestions")
    .update({ status: "approved" })
    .eq("document_id", aDoc.id);
  const { data: stillPending } = await admin
    .from("knowledge_suggestions")
    .select("status")
    .eq("document_id", aDoc.id)
    .maybeSingle();
  assert(
    "B cannot approve A's knowledge suggestion",
    !crossKnowledgeErr ? stillPending?.status === "pending" : true
  );

  // ── Outbound engine: automations + queued sends ───────────────
  // Server seeds an automation + a queued outbound message for A.
  const { error: autoSeedErr } = await admin.from("automations").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    kind: "review_request",
    enabled: true,
    delay_hours: 3,
    template: "secret template",
  });
  if (autoSeedErr) throw new Error(`seed automation: ${autoSeedErr.message}`);
  const { error: queueSeedErr } = await admin.from("outbound_queue").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    kind: "review_request",
    body: "secret outbound body",
    dedupe_key: `review_request:leak-${a.orgId}`,
  });
  if (queueSeedErr) throw new Error(`seed outbound_queue: ${queueSeedErr.message}`);

  // 23. B sees none of A's automations or queued messages.
  const { data: bAutos } = await b.client.from("automations").select("tenant_id");
  const { data: bQueue } = await b.client.from("outbound_queue").select("tenant_id");
  const outboundLeak = [...(bAutos ?? []), ...(bQueue ?? [])].filter(
    (r) => r.tenant_id === a.orgId
  );
  assert("B cannot see A's automations/outbound queue", outboundLeak.length === 0);

  // 24. Outbound queue is server-written — members can't forge a send.
  const { error: queueForgeErr } = await a.client.from("outbound_queue").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    kind: "review_request",
    body: "forged",
    dedupe_key: `forge-${a.orgId}`,
  });
  assert("Members cannot write the outbound queue directly", !!queueForgeErr);

  // ── Payments ──────────────────────────────────────────────────
  const { error: paySeedErr } = await admin.from("payments").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    kind: "invoice",
    amount_cents: 12345,
    description: "secret invoice",
    status: "paid",
  });
  if (paySeedErr) throw new Error(`seed payment: ${paySeedErr.message}`);

  // 25. B sees none of A's payments.
  const { data: bPays } = await b.client.from("payments").select("tenant_id");
  const payLeak = (bPays ?? []).filter((r) => r.tenant_id === a.orgId);
  assert("B cannot see A's payments", payLeak.length === 0);

  // ── Phase 10: omnichannel chat (conversations + messages) ─────
  // Server seeds A's chat settings (with a widget key), a conversation,
  // and an AI message.
  const { error: smsSetErr } = await admin.from("sms_settings").insert({
    tenant_id: a.orgId,
    business_id: aBiz.id,
    widget_key: `wk_leak_${ts}`,
  });
  if (smsSetErr) throw new Error(`seed sms_settings: ${smsSetErr.message}`);
  const { data: aConvo, error: convoSeedErr } = await admin
    .from("conversations")
    .insert({
      tenant_id: a.orgId,
      business_id: aBiz.id,
      channel: "web",
      web_visitor_id: `v_leak_${ts}`,
      customer_name: "Secret Web Visitor",
    })
    .select("id")
    .single();
  if (convoSeedErr) throw new Error(`seed conversation: ${convoSeedErr.message}`);
  await admin.from("conversation_messages").insert({
    tenant_id: a.orgId,
    conversation_id: aConvo.id,
    role: "ai",
    body_redacted: "secret reply",
  });

  // 26. B sees none of A's conversations or messages.
  const { data: bConvos } = await b.client.from("conversations").select("tenant_id");
  const { data: bConvoMsgs } = await b.client
    .from("conversation_messages")
    .select("tenant_id");
  const chatLeak = [...(bConvos ?? []), ...(bConvoMsgs ?? [])].filter(
    (r) => r.tenant_id === a.orgId
  );
  assert("B cannot see A's conversations/messages", chatLeak.length === 0);

  // 27. B cannot inject a staff reply into A's conversation.
  const { error: injectErr } = await b.client.from("conversation_messages").insert({
    tenant_id: a.orgId,
    conversation_id: aConvo.id,
    role: "staff",
    body_redacted: "INJECTED",
  });
  assert("B cannot inject a message into A's conversation", !!injectErr);

  // 28. A's widget key (the only public widget credential) doesn't leak to B.
  const { data: bSettings } = await b.client
    .from("sms_settings")
    .select("tenant_id, widget_key");
  const keyLeak = (bSettings ?? []).filter((r) => r.tenant_id === a.orgId);
  assert("B cannot read A's widget key / chat settings", keyLeak.length === 0);

  // 29. Even in their own tenant, members can't forge AI/customer turns —
  //     only 'staff' replies are member-insertable (the rest are server-only).
  const { error: forgeAiErr } = await a.client.from("conversation_messages").insert({
    tenant_id: a.orgId,
    conversation_id: aConvo.id,
    role: "ai",
    body_redacted: "forged AI line",
  });
  assert("Members cannot forge AI/customer chat messages", !!forgeAiErr);

  // ── Ph12: invitations + work assignment isolation ─────────────
  const { error: invSeedErr } = await admin.from("invitations").insert({
    tenant_id: a.orgId,
    email: "newhire@example.com",
    role: "member",
    token: `tok_leak_${ts}`,
  });
  if (invSeedErr) throw new Error(`seed invitation: ${invSeedErr.message}`);

  // 30. B cannot see A's invitations (can't discover tokens).
  const { data: bInvites } = await b.client.from("invitations").select("tenant_id, token");
  const inviteLeak = (bInvites ?? []).filter((r) => r.tenant_id === a.orgId);
  assert("B cannot see A's invitations", inviteLeak.length === 0);

  // 31. B cannot forge an invitation into A's tenant.
  const { error: forgeInviteErr } = await b.client.from("invitations").insert({
    tenant_id: a.orgId,
    email: "intruder@example.com",
    role: "admin",
    token: `tok_forge_${ts}`,
  });
  assert("B cannot create an invitation into A's tenant", !!forgeInviteErr);

  // 32. B cannot assign (or otherwise edit) A's jobs.
  const { data: bAssign } = await b.client
    .from("jobs")
    .update({ assigned_to: null })
    .eq("id", aJob?.id ?? a.orgId)
    .select();
  assert("B cannot assign A's jobs", (bAssign ?? []).length === 0);
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
