import type { Metadata } from "next";

import { FormBanner } from "@/components/form-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { env } from "@/lib/env";
import { formatUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";

import { assignPhoneNumber, setTenantAiEnabled } from "./actions";

export const metadata: Metadata = { title: "Platform admin" };
// Live service-role reads — never prerender at build time.
export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type OrgRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const assigned = sp.assigned === "1";

  // Service-role reads: this is the one place RLS is intentionally
  // bypassed, gated by the ADMIN_EMAILS check in the layout.
  const admin = createAdminClient();

  const [
    { data: orgs, error: orgErr },
    { data: members, error: memErr },
    { data: businesses, error: bizErr },
    { data: numbers, error: numErr },
    { data: subs, error: subErr },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, plan, status, created_at")
      .order("created_at", { ascending: false }),
    admin.from("organization_members").select("organization_id"),
    admin
      .from("businesses")
      .select("tenant_id, status, ai_enabled, setup_states ( current_step, launched_at )"),
    admin.from("phone_numbers").select("tenant_id, phone_number"),
    admin.from("subscriptions").select("tenant_id, founder_slot, founder_lapsed"),
  ]);

  if (orgErr || memErr || bizErr || numErr || subErr) {
    throw new Error(
      orgErr?.message ?? memErr?.message ?? bizErr?.message ?? numErr?.message ??
        subErr?.message ?? "Admin query failed"
    );
  }

  const numberByOrg = new Map<string, string>();
  for (const n of numbers ?? []) numberByOrg.set(n.tenant_id, n.phone_number);

  // Setup status per org: launched, in-progress (with bookmark), or
  // not started — incomplete setups are the ones to chase (Phase 3).
  const setupByOrg = new Map<string, string>();
  const aiByOrg = new Map<string, boolean>();
  for (const b of businesses ?? []) {
    const state = Array.isArray(b.setup_states) ? b.setup_states[0] : b.setup_states;
    setupByOrg.set(
      b.tenant_id,
      b.status === "live"
        ? "live"
        : state?.current_step
          ? `at “${state.current_step}”`
          : "started"
    );
    aiByOrg.set(b.tenant_id, (b as { ai_enabled?: boolean }).ai_enabled !== false);
  }

  const founderByOrg = new Map<string, { slot: number; lapsed: boolean }>();
  for (const s of subs ?? []) {
    const row = s as { tenant_id: string; founder_slot: number | null; founder_lapsed: boolean };
    if (row.founder_slot != null) {
      founderByOrg.set(row.tenant_id, { slot: row.founder_slot, lapsed: row.founder_lapsed });
    }
  }

  const memberCounts = new Map<string, number>();
  for (const m of members ?? []) {
    memberCounts.set(
      m.organization_id,
      (memberCounts.get(m.organization_id) ?? 0) + 1
    );
  }

  const rows = (orgs ?? []) as OrgRow[];

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Tenants
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every organization on the platform. {rows.length} total.
      </p>

      {error && <div className="mt-5"><FormBanner kind="error">{error}</FormBanner></div>}
      {assigned && (
        <div className="mt-5">
          <FormBanner kind="success">Number assigned.</FormBanner>
        </div>
      )}

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Organizations</CardTitle>
          <CardDescription>
            Plan, live status, and setup progress for every business on the platform.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No organizations yet — sign up on the app to create the first one.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/70 text-left font-mono text-[10px] uppercase tracking-widest text-steel">
                    <th className="pb-2 pr-4">Name</th>
                    <th className="pb-2 pr-4">Plan</th>
                    <th className="pb-2 pr-4">Status</th>
                    <th className="pb-2 pr-4">Setup</th>
                    <th className="pb-2 pr-4">Phone</th>
                    <th className="pb-2 pr-4">AI</th>
                    <th className="pb-2 pr-4">Founder</th>
                    <th className="pb-2 pr-4">Members</th>
                    <th className="pb-2">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((org) => (
                    <tr key={org.id} className="border-b border-border/40">
                      <td className="py-2.5 pr-4 font-medium text-foreground">
                        {org.name}
                      </td>
                      <td className="py-2.5 pr-4 text-muted-foreground">{org.plan}</td>
                      <td className="py-2.5 pr-4">
                        <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success">
                          {org.status}
                        </span>
                      </td>
                      <td className="py-2.5 pr-4">
                        {setupByOrg.get(org.id) === "live" ? (
                          <span className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success">
                            live
                          </span>
                        ) : setupByOrg.has(org.id) ? (
                          <span className="rounded-full border border-alert/40 bg-alert/10 px-2 py-0.5 text-xs text-alert">
                            incomplete — {setupByOrg.get(org.id)}
                          </span>
                        ) : (
                          <span className="text-xs text-steel">not started</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-xs text-muted-foreground">
                        {numberByOrg.has(org.id)
                          ? formatUsPhone(numberByOrg.get(org.id) ?? null)
                          : "—"}
                      </td>
                      <td className="py-2.5 pr-4">
                        <form action={setTenantAiEnabled} className="flex items-center gap-2">
                          <input type="hidden" name="tenant_id" value={org.id} />
                          <input
                            type="hidden"
                            name="enabled"
                            value={aiByOrg.get(org.id) ? "0" : "1"}
                          />
                          {aiByOrg.get(org.id) ? (
                            <button
                              type="submit"
                              className="rounded-full border border-success/40 bg-success/10 px-2 py-0.5 text-xs text-success hover:bg-success/20"
                              title="AI is on — click to force off (forwards calls to owner)"
                            >
                              on
                            </button>
                          ) : (
                            <button
                              type="submit"
                              className="rounded-full border border-alert/40 bg-alert/10 px-2 py-0.5 text-xs text-alert hover:bg-alert/20"
                              title="AI is off — click to turn back on"
                            >
                              off
                            </button>
                          )}
                        </form>
                      </td>
                      <td className="py-2.5 pr-4">
                        {founderByOrg.has(org.id) ? (
                          <span
                            className={`rounded-full border px-2 py-0.5 text-xs ${
                              founderByOrg.get(org.id)?.lapsed
                                ? "border-border text-steel"
                                : "border-amber-400/40 bg-amber-400/10 text-amber-400"
                            }`}
                          >
                            #{founderByOrg.get(org.id)?.slot}
                            {founderByOrg.get(org.id)?.lapsed ? " lapsed" : ""}
                          </span>
                        ) : (
                          <span className="text-xs text-steel">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pr-4 font-mono text-muted-foreground">
                        {memberCounts.get(org.id) ?? 0}
                      </td>
                      <td className="py-2.5 text-muted-foreground">
                        {new Date(org.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">
            Assign a phone number
          </CardTitle>
          <CardDescription>
            Attaches a platform-owned Twilio number to a tenant — its calls
            route to that tenant&rsquo;s greeting and call log. Make sure the
            number&rsquo;s voice webhook points at this app (run{" "}
            <code className="font-mono text-xs text-cyan">
              node scripts/twilio-setup.mjs
            </code>
            ).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={assignPhoneNumber} className="flex flex-wrap items-end gap-4">
            <div className="space-y-2">
              <Label htmlFor="assign-tenant">Tenant</Label>
              <Select id="assign-tenant" name="tenant_id" className="w-64" required>
                {rows.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assign-number">Number</Label>
              <Input
                id="assign-number"
                name="phone_number"
                type="tel"
                defaultValue={env.TWILIO_PHONE_NUMBER ?? ""}
                placeholder="+14406442423"
                className="w-48"
                required
              />
            </div>
            <Button type="submit" variant="outline">
              Assign
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
