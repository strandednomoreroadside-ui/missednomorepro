import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

const PRIVATE_PATHS = [
  "/dashboard",
  "/admin",
  "/api",
  "/onboarding",
  "/invite",
  "/reset-password",
  "/forgot-password",
  "/auth",
  "/monitoring",
];

// AI search and assistant crawlers, named explicitly so the welcome is
// unambiguous (and survives a CDN or host adding its own AI-bot defaults).
// A crawler obeys only its most specific group, so each repeats the private
// paths.
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "Claude-User",
  "anthropic-ai",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot",
  "Applebot-Extended",
  "Bingbot",
  "DuckAssistBot",
  "meta-externalagent",
  "Amazonbot",
  "MistralAI-User",
  "CCBot",
];

/** robots.txt - index the marketing + legal pages; keep the app, API, and
 *  auth flows out of search results. */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: PRIVATE_PATHS },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
