"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ACTIVE_ORG_COOKIE } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createOrganization(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 1 || name.length > 120) {
    redirect(
      `/onboarding?error=${encodeURIComponent("Enter a business name (1–120 characters).")}`
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Atomic: creates the organization, makes this user its owner, and
  // writes the audit log — all inside one database function (see the
  // M2 migration). The AI/staff can never end up with an ownerless org.
  const { data: orgId, error } = await supabase.rpc("create_organization", {
    org_name: name,
  });
  if (error) redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);

  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_ORG_COOKIE, String(orgId), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
