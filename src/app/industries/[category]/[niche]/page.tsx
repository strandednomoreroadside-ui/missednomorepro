import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { NICHE_CONTENT } from "@/components/landing/industries/content";
import { categoryById, generatedNiches, inSentence, nicheBySlug } from "@/components/landing/industries/links";
import { NichePage, nicheH1 } from "@/components/landing/industries/niche-page";
import { pageMetadata } from "@/lib/seo";

type Params = Promise<{ category: string; niche: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return generatedNiches().map((n) => ({ category: n.category, niche: n.slug }));
}

function resolve(category: string, slug: string) {
  const niche = nicheBySlug(slug);
  const cat = categoryById(category);
  const content = NICHE_CONTENT[slug];
  if (!niche || !cat || !content || niche.category !== cat.id) return null;
  return { niche, category: cat, content };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category, niche: slug } = await params;
  const found = resolve(category, slug);
  if (!found) return {};
  const h1 = nicheH1(found.niche);
  const branded = `${h1} | Missed No More Pro`;
  const lead = `AI receptionist for ${inSentence(found.niche.name)}. `;
  const full = lead + found.content.hook;
  const cut = full.slice(0, 157);
  const description =
    full.length <= 160
      ? full
      : found.content.hook.length <= 160
        ? found.content.hook
        : `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,.;:]$/, "")}...`;
  return pageMetadata({
    title: branded.length <= 60 ? branded : h1,
    description,
    path: `/industries/${category}/${slug}`,
  });
}

export default async function IndustryNichePage({ params }: { params: Params }) {
  const { category, niche: slug } = await params;
  const found = resolve(category, slug);
  if (!found) notFound();
  return <NichePage niche={found.niche} category={found.category} content={found.content} />;
}
