import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

/**
 * Baseline security response headers (defense-in-depth, alongside the
 * Supabase Pro hardening). Deliberately conservative — no Content-Security-
 * Policy here, since a strict CSP would break Next.js inline bootstrap +
 * Sentry without careful nonce work; that's a separate, tested change.
 *   - HSTS: force HTTPS for 2y (prod is already HTTPS end-to-end).
 *   - nosniff: stop MIME-type sniffing.
 *   - SAMEORIGIN: block clickjacking (we never frame ourselves cross-site;
 *     the chat widget injects a div on the customer's page, not an iframe).
 *   - Referrer-Policy: don't leak full URLs (which can carry tokens) off-site.
 *   - Permissions-Policy: deny powerful browser features we never use.
 */
const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      { source: "/:path*", headers: SECURITY_HEADERS },
    ];
  },
  async redirects() {
    return [
      // HeyCatch short-link channel attribution — single lowercase-letter/digit
      // paths are reserved. No real route uses one (verified against src/app).
      {
        source: "/:l([a-z0-9])",
        destination: "/?utm_source=heycatch&utm_campaign=:l",
        permanent: false,
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://www.npmjs.com/package/@sentry/webpack-plugin#options

  // Source-map upload (readable production stack traces) activates when the
  // build env has SENTRY_AUTH_TOKEN — the plugin reads it automatically. With
  // no token the build still succeeds and just skips the upload, so dev/CI
  // without the secret is fine. Set SENTRY_AUTH_TOKEN in Vercel to turn it on.
  org: "stranded-no-more-roadside-assi",

  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

  // Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
  // This can increase your server load as well as your hosting bill.
  // Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
  // side errors will fail.
  tunnelRoute: "/monitoring",

  webpack: {
    // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
    // See the following for more information:
    // https://docs.sentry.io/product/crons/
    // https://vercel.com/docs/cron-jobs
    automaticVercelMonitors: true,

    // Tree-shaking options for reducing bundle size
    treeshake: {
      // Automatically tree-shake Sentry logger statements to reduce bundle size
      removeDebugLogging: true,
    },
  }
});
