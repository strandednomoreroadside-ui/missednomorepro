import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Inbound MMS photo intake (Ph13). When a customer texts a photo of the
 * problem, Twilio's webhook includes NumMedia + MediaUrl{i}. We download each
 * image with our Twilio creds, store it in the PRIVATE `mms-media` bucket
 * (service role only), record a media_attachments row linked to the contact +
 * message, and drop a timeline event. The dashboard serves the bytes through
 * the auth-checked proxy /api/media/[id] — the raw provider/bucket URL never
 * reaches the browser.
 */

const BUCKET = "mms-media";
const MAX_MEDIA = 10; // cap per message (abuse / storage guard)
const MAX_BYTES = 15_000_000; // ~15MB per image

const ALLOWED = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
]);

const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/** How many media items this inbound message carries (clamped). */
export function countMedia(params: Record<string, string>): number {
  const n = Number(params.NumMedia ?? "0");
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(Math.floor(n), MAX_MEDIA);
}

/**
 * Download + store every media item on an inbound message. Returns how many
 * were stored. Best-effort per item — one bad image doesn't sink the rest.
 */
export async function ingestInboundMedia(
  admin: SupabaseClient,
  opts: {
    tenantId: string;
    businessId: string | null;
    contactId: string | null;
    messageId: string | null;
    params: Record<string, string>;
  }
): Promise<number> {
  const n = countMedia(opts.params);
  if (n === 0) return 0;
  if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN) {
    console.warn("[mms] media present but Twilio creds missing — skipping download");
    return 0;
  }

  // Auth to Twilio. Node's fetch drops the Authorization header on the
  // cross-origin redirect to Twilio's media CDN (pre-signed) — exactly right.
  const auth = `Basic ${Buffer.from(
    `${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`
  ).toString("base64")}`;

  let stored = 0;
  for (let i = 0; i < n; i++) {
    const url = opts.params[`MediaUrl${i}`];
    const contentType = opts.params[`MediaContentType${i}`] ?? "application/octet-stream";
    if (!url || !ALLOWED.has(contentType)) continue;

    try {
      const res = await fetch(url, { headers: { Authorization: auth } });
      if (!res.ok) {
        console.warn(`[mms] media ${i} fetch failed: ${res.status}`);
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.byteLength === 0 || buf.byteLength > MAX_BYTES) continue;

      // Record first to get the id (the storage path is namespaced by it).
      const { data: row, error: insErr } = await admin
        .from("media_attachments")
        .insert({
          tenant_id: opts.tenantId,
          business_id: opts.businessId,
          contact_id: opts.contactId,
          message_id: opts.messageId,
          source: "mms",
          content_type: contentType,
        })
        .select("id")
        .single();
      if (insErr || !row) continue;

      const path = `${opts.tenantId}/${row.id}.${EXT[contentType] ?? "bin"}`;
      const { error: upErr } = await admin.storage
        .from(BUCKET)
        .upload(path, buf, { contentType, upsert: true });
      if (upErr) {
        await admin.from("media_attachments").delete().eq("id", row.id);
        continue;
      }
      await admin.from("media_attachments").update({ storage_path: path }).eq("id", row.id);
      stored++;
    } catch (err) {
      console.error(`[mms] media ${i} ingest failed:`, err);
    }
  }

  // One timeline entry summarizing the photos (the message itself already
  // logs an SMS event).
  if (stored > 0 && opts.contactId) {
    await admin.from("customer_timeline_events").insert({
      tenant_id: opts.tenantId,
      contact_id: opts.contactId,
      event_type: "media",
      source_id: opts.messageId,
      summary: `Customer texted ${stored} photo${stored > 1 ? "s" : ""}`,
    });
  }

  return stored;
}
