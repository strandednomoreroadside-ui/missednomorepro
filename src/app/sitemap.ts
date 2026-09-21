import type { MetadataRoute } from "next";

import { generatedNiches } from "@/components/landing/industries/links";
import { env } from "@/lib/env";
import { CATEGORIES } from "@/lib/setup/niches";

/** Sitemap of the public pages (marketing + entry points + legal). */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, changeFrequency: "weekly", priority: 0.9 },
    {
      url: `${base}/ai-phone-assistant`,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${base}/ai-phone-service`,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    {
      url: `${base}/ai-receptionist-pricing`,
      changeFrequency: "weekly",
      priority: 0.85,
    },
    { url: `${base}/about`, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/vs/hexnut`, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${base}/vs/answering-service`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/vs/rosie`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/vs/sameday`, changeFrequency: "monthly", priority: 0.7 },
    {
      url: `${base}/ai-receptionist-for-towing`,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    { url: `${base}/ai-receptionist-for-hvac`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-plumbers`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-electricians`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-roofers`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-garage-door-repair`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-locksmiths`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-receptionist-for-salons`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/ai-answering-service`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/vs/virtual-receptionist`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/changelog`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${base}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/sms-terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/industries`, changeFrequency: "weekly", priority: 0.8 },
    ...CATEGORIES.map((c) => ({
      url: `${base}/industries/${c.id}`,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...generatedNiches().map((n) => ({
      url: `${base}/industries/${n.category}/${n.slug}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];
}
