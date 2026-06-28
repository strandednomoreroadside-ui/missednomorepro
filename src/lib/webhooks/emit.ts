import "server-only";

import { randomUUID } from "node:crypto";

import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

import { deliverOne } from "./deliver";
import type { WebhookEvent } from "./events";

/**
 * Fire a webhook event to every active endpoint that subscribes to it.
 *
 * Safe to call from anywhere (it makes its own service-role client) and from
 * hot paths: when the tenant has no matching endpoint — the common case — it
 * returns after a single indexed SELECT and does no other work. Only when an
 * endpoint exists does it enrich + enqueue. The actual HTTP POST is deferred
 * off the request's critical path via `after`, so AI handling never waits on a
 * customer's (possibly slow) URL; the daily cron re-drives any failures.
 *
 * Never throws — a webhook hiccup must not break the action that triggered it.
 */
export async function emitWebhookEvent(opts: {
  tenantId: string;
  businessId?: string | null;
  event: WebhookEvent;
  data: Record<string, unknown>;
}): Promise<void> {
  try {
    const admin = createAdminClient();

    const { data: rows } = await admin
      .from("webhook_endpoints")
      .select("id, events")
      .eq("tenant_id", opts.tenantId)
      .eq("active", true);
    const endpoints = (rows ?? []) as { id: string; events: string[] }[];
    const matched = endpoints.filter(
      (e) => e.events.length === 0 || e.events.includes(opts.event)
    );
    if (matched.length === 0) return;

    // Enrich the contact (id -> name/phone/email) so the consumer's "new lead"
    // trigger is actually useful. Only runs when an endpoint is configured.
    const data = { ...opts.data };
    if (data.contact_id && !data.contact) {
      const { data: contact } = await admin
        .from("contacts")
        .select("id, name, phone, email")
        .eq("id", String(data.contact_id))
        .eq("tenant_id", opts.tenantId)
        .maybeSingle();
      if (contact) data.contact = contact;
    }

    const createdAt = new Date().toISOString();
    for (const ep of matched) {
      const payload = {
        id: randomUUID(),
        event: opts.event,
        created_at: createdAt,
        business_id: opts.businessId ?? null,
        data,
      };
      const { data: delivery } = await admin
        .from("webhook_deliveries")
        .insert({
          tenant_id: opts.tenantId,
          endpoint_id: ep.id,
          event: opts.event,
          payload,
        })
        .select("id")
        .single();
      if (delivery?.id) scheduleDelivery(delivery.id as string);
    }
  } catch (err) {
    console.error("[webhooks] emit failed:", err);
  }
}

/** Deliver now, after the response is sent (Vercel keeps the function warm for
 *  `after`). Falls back to fire-and-forget outside request scope; the cron
 *  retries either way. */
function scheduleDelivery(deliveryId: string): void {
  const run = async () => {
    try {
      await deliverOne(createAdminClient(), deliveryId);
    } catch (err) {
      console.error("[webhooks] immediate delivery failed:", err);
    }
  };
  try {
    after(run);
  } catch {
    void run();
  }
}
