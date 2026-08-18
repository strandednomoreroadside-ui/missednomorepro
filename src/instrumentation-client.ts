import { analytics } from "@heycatch/sdk";

// HeyCatch product analytics — module scope, static import, runs on every
// page before hydration. Do not wrap in typeof window / once-guards: init
// is idempotent and a no-op during SSR, and a lazy/dynamic import would
// delay the reserved short-link forwarding past the app's own router.
analytics.init({
  projectKey: "hck_pk_NnsaReKMCmiHRZhKwDQ30pG5o2GyFc7w",
  install: {
    framework: "nextjs",
    frameworkVersion: "16",
    agent: "claude-code",
  },
});

// Client tracing is deliberately disabled. Server, API, edge, and webhook
// failures remain covered without adding the monitoring SDK to every page.
export function onRouterTransitionStart(
  _href: string,
  _navigationType: "push" | "replace" | "traverse",
) {}
