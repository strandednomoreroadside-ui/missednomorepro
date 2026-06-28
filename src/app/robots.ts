import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/** robots.txt — index the marketing + legal pages; keep the app, API, and
 *  auth flows out of search results. */
export default function robots(): MetadataRoute.Robots {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/dashboard",
          "/admin",
          "/api",
          "/onboarding",
          "/invite",
          "/reset-password",
          "/forgot-password",
          "/auth",
          "/monitoring",
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
