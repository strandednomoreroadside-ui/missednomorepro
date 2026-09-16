import Link from "next/link";
import { ArrowRight, Check, PhoneCall } from "lucide-react";

import { PLAN_META, SELF_SERVE_PLAN_ORDER } from "@/lib/billing/plans";
import { DEMO_PHONE_DISPLAY, DEMO_PHONE_E164 } from "@/lib/constants";
import { JsonLd, SITE_URL, breadcrumbJsonLd } from "@/lib/seo";

import { ComparisonTable, type ComparisonRow } from "./comparison-table";
import type { ComparisonSection } from "./comparison-page";
import { Faq, type FaqItem } from "./faq";
import { MarketingShell } from "./marketing-shell";
import { ButtonLink, SectionHeading } from "./primitives";
import { TRADE_PAGES } from "./trade-links";

export type QuoteExample = {
  title: string;
  body: string;
  lines: { label: string; amount: string; muted?: boolean }[];
  total: string;
  note: string;
};

/**
 * Industry landing page (/ai-receptionist-for-*). Every block is driven by
 * the page's own trade-specific content; the optional quote example and demo
 * prompts must reflect what the product and the live demo line really do.
 */
export function TradePage({
  path,
  trade,
  audience,
  kicker,
  h1,
  subhead,
  callTypes,
  comparisonCols,
  comparisonRows,
  sections,
  quoteExample,
  demoPrompts,
  demoTip,
  faqItems,
  faqTitle,
}: {
  path: string;
  /** Short trade label used in headings, e.g. "HVAC" or "plumbing". */
  trade: string;
  /** Who the Service schema is for, e.g. "HVAC contractors". */
  audience: string;
  kicker: string;
  h1: string;
  subhead: string;
  callTypes: string[];
  comparisonCols: string[];
  comparisonRows: ComparisonRow[];
  sections: ComparisonSection[];
  quoteExample?: QuoteExample;
  demoPrompts?: string[];
  demoTip?: string;
  faqItems: FaqItem[];
  faqTitle: string;
}) {
  const breadcrumb = TRADE_PAGES.find((t) => t.href === path)?.breadcrumb ?? h1;
  const prices = SELF_SERVE_PLAN_ORDER.map((id) => PLAN_META[id].monthly);
  const related = TRADE_PAGES.filter((t) => t.href !== path);
  const Trade = trade.charAt(0).toUpperCase() + trade.slice(1);

  return (
    <MarketingShell>
      <JsonLd
        data={{
          "@graph": [
            {
              "@type": "WebPage",
              "@id": `${SITE_URL}${path}#webpage`,
              url: `${SITE_URL}${path}`,
              name: h1,
              description: subhead,
              isPartOf: { "@id": `${SITE_URL}/#website` },
              about: { "@id": `${SITE_URL}${path}#service` },
            },
            {
              "@type": "Service",
              "@id": `${SITE_URL}${path}#service`,
              name: h1,
              serviceType: "AI receptionist",
              alternateName: [`${Trade} answering service`, `${Trade} virtual receptionist`],
              provider: { "@id": `${SITE_URL}/#org` },
              areaServed: { "@type": "Country", name: "United States" },
              audience: { "@type": "BusinessAudience", audienceType: audience },
              description: subhead,
              offers: {
                "@type": "AggregateOffer",
                priceCurrency: "USD",
                lowPrice: String(Math.min(...prices)),
                highPrice: String(Math.max(...prices)),
                offerCount: String(prices.length),
              },
            },
            breadcrumbJsonLd([{ name: breadcrumb, path }]),
          ],
        }}
      />

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
          {demoPrompts && (
            <ButtonLink href={`tel:${DEMO_PHONE_E164}`} variant="outline" large>
              <PhoneCall className="size-4" aria-hidden /> Call the live demo
            </ButtonLink>
          )}
        </div>
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-steel">
          Plans from ${Math.min(...prices)}/mo · 7-day free trial · no overage charges
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {Trade} calls it handles
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {callTypes.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card/55 p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
              <span className="text-sm font-medium text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          AI receptionist vs. answering service vs. voicemail for {trade} businesses
        </h2>
        <ComparisonTable cols={comparisonCols} rows={comparisonRows} />
      </section>

      <section className="mx-auto max-w-4xl space-y-10 px-6 pb-16">
        {sections.map((s) => (
          <div key={s.title}>
            <h2 className="font-display text-xl font-semibold text-foreground">{s.title}</h2>
            <p className="mt-3 text-base leading-relaxed text-muted-foreground">{s.body}</p>
          </div>
        ))}
      </section>

      {quoteExample && (
        <section className="border-y border-border/60 bg-navy/25">
          <div className="mx-auto grid max-w-5xl gap-10 px-6 py-16 md:grid-cols-2 md:items-center">
            <div>
              <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Example quote
              </p>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {quoteExample.title}
              </h2>
              <p className="mt-4 text-base leading-relaxed text-muted-foreground">{quoteExample.body}</p>
            </div>
            <div className="rounded-2xl border border-border bg-card/70 p-6">
              <dl className="space-y-3 text-sm">
                {quoteExample.lines.map((line) => (
                  <div key={line.label} className="flex items-baseline justify-between gap-4">
                    <dt className={line.muted ? "text-muted-foreground" : "text-foreground"}>{line.label}</dt>
                    <dd className={`shrink-0 whitespace-nowrap ${line.muted ? "text-muted-foreground" : "font-semibold text-foreground"}`}>
                      {line.amount}
                    </dd>
                  </div>
                ))}
                <div className="flex items-baseline justify-between gap-4 border-t border-border pt-4">
                  <dt className="font-semibold text-foreground">Quoted total</dt>
                  <dd className="font-display text-2xl font-bold text-primary">{quoteExample.total}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs leading-relaxed text-steel">{quoteExample.note}</p>
            </div>
          </div>
        </section>
      )}

      {demoPrompts && (
        <section className="mx-auto max-w-4xl px-6 py-16">
          <SectionHeading
            eyebrow="Live demo"
            title={`Hear it handle ${trade} calls`}
            sub={`Call ${DEMO_PHONE_DISPLAY}. It answers as Summit Home Services, a sample heating, cooling, plumbing, and electrical company, and quotes from that company's real price list. No signup needed.`}
          />
          <ul className="mx-auto mt-8 grid max-w-2xl gap-3">
            {demoPrompts.map((prompt) => (
              <li key={prompt} className="rounded-xl border border-border bg-card/55 px-5 py-4 text-sm text-foreground">
                &ldquo;{prompt}&rdquo;
              </li>
            ))}
          </ul>
          {demoTip && <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-muted-foreground">{demoTip}</p>}
          <div className="mt-8 flex justify-center">
            <ButtonLink href={`tel:${DEMO_PHONE_E164}`} large>
              <PhoneCall className="size-4" aria-hidden /> Call {DEMO_PHONE_DISPLAY}
            </ButtonLink>
          </div>
        </section>
      )}

      <Faq items={faqItems} id="faq" title={faqTitle} />

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Stop sending {trade} calls to voicemail.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start a 7-day free trial. Card required, cancel anytime before it ends.
          </p>
          <div className="mt-6 flex justify-center">
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
          </div>
          <p className="mt-10 text-sm text-muted-foreground">
            Also built for:{" "}
            {related.map((t, i) => (
              <span key={t.href}>
                {i > 0 && " · "}
                <Link className="text-foreground underline underline-offset-4 hover:text-primary" href={t.href}>
                  {t.breadcrumb}
                </Link>
              </span>
            ))}
            {" · "}
            <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/ai-phone-assistant">
              AI phone assistant guide
            </Link>
          </p>
        </div>
      </section>
    </MarketingShell>
  );
}
