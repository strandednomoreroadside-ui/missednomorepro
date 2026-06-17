"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

/** Accept an invitation: adds the signed-in user to the org via the
 *  SECURITY DEFINER accept_invitation RPC (the only client path into an
 *  existing org). Not signed in → bounce to login and come back. */
export async function acceptInvite(formData: FormData): Promise<void> {
  const token = String(formData.get("token") ?? "");
  if (!token) redirect("/dashboard");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { error } = await supabase.rpc("accept_invitation", { invite_token: token });
  if (error) {
    redirect(`/invite/${token}?error=1`);
  }
  redirect("/dashboard");
}
