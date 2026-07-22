import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { encryptText } from "@/lib/crypto";
import { emitWebhookEvent } from "@/lib/webhooks";
import { normalizeUsPhone } from "@/lib/phone";
import { redactPii } from "@/lib/redact";
import { sendCustomerSms, sendStaffSms } from "@/lib/sms/outbound";
import { touchConversation, upsertConversation } from "@/lib/chat/conversation";
import {
  buildCustomerConfirmation,
  buildStaffAlert,
  formatServiceRequestMessage,
  hashFormToken,
  serviceRequestPayloadSchema,
  type ServiceRequestPayload,
} from "./service-request-shared";

type IntegrationRow = {
  id: string;
  tenant_id: string;
  business_id: string;
};

type EventRow = {
  id: string;
  tenant_id: string;
  business_id: string;
  integration_id: string | null;
  submission_id: string;
  status: "processing" | "completed" | "failed";
  contact_id: string | null;
  lead_id: string | null;
  note_id: string | null;
  conversation_id: string | null;
  conversation_message_id: string | null;
  customer_sms_message_id: string | null;
  staff_alert_count: number;
  customer_confirmation_status: "sent" | "blocked" | "failed" | "skipped" | null;
};

export type ServiceRequestIngestResult = {
  ok: boolean;
  duplicate?: boolean;
  eventId?: string;
  contactId?: string;
  leadId?: string;
  reason?: "invalid_token" | "invalid_payload" | "invalid_phone" | "processing_failed";
};

async function resolveIntegration(
  admin: SupabaseClient,
  token: string
): Promise<IntegrationRow | null> {
  const keyHash = hashFormToken(token);
  const { data } = await admin
    .from("form_integrations")
    .select("id, tenant_id, business_id")
    .eq("key_hash", keyHash)
    .eq("active", true)
    .maybeSingle();
  return (data as IntegrationRow | null) ?? null;
}

async function claimEvent(
  admin: SupabaseClient,
  integration: IntegrationRow,
  submissionId: string
): Promise<{ event: EventRow | null; duplicate: boolean; retryFailed: boolean }> {
  const cols =
    "id, tenant_id, business_id, integration_id, submission_id, status, contact_id, lead_id, note_id, conversation_id, conversation_message_id, customer_sms_message_id, staff_alert_count, customer_confirmation_status";

  const { data, error } = await admin
    .from("form_ingestion_events")
    .insert({
      tenant_id: integration.tenant_id,
      business_id: integration.business_id,
      integration_id: integration.id,
      submission_id: submissionId,
      status: "processing",
    })
    .select(cols)
    .single();

  if (!error) return { event: data as EventRow, duplicate: false, retryFailed: false };
  if (error.code !== "23505") throw error;

  const { data: existing } = await admin
    .from("form_ingestion_events")
    .select(cols)
    .eq("tenant_id", integration.tenant_id)
    .eq("submission_id", submissionId)
    .maybeSingle();
  const event = existing as EventRow | null;
  if (!event) return { event: null, duplicate: true, retryFailed: false };
  if (event.status !== "failed") return { event, duplicate: true, retryFailed: false };

  const { data: retry } = await admin
    .from("form_ingestion_events")
    .update({
      status: "processing",
      error_category: null,
      error_message: null,
      completed_at: null,
    })
    .eq("id", event.id)
    .eq("tenant_id", integration.tenant_id)
    .select(cols)
    .maybeSingle();
  return { event: (retry as EventRow | null) ?? event, duplicate: false, retryFailed: true };
}

async function updateEvent(
  admin: SupabaseClient,
  event: EventRow,
  patch: Partial<EventRow> & Record<string, unknown>
): Promise<EventRow> {
  const cols =
    "id, tenant_id, business_id, integration_id, submission_id, status, contact_id, lead_id, note_id, conversation_id, conversation_message_id, customer_sms_message_id, staff_alert_count, customer_confirmation_status";
  const { data } = await admin
    .from("form_ingestion_events")
    .update(patch)
    .eq("id", event.id)
    .eq("tenant_id", event.tenant_id)
    .select(cols)
    .maybeSingle();
  return (data as EventRow | null) ?? { ...event, ...patch };
}

async function ensureContact(
  admin: SupabaseClient,
  tenantId: string,
  payload: ServiceRequestPayload,
  phone: string
): Promise<string> {
  const { data: existing } = await admin
    .from("contacts")
    .select("id, email, address, consent_sms")
    .eq("tenant_id", tenantId)
    .eq("phone", phone)
    .maybeSingle();

  const consentPatch = payload.sms_consent
    ? {
        consent_sms: true,
        consent_source: "website_contact_form",
        consent_timestamp: new Date().toISOString(),
      }
    : {};

  if (existing?.id) {
    const patch: Record<string, unknown> = { ...consentPatch };
    if (payload.email && !existing.email) patch.email = payload.email;
    if (payload.location && !existing.address) patch.address = payload.location;
    if (Object.keys(patch).length > 0) {
      await admin.from("contacts").update(patch).eq("id", existing.id).eq("tenant_id", tenantId);
    }
    return existing.id as string;
  }

  const { data: created, error } = await admin
    .from("contacts")
    .insert({
      tenant_id: tenantId,
      name: payload.name,
      phone,
      email: payload.email || null,
      address: payload.location,
      ...consentPatch,
    })
    .select("id")
    .single();
  if (error) throw error;
  return created.id as string;
}

