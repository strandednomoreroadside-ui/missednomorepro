import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Writes an audit log row (master plan §9). Audit writes go through the
 * service role — clients can read their tenant's log but never write it.
 * Failures are logged, never thrown: an audit hiccup must not break the
 * user-facing action itself.
 */
export async function logAudit(entry: {
  tenantId: string;
  actorUserId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("audit_logs").insert({
      tenant_id: entry.tenantId,
      actor_user_id: entry.actorUserId ?? null,
      action: entry.action,
      entity_type: entry.entityType ?? null,
      entity_id: entry.entityId ?? null,
      metadata: entry.metadata ?? {},
    });
    if (error) console.error("[audit] insert failed:", error.message);
  } catch (err) {
    console.error("[audit] unavailable:", err);
  }
}
