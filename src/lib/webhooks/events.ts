/**
 * Webhook event catalog (the Zapier escape hatch). These are the business
 * moments a customer can subscribe an endpoint to. Kept small + high-signal —
 * the events that drive "when X happens, do Y" automations in another tool.
 */

export const WEBHOOK_EVENTS = [
  "lead.created",
  "appointment.booked",
  "job.completed",
  "payment.received",
] as const;

export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export function isWebhookEvent(v: string): v is WebhookEvent {
  return (WEBHOOK_EVENTS as readonly string[]).includes(v);
}

export const EVENT_META: Record<WebhookEvent, { label: string; description: string }> = {
  "lead.created": {
    label: "New lead",
    description:
      "A new lead enters your pipeline — the AI captures one while quoting or booking, or you add one manually.",
  },
  "appointment.booked": {
    label: "Appointment booked",
    description: "The AI (or staff) books an appointment on the calendar.",
  },
  "job.completed": {
    label: "Job completed",
    description: "A job is marked completed.",
  },
  "payment.received": {
    label: "Payment received",
    description: "A customer payment (deposit / invoice / link) is paid.",
  },
};

/** Sent by the "Send test" button — not a subscribable business event. */
export const TEST_EVENT = "ping";
