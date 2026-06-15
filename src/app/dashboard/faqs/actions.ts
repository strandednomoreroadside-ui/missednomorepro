"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

async function firstBusinessId(
  supabase: SupabaseClient,
  tenantId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

/** Add an FAQ the AI may use to answer callers (via search_knowledge_base). */
export async function addFaq(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const businessId = await firstBusinessId(supabase, active.organization_id);
  if (!businessId) return;

  const question = String(formData.get("question") ?? "").trim().slice(0, 300);
  const answer = String(formData.get("answer") ?? "").trim().slice(0, 2000);
  if (!question || !answer) return;

  await supabase.from("faqs").insert({
    tenant_id: active.organization_id,
    business_id: businessId,
    question,
    answer,
  });
  revalidatePath("/dashboard/faqs");
}

/** Toggle whether the AI may use this FAQ. */
export async function toggleFaq(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  const makeActive = formData.get("active") === "true";

  await supabase
    .from("faqs")
    .update({ active: makeActive })
    .eq("id", id)
    .eq("tenant_id", active.organization_id);
  revalidatePath("/dashboard/faqs");
}

/** Delete an FAQ. */
export async function deleteFaq(formData: FormData) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await supabase
    .from("faqs")
    .delete()
    .eq("id", id)
    .eq("tenant_id", active.organization_id);
  revalidatePath("/dashboard/faqs");
}
