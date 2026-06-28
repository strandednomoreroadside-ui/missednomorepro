"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";

import { logAudit } from "@/lib/audit";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { deliverOne } from "@/lib/webhooks/deliver";
import { TEST_EVENT, WEBHOOK_EVENTS } from "@/lib/webhooks/events";

/**
 * Webhook endpoint management (the Zapier escape hatch, Professional+ via the
 * `zapier` flag). Owner/admin only — endpoints can exfiltrate tenant data and
 * carry a signing secret. RLS (app.has_role) is the second layer; these
 * actions are the first.
 */

type Gate = { tenantId: string; userId?: string | null };

async function gate(): Promise<Gate | null> {
  const { active, user } = await requireActiveOrg();
  if (active.role !== "owner" && active.role !== "admin") return null;
  const ent = await getEntitlements(active.organization_id);
  if (!ent.has("zapier")) return null;
  return { tenantId: active.organization_id, userId: user?.id };
}

export async function addWebhook(formData: FormData): Promise<void> {
  const g = await gate();
  if (!g) return;

  const url = String(formData.get("url") ?? "").trim();
  // HTTPS only — we POST tenant data to it.
  if (!/^https:\/\/.+/i.test(url) || url.length > 2048) return;

  const label = String(formData.get("label") ?? "").trim().slice(0, 80) || null;
  const events = WEBHOOK_EVENTS.filter((e) => formData.get(`event_${e}`) === "on");
  const secret = "whsec_" + randomBytes(24).toString("hex");

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", g.tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { error } = await supabase.from("webhook_endpoints").insert({
    tenant_id: g.tenantId,
    business_id: (business as { id?: string } | null)?.id ?? null,
    label,
    url,
    secret,
    events, // empty = all events
  });
  if (error) {
    console.error("[integrations] add endpoint failed:", error.message);
    return;
  }

  await logAudit({
    tenantId: g.tenantId,
    actorUserId: g.userId,
    action: "webhook_endpoint.created",
    entityType: "webhook_endpoint",
    metadata: { url, events },
  });
  revalidatePath("/dashboard/integrations");
}

export async function toggleWebhook(formData: FormData): Promise<void> {
  const g = await gate();
  if (!g) return;
  const id = String(formData.get("id") ?? "");
  const active = formData.get("active") === "true";
  if (!id) return;

  const supabase = await createClient();
  // Re-enabling clears the failure counter so a fixed endpoint starts fresh.
  const patch: Record<string, unknown> = { active };
  if (active) {
    patch.failure_count = 0;
    patch.last_error = null;
  }
  await supabase
    .from("webhook_endpoints")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", g.tenantId);
  revalidatePath("/dashboard/integrations");
}

export async function deleteWebhook(formData: FormData): Promise<void> {
  const g = await gate();
  if (!g) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const supabase = await createClient();
  await supabase.from("webhook_endpoints").delete().eq("id", id).eq("tenant_id", g.tenantId);
  await logAudit({
    tenantId: g.tenantId,
    actorUserId: g.userId,
    action: "webhook_endpoint.deleted",
    entityType: "webhook_endpoint",
    entityId: id,
  });
  revalidatePath("/dashboard/integrations");
}

/** Send a test (`ping`) delivery to an endpoint and show the result in the log. */
export async function sendTestWebhook(formData: FormData): Promise<void> {
  const g = await gate();
  if (!g) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  // Confirm the endpoint belongs to this tenant (RLS-scoped read).
  const supabase = await createClient();
  const { data: endpoint } = await supabase
    .from("webhook_endpoints")
    .select("id")
    .eq("id", id)
    .eq("tenant_id", g.tenantId)
    .maybeSingle();
  if (!endpoint) return;

  // Deliveries are service-role written.
  const admin = createAdminClient();
  const { data: delivery } = await admin
    .from("webhook_deliveries")
    .insert({
      tenant_id: g.tenantId,
      endpoint_id: id,
      event: TEST_EVENT,
      payload: {
        event: TEST_EVENT,
        created_at: new Date().toISOString(),
        data: { message: "Test webhook from Missed No More Pro" },
      },
    })
    .select("id")
    .single();
  if (delivery?.id) await deliverOne(admin, delivery.id as string);

  revalidatePath("/dashboard/integrations");
}
