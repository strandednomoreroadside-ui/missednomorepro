// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/observability/scrub";

Sentry.init({
  dsn: "https://e3a3d94f0dae19b75ce49865b0b07555@o4511583013044224.ingest.us.sentry.io/4511583017959424",

  // Replay masks all text + blocks media so customer data on CRM pages
  // (names, phones, transcripts) never leaves the browser.
  integrations: [Sentry.replayIntegration({ maskAllText: true, blockAllMedia: true })],

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
  enableLogs: true,

  // Don't record normal sessions on a PII-heavy CRM — only on errors.
  replaysSessionSampleRate: 0,
  replaysOnErrorSampleRate: 1.0,

  // §9/§14: never send PII; scrub any that slips into an event.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
