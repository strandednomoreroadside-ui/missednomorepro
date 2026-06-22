// This file configures the initialization of Sentry for edge features (middleware, edge routes, and so on).
// The config you add here will be used whenever one of the edge features is loaded.
// Note that this config is unrelated to the Vercel Edge Runtime and is also required when running locally.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

import { scrubEvent } from "@/lib/observability/scrub";

Sentry.init({
  dsn: "https://e3a3d94f0dae19b75ce49865b0b07555@o4511583013044224.ingest.us.sentry.io/4511583017959424",

  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,

  enableLogs: true,

  // §9/§14: never send PII.
  sendDefaultPii: false,
  beforeSend: scrubEvent,
});
