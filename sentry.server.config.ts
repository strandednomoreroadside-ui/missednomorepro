// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/observability/scrub";

Sentry.init({
  dsn: "https://e3a3d94f0dae19b75ce49865b0b07555@o4511583013044224.ingest.us.sentry.io/4511583017959424",

  // Sample fewer traces in production to control cost (§15).
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  enableLogs: true,

  // §9/§14: never send IPs, cookies, request bodies, or other PII.
  sendDefaultPii: false,

  // Defense-in-depth: scrub phones/emails/cards from every outgoing event.
  beforeSend: scrubEvent,
});
