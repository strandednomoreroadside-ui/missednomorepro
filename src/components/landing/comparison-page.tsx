import { ArrowRight } from "lucide-react";

import { ComparisonTable, type ComparisonRow } from "./comparison-table";
import { Faq, type FaqItem } from "./faq";
import { MarketingShell } from "./marketing-shell";
import { ButtonLink } from "./primitives";
import { Reveal } from "./reveal";

export type ComparisonSection = { title: string; body: string };

/**
 * Shared template for /vs and category landing pages — hero, comparison
 * table, a few body sections, FAQ (with schema), final CTA. Each page
 * supplies its own real, sourced content; nothing here is generic filler.
 */
export function ComparisonPage({
  kicker,
  h1,
  subhead,
  comparisonCols,
  comparisonRows,
  comparisonNote,
  sections,
  faqItems,
  faqTitle,
}: {
  kicker: string;
  h1: string;
  subhead: string;
  comparisonCols: string[];
  comparisonRows: ComparisonRow[];
  comparisonNote?: string;
  sections: ComparisonSection[];
  faqItems: FaqItem[];
  faqTitle: string;
}) {
  return (
    <MarketingShell>
      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
          {kicker}
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{h1}</h1>
        <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{subhead}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <Reveal>
          <ComparisonTable cols={comparisonCols} rows={comparisonRows} />
        </Reveal>
        {comparisonNote && (
          <p className="mt-4 text-xs leading-relaxed text-steel">{comparisonNote}</p>
        )}
      </section>

      <section className="mx-auto max-w-4xl space-y-10 px-6 pb-16">
        {sections.map((s) => (
          <Reveal key={s.title}>
            <h2 className="font-display text-xl font-semibold text-foreground">{s.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{s.body}</p>
          </Reveal>
        ))}
      </section>

      <Faq items={faqItems} id="faq" title={faqTitle} />

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">See it for yourself.</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start a 7-day free trial — card required, cancel anytime before it ends.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
        </div>
      </section>
    </MarketingShell>
  );
}
