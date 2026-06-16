"use server";

import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  ACCEPTED_MIME_TYPES,
  MAX_UPLOAD_BYTES,
  extractFromDocument,
  isExtractionConfigured,
  type ServiceSuggestion,
} from "@/lib/knowledge/extract";

const BUCKET = "knowledge-docs";

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

function extFor(fileName: string, mime: string): string {
  const fromName = fileName.includes(".") ? fileName.split(".").pop() : "";
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  const map: Record<string, string> = {
    "application/pdf": "pdf",
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "text/plain": "txt",
    "text/csv": "csv",
    "text/markdown": "md",
  };
  return map[mime] ?? "bin";
}

/**
 * Upload a document, store it privately, and run the extraction pass into
 * the approval queue. Returns nothing (server action) — the page revalidates
 * and shows the document + its pending suggestions.
 */
export async function uploadDocument(formData: FormData): Promise<void> {
  const { active, user } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const supabase = await createClient();

  const businessId = await firstBusinessId(supabase, tenantId);
  if (!businessId) return;

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return;
  if (file.size > MAX_UPLOAD_BYTES) return;

  const mimeType = file.type || "application/octet-stream";
  if (!ACCEPTED_MIME_TYPES.includes(mimeType)) return;

  const fileName = file.name.slice(0, 255);

  // 1) Record the document (RLS-scoped insert via the member's client).
  const { data: inserted, error: insertErr } = await supabase
    .from("knowledge_documents")
    .insert({
      tenant_id: tenantId,
      business_id: businessId,
      file_name: fileName,
      mime_type: mimeType,
      size_bytes: file.size,
      status: "processing",
      uploaded_by: user.id,
    })
    .select("id")
    .single();

  if (insertErr || !inserted) return;
  const docId = inserted.id as string;

  // 2) Store the original file in the private bucket (service role only).
  const admin = createAdminClient();
  const buffer = Buffer.from(await file.arrayBuffer());
  const storagePath = `${tenantId}/${docId}.${extFor(fileName, mimeType)}`;
  const { error: uploadErr } = await admin.storage
    .from(BUCKET)
    .upload(storagePath, buffer, { contentType: mimeType, upsert: true });

  if (uploadErr) {
    await admin
      .from("knowledge_documents")
      .update({ status: "failed", error: `Storage upload failed: ${uploadErr.message}` })
      .eq("id", docId);
    revalidatePath("/dashboard/knowledge/upload");
    return;
  }
  await admin
    .from("knowledge_documents")
    .update({ storage_path: storagePath })
    .eq("id", docId);

  // 3) Extraction pass → approval queue.
  if (!isExtractionConfigured()) {
    await admin
      .from("knowledge_documents")
      .update({ status: "failed", error: "Extraction is not configured (OPENAI_API_KEY)." })
      .eq("id", docId);
    revalidatePath("/dashboard/knowledge/upload");
    return;
  }

  try {
    const result = await extractFromDocument({ buffer, mimeType, fileName });
    const rows = [
      ...result.faqs.map((payload) => ({
        tenant_id: tenantId,
        business_id: businessId,
        document_id: docId,
        kind: "faq" as const,
        payload,
      })),
      ...result.services.map((payload) => ({
        tenant_id: tenantId,
        business_id: businessId,
        document_id: docId,
        kind: "service" as const,
        payload,
      })),
    ];

    if (rows.length > 0) {
      await admin.from("knowledge_suggestions").insert(rows);
    }
    await admin
      .from("knowledge_documents")
      .update({ status: "extracted", error: null })
      .eq("id", docId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    await admin
      .from("knowledge_documents")
      .update({ status: "failed", error: message.slice(0, 500) })
      .eq("id", docId);
  }

  revalidatePath("/dashboard/knowledge/upload");
}

/** Re-run extraction for a document that previously failed or was stored. */
export async function retryExtraction(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const supabase = await createClient();
  const docId = String(formData.get("documentId") ?? "");
  if (!docId) return;

  // Confirm ownership via the RLS-scoped client before using admin.
  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("id, business_id, file_name, mime_type, storage_path")
    .eq("id", docId)
    .maybeSingle();
  if (!doc?.storage_path) return;

  const admin = createAdminClient();
  await admin
    .from("knowledge_documents")
    .update({ status: "processing", error: null })
    .eq("id", docId);
  // Clear any prior suggestions still pending from this doc to avoid dupes.
  await admin
    .from("knowledge_suggestions")
    .delete()
    .eq("document_id", docId)
    .eq("status", "pending");

  try {
    const { data: blob, error: dlErr } = await admin.storage
      .from(BUCKET)
      .download(doc.storage_path as string);
    if (dlErr || !blob) throw new Error(dlErr?.message ?? "File not found in storage.");
    const buffer = Buffer.from(await blob.arrayBuffer());
    const result = await extractFromDocument({
      buffer,
      mimeType: (doc.mime_type as string) ?? "application/octet-stream",
      fileName: (doc.file_name as string) ?? "document",
    });
    const rows = [
      ...result.faqs.map((payload) => ({
        tenant_id: tenantId,
        business_id: doc.business_id,
        document_id: docId,
        kind: "faq" as const,
        payload,
      })),
      ...result.services.map((payload) => ({
        tenant_id: tenantId,
        business_id: doc.business_id,
        document_id: docId,
        kind: "service" as const,
        payload,
      })),
    ];
    if (rows.length > 0) await admin.from("knowledge_suggestions").insert(rows);
    await admin
      .from("knowledge_documents")
      .update({ status: "extracted", error: null })
      .eq("id", docId);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Extraction failed.";
    await admin
      .from("knowledge_documents")
      .update({ status: "failed", error: message.slice(0, 500) })
      .eq("id", docId);
  }

  revalidatePath("/dashboard/knowledge/upload");
}

/**
 * Approve a suggestion → insert a real STRUCTURED row into faqs /
 * service_pricing, then mark it approved. Service rows still require the
 * owner to re-approve pricing in /dashboard/pricing before quoting.
 */
type SuggestionRow = {
  id: string;
  kind: string;
  payload: Record<string, unknown>;
  business_id: string;
  status: string;
};

/** Insert the real structured row (faqs / service_pricing) for one approved
 *  suggestion. Returns false if the payload was unusable. */
async function applySuggestion(
  supabase: SupabaseClient,
  tenantId: string,
  sug: SuggestionRow
): Promise<boolean> {
  if (sug.kind === "faq") {
    const p = sug.payload as { question?: string; answer?: string };
    const question = String(p.question ?? "").trim().slice(0, 300);
    const answer = String(p.answer ?? "").trim().slice(0, 2000);
    if (!question || !answer) return false;
    await supabase.from("faqs").insert({
      tenant_id: tenantId,
      business_id: sug.business_id,
      question,
      answer,
    });
    return true;
  }
  if (sug.kind === "service") {
    const p = sug.payload as ServiceSuggestion;
    const name = String(p.name ?? "").trim().slice(0, 160);
    if (!name) return false;
    const isTow = p.pricing_type === "tow";
    await supabase.from("service_pricing").insert({
      tenant_id: tenantId,
      business_id: sug.business_id,
      name,
      pricing_type: isTow ? "tow" : "flat",
      service_fee: typeof p.service_fee === "number" ? p.service_fee : 0,
      hook_fee: isTow ? p.hook_fee : null,
      per_mile_rate: isTow ? p.per_mile_rate : null,
      free_miles: isTow ? p.free_miles : null,
      variable_part: p.variable_part ?? null,
    });
    return true;
  }
  return false;
}

export async function approveSuggestion(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const { data: sug } = await supabase
    .from("knowledge_suggestions")
    .select("id, kind, payload, business_id, status")
    .eq("id", id)
    .maybeSingle();
  if (!sug || sug.status !== "pending") return;

  const applied = await applySuggestion(supabase, tenantId, sug as SuggestionRow);
  if (!applied) return;

  await supabase
    .from("knowledge_suggestions")
    .update({ status: "approved", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", tenantId);

  revalidatePath("/dashboard/knowledge/upload");
}

/** Approve every pending suggestion for a document in one click. */
export async function approveAllForDocument(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const supabase = await createClient();
  const docId = String(formData.get("documentId") ?? "");
  if (!docId) return;

  const { data: rows } = await supabase
    .from("knowledge_suggestions")
    .select("id, kind, payload, business_id, status")
    .eq("document_id", docId)
    .eq("tenant_id", tenantId)
    .eq("status", "pending");

  const pending = (rows ?? []) as SuggestionRow[];
  const approvedIds: string[] = [];
  for (const sug of pending) {
    const applied = await applySuggestion(supabase, tenantId, sug);
    if (applied) approvedIds.push(sug.id);
  }

  if (approvedIds.length > 0) {
    await supabase
      .from("knowledge_suggestions")
      .update({ status: "approved", reviewed_at: new Date().toISOString() })
      .in("id", approvedIds)
      .eq("tenant_id", tenantId);
  }

  revalidatePath("/dashboard/knowledge/upload");
}

/** Reject every pending suggestion for a document in one click. */
export async function rejectAllForDocument(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const docId = String(formData.get("documentId") ?? "");
  if (!docId) return;

  await supabase
    .from("knowledge_suggestions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("document_id", docId)
    .eq("tenant_id", active.organization_id)
    .eq("status", "pending");

  revalidatePath("/dashboard/knowledge/upload");
}

/** Reject a suggestion (no row created). */
export async function rejectSuggestion(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await supabase
    .from("knowledge_suggestions")
    .update({ status: "rejected", reviewed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("tenant_id", active.organization_id);
  revalidatePath("/dashboard/knowledge/upload");
}

/** Delete a document and its suggestions + stored file. */
export async function deleteDocument(formData: FormData): Promise<void> {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const docId = String(formData.get("documentId") ?? "");
  if (!docId) return;

  const { data: doc } = await supabase
    .from("knowledge_documents")
    .select("id, storage_path")
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return;

  if (doc.storage_path) {
    const admin = createAdminClient();
    await admin.storage.from(BUCKET).remove([doc.storage_path as string]);
  }
  // Suggestions cascade via FK on delete.
  await supabase
    .from("knowledge_documents")
    .delete()
    .eq("id", docId)
    .eq("tenant_id", active.organization_id);
  revalidatePath("/dashboard/knowledge/upload");
}
