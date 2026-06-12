import type { Metadata } from "next";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Platform admin" };

type OrgRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
  created_at: string;
};

export default async function AdminPage() {
  // Service-role reads: this is the one place RLS is intentionally
  // bypassed, gated by the ADMIN_EMAILS check in the layout.
  const admin = createAdminClient();

  const [
    { data: orgs, error: orgErr },
    { data: members, error: memErr },
    { data: businesses, error: bizErr },
  ] = await Promise.all([
    admin
      .from("organizations")
      .select("id, name, plan, status, created_at")
      .order("created_at", { ascending: false }),
    admin.from("organization_members").select("organization_id"),
    admin
      .from("businesses")
      .select("tenant_id, status, setup_states ( current_step, launched_at )"),
  ]);

  if (orgErr || memErr || bizErr) {
    throw new Error(
      orgErr?.message ?? memErr?.message ?? bizErr?.message ?? "Admin query failed"
    );
  }

  // Setup status per org: launched, in-progress (with bookmark), or
  // not started — incomplete setups are the ones to chase (Phase 3).
  const setupByOrg = new Map<string, string>();
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

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-lg">Organizations</CardTitle>
          <CardDescription>
            Plans activate at M3; setup status arrives with the wizard at M4.
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
    </div>
  );
}
