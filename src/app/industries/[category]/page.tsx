import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { CATEGORY_INTROS } from "@/components/landing/industries/content";
import {
  categoryById,
  marketedNiches,
  nicheHref,
  titleCase,
} from "@/components/landing/industries/links";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink } from "@/components/landing/primitives";
import { CATEGORIES } from "@/lib/setup/niches";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

type Params = Promise<{ category: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.id }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: id } = await params;
  const category = categoryById(id);
  if (!category) return {};
  const h1 = `AI Receptionist for ${category.name}`;
  const branded = `${h1} | Missed No More Pro`;
  const names = marketedNiches(category.id)
    .filter((n) => !n.partOf)
    .map((n) => n.name.toLowerCase());
  const tail = ". Answers every call 24/7, books appointments, and texts your team.";
  let count = Math.min(names.length, 4);
  let description = "";
  while (count > 0) {
    description = `AI receptionist for ${names.slice(0, count).join(", ")}, and more${tail}`;
    if (description.length <= 160) break;
    count--;
  }
  return pageMetadata({
    title: branded.length <= 60 ? branded : h1,
    description,
    path: `/industries/${category.id}`,
  });
}

export default async function IndustryCategoryPage({ params }: { params: Params }) {
  const { category: id } = await params;
  const category = categoryById(id);
  if (!category) notFound();
  const path = `/industries/${category.id}`;
  const h1 = `AI Receptionist for ${category.name}`;
  const parents = marketedNiches(category.id).filter((n) => !n.partOf);
  const linked = parents
    .map((n) => ({ name: titleCase(n.name), href: nicheHref(n) }))
    .filter((n): n is { name: string; href: string } => Boolean(n.href));

  return (
    <MarketingShell>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${SITE_URL}${path}#webpage`,
              url: `${SITE_URL}${path}`,
              name: h1,
              description: CATEGORY_INTROS[category.id],
              isPartOf: { "@id": `${SITE_URL}/#website` },
              mainEntity: {
                "@type": "ItemList",
                itemListElement: linked.map((n, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: `AI Receptionist for ${n.name}`,
                  url: `${SITE_URL}${n.href}`,
                })),
              },
            },
            breadcrumbJsonLd([
              { name: "Industries", path: "/industries" },
              { name: category.name, path },
            ]),
          ],
        }}
      />

      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <nav aria-label="Breadcrumb" className="font-mono text-xs uppercase tracking-[0.2em] text-steel">
          <Link href="/industries" className="text-cyan hover:text-foreground">
            Industries
          </Link>
        </nav>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{h1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          {CATEGORY_INTROS[category.id]}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/pricing" variant="outline" large>
            See pricing
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          Businesses in {category.name}
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {parents.map((n) => {
            const href = nicheHref(n);
            const variants = marketedNiches(category.id).filter((v) => v.partOf === n.slug);
            return (
              <li key={n.slug} className="rounded-xl border border-border bg-card/55 p-5">
                {href ? (
                  <Link href={href} className="font-display text-lg font-semibold text-foreground hover:text-primary">
                    {titleCase(n.name)}
                  </Link>
                ) : (
                  <span className="font-display text-lg font-semibold text-foreground">{titleCase(n.name)}</span>
                )}
                {variants.length > 0 && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Also:{" "}
                    {variants.map((v, i) => (
                      <span key={v.slug}>
                        {i > 0 && ", "}
                        {nicheHref(v) ? (
                          <Link href={nicheHref(v)!} className="underline underline-offset-4 hover:text-primary">
                            {v.name}
                          </Link>
                        ) : (
                          v.name
                        )}
                      </span>
                    ))}
                  </p>
                )}
                {!href && <p className="mt-2 text-sm text-muted-foreground">Fully supported in setup.</p>}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">Don&apos;t see your business?</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Setup covers more than 190 local service trades across 12 categories, plus an option
            for businesses that aren&apos;t listed.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <ButtonLink href="/industries" variant="outline" large>
              Browse all industries
            </ButtonLink>
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
