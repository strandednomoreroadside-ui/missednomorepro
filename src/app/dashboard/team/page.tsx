import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Mail, TriangleAlert, UserPlus, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { changeRole, inviteMember, removeMember, revokeInvite } from "./actions";

export const metadata: Metadata = { title: "Team" };

type Member = { user_id: string; role: string; email: string };
type Invite = { id: string; email: string; role: string; token: string; created_at: string };

export default async function TeamPage() {
  const { user, active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);
  const canManage = active.role === "owner" || active.role === "admin";

  if (!ent.has("multi_user")) {
    return (
      <div className="mx-auto max-w-3xl">
        <Header />
        <Card className="mt-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-amber-500">
              <TriangleAlert className="size-4" aria-hidden />
              Professional plan required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            Inviting teammates with roles is on <strong>Professional</strong> and up.{" "}
            <Link href="/dashboard/billing" className="text-cyan hover:underline">
              Upgrade
            </Link>{" "}
            to add your team.
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const admin = createAdminClient();

  const [{ data: memberRows }, { data: inviteRows }] = await Promise.all([
    supabase
      .from("organization_members")
      .select("user_id, role")
      .eq("organization_id", tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("invitations")
      .select("id, email, role, token, created_at")
      .eq("tenant_id", tenantId)
      .eq("status", "pending")
      .order("created_at", { ascending: false }),
  ]);

  // Resolve member emails via the admin auth API (small N).
  const members: Member[] = [];
  for (const m of (memberRows ?? []) as { user_id: string; role: string }[]) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    members.push({ user_id: m.user_id, role: m.role, email: data.user?.email ?? "—" });
  }
  const invites = (inviteRows ?? []) as Invite[];

  return (
    <div className="mx-auto max-w-3xl">
      <Header />

      {/* Invite */}
      {canManage && (
        <Card className="mt-6 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <UserPlus className="size-4 text-cyan" aria-hidden />
              Invite a teammate
            </CardTitle>
            <CardDescription>
              They&rsquo;ll get an accept link below to copy and send (email delivery coming soon).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={inviteMember} className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                name="email"
                required
                placeholder="teammate@email.com"
                className="h-9 min-w-56 flex-1"
                aria-label="Teammate email"
              />
              <select
                name="role"
                defaultValue="member"
                className="h-9 rounded-md border border-input bg-night/60 px-2 text-sm"
                aria-label="Role"
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
              <Button type="submit" size="sm">
                Send invite
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Pending invites */}
      {invites.length > 0 && (
        <Card className="mt-4 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Mail className="size-4 text-cyan" aria-hidden />
              Pending invites
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {invites.map((inv) => (
              <div key={inv.id} className="rounded-lg border border-border/50 px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm font-medium">
                    {inv.email}
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-steel">
                      {inv.role}
                    </span>
                  </span>
                  {canManage && (
                    <form action={revokeInvite}>
                      <input type="hidden" name="invite_id" value={inv.id} />
                      <Button type="submit" size="sm" variant="ghost" className="h-7 text-xs">
                        Revoke
                      </Button>
                    </form>
                  )}
                </div>
                <input
                  readOnly
                  defaultValue={`${env.NEXT_PUBLIC_APP_URL}/invite/${inv.token}`}
                  className="mt-2 w-full rounded-md border border-border/60 bg-night/60 px-2.5 py-1.5 font-mono text-[11px] text-steel"
                  aria-label="Accept link"
                />
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Members */}
      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Users className="size-4 text-cyan" aria-hidden />
            Members
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {members.map((m) => {
            const isOwner = m.role === "owner";
            const isSelf = m.user_id === user.id;
            return (
              <div
                key={m.user_id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/50 px-3.5 py-3"
              >
                <span className="flex items-center gap-2 text-sm">
                  {isOwner && <Crown className="size-3.5 text-cyan" aria-hidden />}
                  <span className="font-medium text-foreground">{m.email}</span>
                  {isSelf && <span className="text-xs text-steel">(you)</span>}
                  <span className="rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
                    {m.role}
                  </span>
                </span>
                {canManage && !isOwner && !isSelf && (
                  <div className="flex items-center gap-2">
                    <form action={changeRole} className="flex items-center gap-1.5">
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <select
                        name="role"
                        defaultValue={m.role}
                        className="h-8 rounded-md border border-input bg-night/60 px-2 text-xs"
                        aria-label={`Role for ${m.email}`}
                      >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                      </select>
                      <Button type="submit" size="sm" variant="ghost" className="h-8 px-2 text-xs">
                        Save
                      </Button>
                    </form>
                    <form action={removeMember}>
                      <input type="hidden" name="user_id" value={m.user_id} />
                      <Button
                        type="submit"
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                      >
                        Remove
                      </Button>
                    </form>
                  </div>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Users className="size-6 text-cyan" aria-hidden />
        Team
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Invite teammates and manage who can do what.
      </p>
    </div>
  );
}
