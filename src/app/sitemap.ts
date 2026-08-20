import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

/** Sitemap of the public pages (marketing + entry points + legal). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vs/hexnut`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${base}/vs/answering-service`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/vs/rosie`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/vs/sameday`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${base}/ai-receptionist-for-towing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/login`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/sms-terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
