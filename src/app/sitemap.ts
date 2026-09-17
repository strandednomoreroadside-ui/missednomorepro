import type { MetadataRoute } from "next";

import { generatedNiches } from "@/components/landing/industries/links";
import { env } from "@/lib/env";
import { CATEGORIES } from "@/lib/setup/niches";

/** Sitemap of the public pages (marketing + entry points + legal). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${base}/ai-phone-assistant`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${base}/ai-phone-service`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${base}/ai-receptionist-pricing`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.85,
    },
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
    { url: `${base}/ai-receptionist-for-hvac`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-plumbers`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-electricians`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-roofers`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-garage-door-repair`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-locksmiths`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-salons`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-answering-service`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/vs/virtual-receptionist`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/changelog`, lastModified: now, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/sms-terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/industries`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...CATEGORIES.map((c) => ({
      url: `${base}/industries/${c.id}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...generatedNiches().map((n) => ({
      url: `${base}/industries/${n.category}/${n.slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
