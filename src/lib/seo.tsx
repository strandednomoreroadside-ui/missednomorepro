import type { Metadata } from "next";

import { env } from "@/lib/env";

export const SITE_NAME = "Missed No More Pro";
export const SITE_URL = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");

// Root-level app/opengraph-image.tsx. Next only auto-attaches it to pages that
// don't declare their own openGraph, so every page that does must pass it
// explicitly or its link previews go out with no image.
const OG_IMAGE = {
  url: "/opengraph-image",
  width: 1200,
  height: 630,
  alt: "Missed No More Pro - AI receptionist for small service businesses",
};

/** Full per-page metadata: title, description, canonical, and complete
 *  OpenGraph/Twitter tags. `title` is used as-is (no brand template), so
 *  include the brand when the page needs it. */
export function pageMetadata({
  title,
  description,
  path,
  keywords,
  noindex,
}: {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  noindex?: boolean;
}): Metadata {
  return {
    title: { absolute: title },
    description,
    ...(keywords ? { keywords } : {}),
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      locale: "en_US",
      url: path,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE],
    },
    ...(noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/** BreadcrumbList for a page one level below the homepage (or deeper). */
export function breadcrumbJsonLd(trail: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList",
    itemListElement: [{ name: "Home", path: "/" }, ...trail].map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === "/" ? "" : item.path}`,
    })),
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify({ "@context": "https://schema.org", ...data }).replace(/</g, "\\u003c"),
      }}
    />
  );
}
