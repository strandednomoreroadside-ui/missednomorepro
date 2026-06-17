"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const isManager = (role: string) => role === "owner" || role === "admin";

/** Invite a teammate. Inserts a pending invitation; the team page shows the
 *  copyable accept link (email delivery is deferred until Resend is set up). */
export async function inviteMember(formData: FormData): Promise<void> {
  const { user, active } = await requireActiveOrg();
  if (!isManager(active.role)) return;
  const tenantId = active.organization_id;

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const role = String(formData.get("role") ?? "member");
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
  if (role !== "admin" && role !== "member") return;

  const token = randomUUID().replace(/-/g, "") + randomUUID().replace(/-/g, "");
  const supabase = await createClient(); // RLS: owner/admin may insert
  const { error } = await supabase.from("invitations").insert({
    tenant_id: tenantId,
    email,
    role,
    token,
    invited_by: user.id,
  });
  if (error) {
    console.error("[team] invite failed:", error.message);
    return;
  }
  await logAudit({
    tenantId,
    actorUserId: user.id,
    action: "team.invited",
    entityType: "invitation",
    metadata: { email, role },
  });
  revalidatePath("/dashboard/team");
}

/** Revoke a pending invitation. */
export async function revokeInvite(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  if (!isManager(active.role)) return;
  const tenantId = active.organization_id;
  const id = String(formData.get("invite_id") ?? "");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("invitations")
    .update({ status: "revoked" })
    .eq("id", id)
    .eq("tenant_id", tenantId);
  revalidatePath("/dashboard/team");
}

/** Change a member's role. Owners are immutable via this UI (prevents
 *  lockout); only admin↔member is adjustable. Service role (members can't
 *  write organization_members directly). */
export async function changeRole(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  if (!isManager(active.role)) return;
  const tenantId = active.organization_id;
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "");
  if (!userId || (role !== "admin" && role !== "member")) return;

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target || target.role === "owner") return; // never touch an owner
  await admin
    .from("organization_members")
    .update({ role })
    .eq("organization_id", tenantId)
    .eq("user_id", userId);
  revalidatePath("/dashboard/team");
}

/** Remove a member (non-owner, not yourself). */
export async function removeMember(formData: FormData): Promise<void> {
  const { user, active } = await requireActiveOrg();
  if (!isManager(active.role)) return;
  const tenantId = active.organization_id;
  const userId = String(formData.get("user_id") ?? "");
  if (!userId || userId === user.id) return;

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("organization_members")
    .select("role")
    .eq("organization_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!target || target.role === "owner") return; // owners immutable here
  await admin
    .from("organization_members")
    .delete()
    .eq("organization_id", tenantId)
    .eq("user_id", userId);
  await logAudit({
    tenantId,
    actorUserId: user.id,
    action: "team.member_removed",
    entityType: "member",
    entityId: userId,
  });
  revalidatePath("/dashboard/team");
}
