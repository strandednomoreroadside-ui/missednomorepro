import { redirect } from "next/navigation";

import { requireActiveOrg } from "@/lib/auth";
import { getOrCreateBusiness } from "@/lib/setup/queries";
import { isStepId } from "@/lib/setup/steps";
import { createClient } from "@/lib/supabase/server";

/** Resume the wizard exactly where the user left off. */
export default async function SetupIndexPage() {
  const { active } = await requireActiveOrg();
  const business = await getOrCreateBusiness(
    active.organization_id,
    active.organizations.name
  );

  const supabase = await createClient();
  const { data: state } = await supabase
    .from("setup_states")
    .select("current_step")
    .eq("business_id", business.id)
    .maybeSingle();

  const step =
    state?.current_step && isStepId(state.current_step)
      ? state.current_step
      : "profile";
  redirect(`/dashboard/setup/${step}`);
}
