import { createHash } from "node:crypto";

import { z } from "zod";

export const serviceRequestPayloadSchema = z.object({
  submission_id: z.string().trim().min(8).max(160),
  submitted_at: z.string().datetime().optional(),
  source_url: z.string().url().max(500).optional(),
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().min(7).max(40),
  email: z.string().trim().email().max(320).optional().or(z.literal("")),
  service: z.string().trim().min(1).max(160),
  location: z.string().trim().min(1).max(500),
  vehicle: z.string().trim().max(300).optional().or(z.literal("")),
  details: z.string().trim().max(2000).optional().or(z.literal("")),
  sms_consent: z.boolean(),
});

export type ServiceRequestPayload = z.infer<typeof serviceRequestPayloadSchema>;

export function hashFormToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

export function formatServiceRequestMessage(payload: ServiceRequestPayload): string {
  const lines = [
    "Website service request",
    `Name: ${payload.name}`,
    `Phone: ${payload.phone}`,
    payload.email ? `Email: ${payload.email}` : null,
    `Service: ${payload.service}`,
    `Location: ${payload.location}`,
    payload.vehicle ? `Vehicle: ${payload.vehicle}` : null,
    payload.details ? `Details: ${payload.details}` : null,
  ].filter(Boolean);

  return lines.join("\n").slice(0, 5000);
}

export function buildStaffAlert(payload: ServiceRequestPayload): string {
  const vehicle = payload.vehicle ? ` | ${payload.vehicle}` : "";
  const details = payload.details ? ` | ${payload.details}` : "";
  return `New website roadside request: ${payload.name} ${payload.phone} | ${payload.service} | ${payload.location}${vehicle}${details}`.slice(
    0,
    1200
  );
}

export function buildCustomerConfirmation(): string {
  return "We received your roadside service request. Dispatch will contact you shortly. Reply here with updates or STOP to opt out.";
}
