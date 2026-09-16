import { describe, expect, it } from "vitest";

import { NICHE_CONTENT, VARIANT_CONTENT } from "@/components/landing/industries/content";
import { generatedNiches, nicheHref } from "@/components/landing/industries/links";
import { NICHE_CATALOG } from "@/lib/setup/niches";

// The /industries pages make product claims for every niche, so their content
// must line up with the catalog's call-script flags: quotes and urgent
// dispatch only exist for businesses that go out to a service address.

const bySlug = new Map(NICHE_CATALOG.map((n) => [n.slug, n]));
const allStrings = (value: unknown): string[] =>
  typeof value === "string"
    ? [value]
    : Array.isArray(value)
      ? value.flatMap(allStrings)
      : value && typeof value === "object"
        ? Object.values(value).flatMap(allStrings)
        : [];

describe("industry page content", () => {
  it("only exists for niches that get their own generated page", () => {
    for (const slug of Object.keys(NICHE_CONTENT)) {
      const niche = bySlug.get(slug);
      expect(niche, slug).toBeDefined();
      expect(niche!.page || niche!.partOf || niche!.setupOnly, slug).toBeFalsy();
    }
  });

  it("only offers quotes and urgent dispatch for on-site niches", () => {
    for (const [slug, content] of Object.entries(NICHE_CONTENT)) {
      if (bySlug.get(slug)!.mode === "office") {
        expect(content.quotes, `${slug} quotes`).toBeUndefined();
        expect(content.urgent, `${slug} urgent`).toBeUndefined();
      }
      expect(content.calls.length, slug).toBeGreaterThanOrEqual(4);
      expect(content.faqs.length, slug).toBeGreaterThanOrEqual(2);
    }
  });

  it("variant sections belong to folded niches", () => {
    for (const slug of Object.keys(VARIANT_CONTENT)) {
      expect(bySlug.get(slug)?.partOf, slug).toBeTruthy();
    }
  });

  it("never markets setup-only niches", () => {
    for (const n of NICHE_CATALOG.filter((n) => n.setupOnly)) {
      expect(nicheHref(n), n.slug).toBeNull();
      expect(NICHE_CONTENT[n.slug], n.slug).toBeUndefined();
      expect(VARIANT_CONTENT[n.slug], n.slug).toBeUndefined();
    }
  });

  it("links every generated page and uses plain punctuation", () => {
    for (const n of generatedNiches()) {
      expect(nicheHref(n)).toBe(`/industries/${n.category}/${n.slug}`);
    }
    const text = [...allStrings(NICHE_CONTENT), ...allStrings(VARIANT_CONTENT)].join("\n");
    expect(text).not.toMatch(/[–—‘’“”]/);
  });
});
