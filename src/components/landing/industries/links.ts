import { CATEGORIES, NICHE_CATALOG, type Category, type CategoryId, type Niche } from "@/lib/setup/niches";

import { NICHE_CONTENT, VARIANT_CONTENT } from "./content";

const SMALL_WORDS = new Set(["a", "an", "and", "or", "for", "of", "the", "to", "in", "&"]);

/** "bed bug exterminators" -> "Bed Bug Exterminators" (keeps HVAC, RV, DJs). */
export function titleCase(s: string): string {
  return s
    .split(" ")
    .map((w, i) =>
      i > 0 && SMALL_WORDS.has(w)
        ? w
        : w
            .split("-")
            .map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p))
            .join("-")
    )
    .join(" ");
}

/** For mid-sentence use: "Pest control companies" -> "pest control companies", "RV storage" unchanged. */
export function inSentence(name: string): string {
  return /^[A-Z][a-z]/.test(name) ? name[0].toLowerCase() + name.slice(1) : name;
}

export function categoryById(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function nicheBySlug(slug: string): Niche | undefined {
  return NICHE_CATALOG.find((n) => n.slug === slug);
}

/** Niches with a generated /industries page (content written, not folded or hand-built). */
export function generatedNiches(): Niche[] {
  return NICHE_CATALOG.filter((n) => !n.page && !n.partOf && !n.setupOnly && NICHE_CONTENT[n.slug]);
}

/** Every niche that may appear in marketing for a category, in catalog order. */
export function marketedNiches(category: CategoryId): Niche[] {
  return NICHE_CATALOG.filter((n) => n.category === category && !n.setupOnly);
}

/** Close variants folded into this niche's page that have section content. */
export function variantsOf(slug: string): Niche[] {
  return NICHE_CATALOG.filter((n) => n.partOf === slug && VARIANT_CONTENT[n.slug]);
}

/** Where a niche lives on the site, or null if its page isn't published yet. */
export function nicheHref(niche: Niche): string | null {
  if (niche.setupOnly) return null;
  if (niche.page) return niche.page;
  if (niche.partOf) {
    const parent = nicheBySlug(niche.partOf);
    const parentHref = parent ? nicheHref(parent) : null;
    return parentHref && VARIANT_CONTENT[niche.slug] ? `${parentHref}#${niche.slug}` : null;
  }
  return NICHE_CONTENT[niche.slug] ? `/industries/${niche.category}/${niche.slug}` : null;
}
