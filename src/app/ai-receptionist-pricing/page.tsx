import type { Metadata } from "next";
import { ArrowRight, Check, CircleDollarSign, ShieldCheck, TimerReset } from "lucide-react";

import { Faq, type FaqItem } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink, SectionHeading } from "@/components/landing/primitives";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-pricing";
const TITLE = "AI Receptionist Pricing: Cost for Small Business | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist pricing guide for small businesses: how plans are priced, what to check for, and Missed No More Pro's $50, $100, and $200 monthly plans.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist pricing",
    "AI receptionist cost",
    "AI receptionist cost for small business",
    "AI answering service pricing",
    "AI answering service cost",
    "AI phone answering service pricing",
    "how much does an AI receptionist cost",
    "AI virtual receptionist pricing",
  ],
});

const FAQS: FaqItem[] = [
  {
    q: "How much does an AI receptionist cost?",
    a: "AI receptionist pricing depends on the number of AI minutes, users, and the functions included. Missed No More Pro starts at $50 per month for 200 AI minutes, with Growth at $100 for 400 minutes and Professional at $200 for 800 minutes. Every plan includes a 7-day trial.",
  },
  {
    q: "Are there AI receptionist overage charges?",
    a: "Providers handle limits differently. Missed No More Pro uses hard usage caps and does not charge overages. Owners see usage alerts as minutes run low; at the cap, calls forward to the owner's phone instead of generating an unexpected bill.",
  },
  {
    q: "What should be included in AI receptionist pricing?",
    a: "Check whether call answering, booking, text follow-up, CRM history, calendar connection, human handoff, setup, and support are included or sold as add-ons. Also confirm how the provider defines a billable AI minute and what happens when the plan limit is reached.",
  },
  {
    q: "Is an AI receptionist cheaper than a human answering service?",
    a: "The right choice depends on call volume and how much judgment each call needs. A human service can be a better fit for complex or highly sensitive calls. For routine service intake, an AI receptionist can answer immediately, follow approved rules, and create the next action on a predictable monthly plan.",
  },
];

const PLANS = [
  { name: "Starter", price: "$50", annual: "$40/mo annual equivalent", minutes: "200 AI minutes", users: "1 user", fit: "Solo operators who never want to miss a call" },
  { name: "Growth", price: "$100", annual: "$80/mo annual equivalent", minutes: "400 AI minutes", users: "3 users", fit: "Small teams that want more leads converted" },
  { name: "Professional", price: "$200", annual: "$160/mo annual equivalent", minutes: "800 AI minutes", users: "10 users", fit: "Growing teams that dispatch work and need insight" },
];

export default function AiReceptionistPricingPage() {
  const jsonLd = {
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${PATH}#webpage`,
        url: `${SITE_URL}${PATH}`,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#software` },
        dateModified: "2026-09-16",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
      breadcrumbJsonLd([{ name: "AI Receptionist Pricing", path: PATH }]),
    ],
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <section className="glow-field border-b border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">AI receptionist pricing guide</p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl">AI receptionist pricing for small business</h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            The right question is not only “what does an AI receptionist cost?” It is whether the plan
            answers the calls you cannot take, follows the rules you approve, and stays predictable when
            your phone gets busy. This guide explains what to compare before you choose.
          </p>
          <div className="mt-8 flex flex-wrap gap-3"><ButtonLink href="/pricing" large>See exact plan details <ArrowRight className="size-4" aria-hidden /></ButtonLink><ButtonLink href="/#real-call" variant="outline" large>Hear a real call</ButtonLink></div>
          <p className="mt-5 font-mono text-xs uppercase tracking-wider text-steel">Plans from $50/mo · 7-day free trial · annual billing saves 20%</p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <SectionHeading eyebrow="Start with the pricing model" title="What changes the cost of an AI receptionist?" sub="Most providers price around usage, features, or both. Compare the definition of a billable minute, the included actions, and the limit policy before comparing a headline price." />
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <article className="rounded-xl border border-border bg-card/60 p-6"><TimerReset className="size-5 text-cyan" aria-hidden /><h2 className="mt-4 font-display text-xl font-semibold">Usage</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Ask how AI minutes are counted and what a typical call looks like for your business. Missed No More Pro measures the time the AI is actually on the phone with the caller.</p></article>
          <article className="rounded-xl border border-border bg-card/60 p-6"><CircleDollarSign className="size-5 text-cyan" aria-hidden /><h2 className="mt-4 font-display text-xl font-semibold">Included work</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Look beyond answering. Find out whether booking, texts, CRM history, calendar connection, and human handoff are included or extra.</p></article>
          <article className="rounded-xl border border-border bg-card/60 p-6"><ShieldCheck className="size-5 text-cyan" aria-hidden /><h2 className="mt-4 font-display text-xl font-semibold">The limit policy</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">A low entry price can become hard to predict if a busy month creates overages. Know whether calls stop, forward, or add a charge at the plan limit.</p></article>
        </div>
      </section>

      <section className="border-y border-border/60 bg-navy/25"><div className="mx-auto max-w-5xl px-6 py-16 lg:py-20"><SectionHeading eyebrow="Current Missed No More Pro plans" title="Clear monthly plans. No paid add-ons today." sub="Every current AI capability is included within the plan structure below. Annual billing saves 20%, and the first ten paying businesses lock in their price while their subscription stays active." /><div className="mt-10 grid gap-5 md:grid-cols-3">{PLANS.map((plan) => <article key={plan.name} className="rounded-xl border border-border bg-card/70 p-6"><h2 className="font-display text-2xl font-semibold">{plan.name}</h2><p className="mt-4 font-display text-5xl font-bold text-cyan">{plan.price}<span className="font-sans text-sm font-normal text-muted-foreground">/mo</span></p><p className="mt-2 text-xs text-muted-foreground">{plan.annual}</p><ul className="mt-6 space-y-3 border-t border-border pt-5 text-sm text-muted-foreground"><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />{plan.minutes}</li><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />{plan.users}</li><li className="flex gap-2"><Check className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />{plan.fit}</li></ul></article>)}</div><p className="mt-7 text-sm leading-relaxed text-muted-foreground">All plans include a 7-day free trial, hard usage caps with no overage charges, and the core AI receptionist workflow. See <a className="font-medium text-cyan underline underline-offset-4" href="/pricing">full pricing and feature details</a> before choosing a plan.</p></div></section>

      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-20"><SectionHeading eyebrow="Buyer checklist" title="Questions worth asking before you buy" sub="These answers matter more than a vague “starting at” number." /><ol className="mt-9 space-y-4 text-base leading-relaxed text-muted-foreground"><li><b className="text-foreground">1. What happens when we reach the limit?</b> Is there an overage charge, a handoff, or a forwarding rule?</li><li><b className="text-foreground">2. Can it use our approved prices and hours?</b> Your assistant should not improvise a number or promise a time you cannot keep.</li><li><b className="text-foreground">3. Can it hand a caller to our team?</b> Decide what needs a person and how that handoff should work.</li><li><b className="text-foreground">4. Does the call leave a usable record?</b> Look for the details, transcript, follow-up, and job context your team needs afterward.</li><li><b className="text-foreground">5. Can we hear it before we buy?</b> A real call is more useful than a feature checklist. <a className="font-medium text-cyan underline underline-offset-4" href="/#real-call">Listen to an example</a>.</li></ol></section>

      <Faq items={FAQS} title="AI receptionist pricing questions" eyebrow="FAQ" />
    </MarketingShell>
  );
}
