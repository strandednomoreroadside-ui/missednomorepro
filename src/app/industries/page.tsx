import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { marketedNiches, nicheHref, titleCase } from "@/components/landing/industries/links";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink } from "@/components/landing/primitives";
import { CATEGORIES } from "@/lib/setup/niches";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const TITLE = "AI Receptionist by Industry | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for 190+ local service trades in 12 industries, from HVAC, towing, and restoration to salons and pet care.";
const H1 = "AI Receptionist for Every Local Service Business";

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/industries" });

export default function IndustriesPage() {
  return (
    <MarketingShell>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "CollectionPage",
              "@id": `${SITE_URL}/industries#webpage`,
              url: `${SITE_URL}/industries`,
              name: H1,
              description: DESCRIPTION,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              mainEntity: {
                "@type": "ItemList",
                itemListElement: CATEGORIES.map((c, i) => ({
                  "@type": "ListItem",
                  position: i + 1,
                  name: `AI Receptionist for ${c.name}`,
                  url: `${SITE_URL}/industries/${c.id}`,
                })),
              },
            },
            breadcrumbJsonLd([{ name: "Industries", path: "/industries" }]),
          ],
        }}
      />

      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">Industries</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{H1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
          Missed No More Pro answers calls for businesses that go out to the customer, like
          plumbers, tow trucks, and cleaners, and for businesses customers visit, like salons and
          repair shops. Pick your trade in setup and the AI asks callers the right questions for
          it: a service address and a quote, a vehicle&apos;s year, make, and model, or just the
          best time to come in.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href="/ai-answering-service" variant="outline" large>
            How it works
          </ButtonLink>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-6 px-6 pb-20">
        {CATEGORIES.map((category) => (
          <section key={category.id} className="rounded-2xl border border-border bg-card/40 p-6">
            <h2 className="font-display text-2xl font-semibold tracking-tight">
              <Link href={`/industries/${category.id}`} className="hover:text-primary">
                {category.name}
              </Link>
            </h2>
            <ul className="mt-4 flex flex-wrap gap-2">
              {marketedNiches(category.id)
                .filter((n) => !n.partOf)
                .map((n) => {
                  const href = nicheHref(n);
                  const label = titleCase(n.name);
                  return (
                    <li key={n.slug}>
                      {href ? (
                        <Link
                          href={href}
                          className="inline-flex rounded-full border border-border bg-background/40 px-3.5 py-1.5 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                        >
                          {label}
                        </Link>
                      ) : (
                        <span className="inline-flex rounded-full border border-border/50 px-3.5 py-1.5 text-sm text-muted-foreground">
                          {label}
                        </span>
                      )}
                    </li>
                  );
                })}
            </ul>
            <Link
              href={`/industries/${category.id}`}
              className="mt-4 inline-flex text-sm text-muted-foreground underline underline-offset-4 hover:text-primary"
            >
              All {category.name} businesses
            </Link>
          </section>
        ))}
      </div>
    </MarketingShell>
  );
}