async function createLead(
  admin: SupabaseClient,
  event: EventRow,
  contactId: string,
  payload: ServiceRequestPayload
): Promise<string> {
  const { data, error } = await admin
    .from("leads")
    .insert({
      tenant_id: event.tenant_id,
      contact_id: contactId,
      source: "web",
      status: "new_lead",
      service_needed: payload.service,
      urgency: "high",
    })
    .select("id")
    .single();
  if (error) throw error;
  const leadId = data.id as string;
  await emitWebhookEvent({
    tenantId: event.tenant_id,
    event: "lead.created",
    data: {
      lead_id: leadId,
      contact_id: contactId,
      service_needed: payload.service,
      source: "web",
      stage: "new_lead",
    },
  });
  return leadId;
}

async function createNote(
  admin: SupabaseClient,
  event: EventRow,
  contactId: string,
  payload: ServiceRequestPayload
): Promise<string> {
  const note = formatServiceRequestMessage(payload);
  const { data, error } = await admin
    .from("customer_notes")
    .insert({
      tenant_id: event.tenant_id,
      contact_id: contactId,
      note,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

async function createInboxMessage(
  admin: SupabaseClient,
  event: EventRow,
  contactId: string,
  phone: string,
  payload: ServiceRequestPayload
): Promise<{ conversationId: string; messageId: string }> {
  const conversation = await upsertConversation(admin, {
    tenantId: event.tenant_id,
    businessId: event.business_id,
    channel: "sms",
    customerPhone: phone,
    customerName: payload.name,
    contactId,
    subject: "Website service request",
  });
  if (!conversation) throw new Error("no_conversation");

  const body = formatServiceRequestMessage(payload);
  const { data, error } = await admin
    .from("conversation_messages")
    .insert({
      tenant_id: event.tenant_id,
      conversation_id: conversation.id,
      role: "customer",
      body_redacted: redactPii(body).redacted,
      body_encrypted: encryptText(body),
      external_id: event.submission_id,
    })
    .select("id")
    .single();
  if (error) throw error;

  await touchConversation(admin, {
    tenantId: event.tenant_id,
    conversationId: conversation.id,
    preview: body,
    incUnread: 1,
    contactId,
  });

  return { conversationId: conversation.id, messageId: data.id as string };
}

async function alertStaff(
  admin: SupabaseClient,
  event: EventRow,
  payload: ServiceRequestPayload
): Promise<number> {
  const { data } = await admin
    .from("staff_contacts")
    .select("phone")
    .eq("tenant_id", event.tenant_id)
    .eq("business_id", event.business_id)
    .eq("notify_on_lead", true);
  const staff = (data ?? []) as { phone: string }[];
  const body = buildStaffAlert(payload);
  let attempts = 0;
  for (const recipient of staff) {
    attempts += 1;
    await sendStaffSms(admin, {
      tenantId: event.tenant_id,
      businessId: event.business_id,
      toPhone: recipient.phone,
      body,
    });
  }
  return attempts;
}

export async function ingestServiceRequestForm(
  admin: SupabaseClient,
  token: string,
  rawPayload: unknown
): Promise<ServiceRequestIngestResult> {
  const parsed = serviceRequestPayloadSchema.safeParse(rawPayload);
  if (!parsed.success) return { ok: false, reason: "invalid_payload" };

  const integration = await resolveIntegration(admin, token.trim());
  if (!integration) return { ok: false, reason: "invalid_token" };

  const payload = parsed.data;
  const phone = normalizeUsPhone(payload.phone);
  if (!phone) return { ok: false, reason: "invalid_phone" };

  let event: EventRow | null = null;
  try {
    const claimed = await claimEvent(admin, integration, payload.submission_id);
    event = claimed.event;
    if (!event) return { ok: true, duplicate: true };
    if (claimed.duplicate) {
      return {
        ok: true,
        duplicate: true,
        eventId: event.id,
        contactId: event.contact_id ?? undefined,
        leadId: event.lead_id ?? undefined,
      };
    }

    const contactId = event.contact_id ?? (await ensureContact(admin, event.tenant_id, payload, phone));
    if (!event.contact_id) event = await updateEvent(admin, event, { contact_id: contactId });

    const leadId = event.lead_id ?? (await createLead(admin, event, contactId, payload));
    if (!event.lead_id) event = await updateEvent(admin, event, { lead_id: leadId });

    const noteId = event.note_id ?? (await createNote(admin, event, contactId, payload));
    if (!event.note_id) event = await updateEvent(admin, event, { note_id: noteId });

    if (!event.conversation_message_id) {
      const inbox = await createInboxMessage(admin, event, contactId, phone, payload);
      event = await updateEvent(admin, event, {
        conversation_id: inbox.conversationId,
        conversation_message_id: inbox.messageId,
      });
    }

    if (event.staff_alert_count === 0) {
      const count = await alertStaff(admin, event, payload);
      event = await updateEvent(admin, event, { staff_alert_count: count });
    }

    if (!event.customer_confirmation_status) {
      const sent = await sendCustomerSms(admin, {
        tenantId: event.tenant_id,
        businessId: event.business_id,
        contactId,
        toPhone: phone,
        body: buildCustomerConfirmation(),
        kind: "confirmation",
        requireConsent: true,
      });
      const status = sent.sent ? "sent" : sent.blocked ? "blocked" : "failed";
      event = await updateEvent(admin, event, {
        customer_sms_message_id: sent.messageId ?? null,
        customer_confirmation_status: status,
      });
    }

    event = await updateEvent(admin, event, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });

    return {
      ok: true,
      eventId: event.id,
      contactId,
      leadId,
    };
  } catch (err) {
    if (event) {
      await updateEvent(admin, event, {
        status: "failed",
        error_category: "processing_failed",
        error_message: err instanceof Error ? err.message.slice(0, 500) : "unknown",
      });
    }
    console.error("[forms] service request ingestion failed:", err);
    return { ok: false, reason: "processing_failed", eventId: event?.id };
  }
}
