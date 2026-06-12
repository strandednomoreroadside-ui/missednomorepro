"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_ORG_COOKIE, getMemberships, requireUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit";

export async function switchOrganization(formData: FormData) {
  const orgId = String(formData.get("organizationId") ?? "");
  const user = await requireUser();
  const memberships = await getMemberships();

  // Only switch into organizations the user actually belongs to.
  const target = memberships.find((m) => m.organization_id === orgId);
  if (!target) redirect("/dashboard");

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, orgId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });

  await logAudit({
    tenantId: orgId,
    actorUserId: user.id,
    action: "tenant.switched",
    entityType: "organization",
    entityId: orgId,
  });

  redirect("/dashboard");
}
