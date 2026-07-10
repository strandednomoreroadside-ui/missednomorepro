import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

export const ACTIVE_ORG_COOKIE = "mnm-active-org";

export type Membership = {
  organization_id: string;
  role: "owner" | "admin" | "member";
  organizations: {
    id: string;
    name: string;
    plan: string;
    status: string;
  };
};

/** Current signed-in user, or null. Cached per request. */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

/** Redirects to /login when signed out. */
export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

/** All organizations the current user belongs to (RLS-scoped). */
export const getMemberships = cache(async (): Promise<Membership[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("organization_members")
    .select("organization_id, role, organizations ( id, name, plan, status )")
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to load memberships: ${error.message}`);
  return (data ?? []) as unknown as Membership[];
});

/**
 * The signed-in user's active organization (tenant). Falls back to the
 * first membership when the cookie is missing or no longer valid, and
 * sends brand-new users to onboarding to create their organization.
 */
export async function requireActiveOrg() {
  const user = await requireUser();
  const memberships = await getMemberships();
  if (memberships.length === 0) redirect("/onboarding");

  const cookieStore = await cookies();
  const requested = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const active =
    memberships.find((m) => m.organization_id === requested) ?? memberships[0];

  return { user, memberships, active };
}

/** Owner/admin can manage business-wide config (the AI kill switch, calendar
 *  booking, numbers, team); a plain `member` (e.g. a field tech) cannot. */
export function isOrgManager(role: string): boolean {
  return role === "owner" || role === "admin";
}

/** True when the signed-in user's email is in ADMIN_EMAILS (platform admin). */
export async function isPlatformAdmin() {
  const user = await getUser();
  if (!user?.email || !env.ADMIN_EMAILS) return false;
  const allowed = env.ADMIN_EMAILS.split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(user.email.toLowerCase());
}
