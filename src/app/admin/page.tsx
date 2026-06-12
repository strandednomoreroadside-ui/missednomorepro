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
// Live service-role reads — never prerender at build time.
export const dynamic = "force-dynamic";

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

  const [{ data: orgs, error: orgErr }, { data: members, error: memErr }] =
    await Promise.all([
      admin
        .from("organizations")
        .select("id, name, plan, status, created_at")
        .order("created_at", { ascending: false }),
      admin.from("organization_members").select("organization_id"),
    ]);

  if (orgErr || memErr) {
    throw new Error(orgErr?.message ?? memErr?.message ?? "Admin query failed");
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
