"use server";

import { revalidatePath } from "next/cache";

import { requireActiveOrg } from "@/lib/auth";
import { advanceLead } from "@/lib/crm/pipeline";
import { requestReview } from "@/lib/reputation/review";
import { enqueueFollowup } from "@/lib/sms/outbound-engine";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const JOB_STATUSES = ["new", "scheduled", "in_progress", "completed", "canceled"];

/**
 * Update a job's status. Completing a job advances the customer's lead to
 * "completed" (or "repeat" if they've completed work before) and tags them
 * a Customer — keeping the pipeline + analytics honest.
 */
export async function updateJobStatus(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const supabase = await createClient();

  const jobId = String(formData.get("job_id") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!jobId || !JOB_STATUSES.includes(status)) return;

  const { data: job } = await supabase
    .from("jobs")
    .select("id, contact_id, business_id, status")
    .eq("id", jobId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (!job) return;

  const { error } = await supabase
    .from("jobs")
    .update({ status })
    .eq("id", jobId)
    .eq("tenant_id", tenantId);
  if (error) return;

  if (status === "completed" && job.contact_id) {
    // Repeat customer if they've completed a job before this one.
    const { count } = await supabase
      .from("jobs")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("contact_id", job.contact_id)
      .eq("status", "completed")
      .neq("id", jobId);
    const stage = (count ?? 0) > 0 ? "repeat" : "completed";
    await advanceLead(supabase, tenantId, job.contact_id, stage);

    // Tag the contact as a Customer (idempotent).
    const { data: contact } = await supabase
      .from("contacts")
      .select("tags")
      .eq("id", job.contact_id)
      .eq("tenant_id", tenantId)
      .maybeSingle();
    const tags = (contact?.tags as string[] | null) ?? [];
    if (!tags.includes("Customer")) {
      await supabase
        .from("contacts")
        .update({ tags: [...tags, "Customer"] })
        .eq("id", job.contact_id)
        .eq("tenant_id", tenantId);
    }

    // Queue post-job follow-ups (opt-in; outbound_queue is service-role write).
    if (job.business_id) {
      const admin = createAdminClient();
      await enqueueFollowup(admin, {
        tenantId,
        businessId: job.business_id,
        contactId: job.contact_id,
        kind: "review_request",
        dedupeKey: `review_request:${jobId}`,
      });
      await enqueueFollowup(admin, {
        tenantId,
        businessId: job.business_id,
        contactId: job.contact_id,
        kind: "maintenance",
        dedupeKey: `maintenance:${jobId}`,
      });

      // Reputation Manager (separate add-on): the gated review request — a
      // no-op unless the add-on is active AND reputation is toggled on.
      await requestReview(admin, {
        tenantId,
        businessId: job.business_id,
        contactId: job.contact_id,
        jobId,
      });
    }
  }

  revalidatePath("/dashboard/jobs");
  revalidatePath("/dashboard/leads");
}
