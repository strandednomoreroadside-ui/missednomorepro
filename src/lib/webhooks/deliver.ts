import "server-only";

import { createHmac } from "node:crypto";

import type { SupabaseClient } from "@supabase/supabase-js";

import { isSafeWebhookUrl } from "./url-guard";

/**
 * Webhook delivery: POST the signed payload to a customer endpoint, record
 * the result, and schedule a backoff retry on failure. The immediate attempt
 * runs off the request's critical path (emit.ts schedules it via `after`);
 * the daily cron re-drives anything still pending. Margin: just HTTP POSTs;
 * a chronically dead endpoint auto-disables so we stop hammering it.
 */

const TIMEOUT_MS = 8000;
/** Give up after this many tries (then status='failed', no more retries). */
const MAX_ATTEMPTS = 6;
/** Disable an endpoint after this many consecutive failures across deliveries. */
const DISABLE_AFTER_FAILURES = 15;
/** Backoff (minutes) indexed by attempt number. */
const BACKOFF_MINUTES = [1, 5, 30, 120, 360, 1440];
/** Max deliveries a single cron run will re-drive (kept within maxDuration). */
const MAX_PER_RUN = 50;

type DeliveryRow = {
  id: string;
  endpoint_id: string;
  event: string;
  payload: unknown;
  attempts: number;
  status: string;
};
type EndpointRow = {
  id: string;
  url: string;
  secret: string;
  failure_count: number;
  active: boolean;
};

/** Deliver one queued webhook. Returns true on a 2xx response. */
export async function deliverOne(admin: SupabaseClient, deliveryId: string): Promise<boolean> {
  const { data: d } = await admin
    .from("webhook_deliveries")
    .select("id, endpoint_id, event, payload, attempts, status")
    .eq("id", deliveryId)
    .maybeSingle();
  const delivery = (d as DeliveryRow | null) ?? null;
  if (!delivery || delivery.status === "success") return false;

  const { data: e } = await admin
    .from("webhook_endpoints")
    .select("id, url, secret, failure_count, active")
    .eq("id", delivery.endpoint_id)
    .maybeSingle();
  const endpoint = (e as EndpointRow | null) ?? null;
  if (!endpoint || !endpoint.active) {
    await admin
      .from("webhook_deliveries")
      .update({ status: "failed", error: "endpoint_inactive" })
      .eq("id", deliveryId);
    return false;
  }

  // SSRF guard at send time (defense in depth — the URL could have been set
  // before the guard existed, or via another path). Hard-fail, no retry.
  if (!isSafeWebhookUrl(endpoint.url)) {
    await admin
      .from("webhook_deliveries")
      .update({ status: "failed", error: "blocked_url" })
      .eq("id", deliveryId);
    await admin
      .from("webhook_endpoints")
      .update({ active: false, last_error: "blocked_url" })
      .eq("id", endpoint.id);
    return false;
  }

  const body = JSON.stringify(delivery.payload);
  const signature = createHmac("sha256", endpoint.secret).update(body).digest("hex");
  const attempt = delivery.attempts + 1;

  let ok = false;
  let responseStatus: number | null = null;
  let error: string | null = null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const res = await fetch(endpoint.url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "MissedNoMorePro-Webhooks/1",
          "X-MNM-Event": delivery.event,
          "X-MNM-Delivery": delivery.id,
          "X-MNM-Signature": `sha256=${signature}`,
        },
        body,
        signal: controller.signal,
        redirect: "manual",
      });
      responseStatus = res.status;
      ok = res.ok;
      if (!ok) error = `http_${res.status}`;
    } finally {
      clearTimeout(timer);
    }
  } catch (err) {
    error =
      err instanceof Error
        ? err.name === "AbortError"
          ? "timeout"
          : err.message
        : String(err);
  }

  if (ok) {
    await admin
      .from("webhook_deliveries")
      .update({
        status: "success",
        attempts: attempt,
        response_status: responseStatus,
        error: null,
        delivered_at: new Date().toISOString(),
      })
      .eq("id", deliveryId);
    await admin
      .from("webhook_endpoints")
      .update({ failure_count: 0, last_success_at: new Date().toISOString(), last_error: null })
      .eq("id", endpoint.id);
    return true;
  }

  // Failure: retry with backoff, or give up after MAX_ATTEMPTS.
  const terminal = attempt >= MAX_ATTEMPTS;
  const backoff = BACKOFF_MINUTES[Math.min(attempt - 1, BACKOFF_MINUTES.length - 1)];
  await admin
    .from("webhook_deliveries")
    .update({
      status: terminal ? "failed" : "pending",
      attempts: attempt,
      response_status: responseStatus,
      error,
      next_attempt_at: new Date(Date.now() + backoff * 60_000).toISOString(),
    })
    .eq("id", deliveryId);

  const failureCount = endpoint.failure_count + 1;
  const patch: Record<string, unknown> = { failure_count: failureCount, last_error: error };
  if (failureCount >= DISABLE_AFTER_FAILURES) patch.active = false; // stop hammering a dead URL
  await admin.from("webhook_endpoints").update(patch).eq("id", endpoint.id);
  return false;
}

export interface WebhookRunResult {
  due: number;
  delivered: number;
  failed: number;
}

/** Re-drive due deliveries (pending + their next_attempt_at reached). Daily cron. */
export async function processWebhookQueue(admin: SupabaseClient): Promise<WebhookRunResult> {
  const { data } = await admin
    .from("webhook_deliveries")
    .select("id")
    .eq("status", "pending")
    .lte("next_attempt_at", new Date().toISOString())
    .order("next_attempt_at", { ascending: true })
    .limit(MAX_PER_RUN);
  const rows = (data ?? []) as { id: string }[];

  const results = await Promise.all(rows.map((r) => deliverOne(admin, r.id)));
  const delivered = results.filter(Boolean).length;
  return { due: rows.length, delivered, failed: rows.length - delivered };
}
