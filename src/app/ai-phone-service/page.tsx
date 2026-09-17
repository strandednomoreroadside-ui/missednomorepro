import type { Metadata } from "next";
import { ArrowRight, BadgeCheck, CalendarCheck, MessageSquareText, PhoneCall } from "lucide-react";

import { ComparisonTable, type ComparisonRow } from "@/components/landing/comparison-table";
import { Faq, type FaqItem } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink, SectionHeading } from "@/components/landing/primitives";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/ai-phone-service";
const TITLE = "AI Phone Service for Small Business | Missed No More Pro";
const DESCRIPTION =
  "AI phone service for small businesses that answers calls 24/7, qualifies leads, quotes from approved rates, books jobs, and keeps every call on your business line.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI phone service",
    "AI phone service for small business",
    "AI business phone service",
    "AI phone system for small business",
    "AI phone receptionist",
    "AI call answering service",
    "AI telephone answering service",
    "business phone service with AI",
    "AI business phone number",
  ],
});

const FEATURES = [
  {
    icon: PhoneCall,
    title: "A business line that answers",
    body: "Forward your current business number or claim a new local number. The AI answers in your business name when you are busy, after hours, or need overflow coverage.",
  },
  {
    icon: BadgeCheck,
    title: "Rules instead of guesses",
    body: "You set the services, hours, service area, pricing rules, and human handoff conditions. The AI uses those rules instead of making up an answer or a price.",
  },
  {
    icon: CalendarCheck,
    title: "A call that becomes work",
    body: "The assistant qualifies the request, checks availability, books when appropriate, and gives your team the details needed for the next step.",
  },
  {
    icon: MessageSquareText,
    title: "One record for every conversation",
    body: "Calls, texts, customer details, and follow-ups stay in the same business workspace, rather than disappearing into personal phones or voicemail.",
  },
];

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Business phone number", values: ["New or forwarded", true, true] },
  { label: "Answers calls after hours", values: [true, "Depends on setup", true] },
  { label: "Understands the reason for the call", values: [true, false, "Usually message-taking"] },
  { label: "Quotes from your approved rates", values: [true, false, false] },
  { label: "Books on your calendar", values: [true, false, "Depends on provider"] },
  { label: "Shared call and text history", values: [true, "Depends on plan", "Depends on provider"] },
  { label: "Entry price", values: ["from $50/mo", "Varies", "Often per minute or call"] },
];

const FAQS: FaqItem[] = [
  {
    q: "What is an AI phone service?",
    a: "An AI phone service gives a business a number and an AI receptionist that can answer inbound calls. For a local service business, it should do more than route a call: it should collect job details, follow the business's rules, take approved actions, and keep a record for the team.",
  },
  {
    q: "Can I use my existing business phone number?",
    a: "Yes. You can forward all calls or only unanswered and after-hours calls from an existing business number to Missed No More Pro. You can also claim a new local business number from the dashboard.",
  },
  {
    q: "Is an AI phone service the same as an answering service?",
    a: "Not quite. A traditional answering service generally has a person take a message. An AI phone service can answer immediately, qualify the caller, quote from approved rules, book eligible work, text updates, and alert a team member when a human is needed.",
  },
  {
    q: "How much does an AI phone service cost?",
    a: "Missed No More Pro starts at $50 per month for 200 AI minutes and a 7-day free trial. Plans have hard usage caps, so there are no overage charges. See current plan limits and features on the pricing page.",
  },
];

export default function AiPhoneServicePage() {
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
        "@type": "Service",
        "@id": `${SITE_URL}${PATH}#service`,
        name: "AI Phone Service for Small Business",
        serviceType: "AI business phone service",
        alternateName: ["AI phone receptionist", "AI call answering service", "AI telephone answering service"],
        provider: { "@id": `${SITE_URL}/#org` },
        areaServed: { "@type": "Country", name: "United States" },
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "50",
          highPrice: "200",
          priceCurrency: "USD",
          offerCount: "3",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQS.map(({ q, a }) => ({
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        })),
      },
      breadcrumbJsonLd([{ name: "AI Phone Service", path: PATH }]),
    ],
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <section className="glow-field border-b border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
            AI business phone service
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            AI phone service for small business
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            An AI phone service is a business line that answers calls and helps move work forward.
            Missed No More Pro handles the call in your business&apos;s name, follows your rules, and gives
            your team a complete next step—not another voicemail to return.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/#real-call" variant="outline" large>
              Hear a real call
            </ButtonLink>
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-wider text-steel">
            Plans from $50/mo · 7-day free trial · no overage charges
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <SectionHeading
          eyebrow="What your phone service should do"
          title="More than a phone number. A front door for your business."
          sub="A useful AI phone service keeps your business reachable while you work, but it should also know when to capture details, when to quote, when to book, and when to hand a caller to a person."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="rounded-xl border border-border bg-card/60 p-6">
              <feature.icon className="size-5 text-cyan" aria-hidden />
              <h2 className="mt-4 font-display text-xl font-semibold">{feature.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-navy/25">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <SectionHeading
            eyebrow="Choose the right coverage"
            title="AI phone service vs. a phone system vs. an answering service"
            sub="A basic phone system moves calls. An answering service usually captures a message. Missed No More Pro combines a business line with an AI receptionist that can follow approved rules and create the next action."
          />
          <div className="mt-10">
            <ComparisonTable
              cols={["Missed No More Pro", "Business phone system", "Answering service"]}
              rows={COMPARISON_ROWS}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">Built for the field</p>
            <h2 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Keep your number. Stop missing the opportunity.
            </h2>
            <p className="mt-5 text-base leading-relaxed text-muted-foreground">
              Start with forwarding for the calls you cannot answer, or use a new local number. As the
              assistant learns the services and rules you approve, every call can become a clear record,
              a booked job, a text update, or a deliberate handoff to your team.
            </p>
          </div>
          <div className="rounded-xl border border-cyan/25 bg-cyan/5 p-7">
            <p className="font-mono text-xs font-semibold uppercase tracking-[0.2em] text-cyan">Related guides</p>
            <ul className="mt-5 space-y-4 text-sm">
              <li><a className="font-medium underline decoration-cyan/50 underline-offset-4 hover:text-cyan" href="/ai-answering-service">AI answering service for small business →</a></li>
              <li><a className="font-medium underline decoration-cyan/50 underline-offset-4 hover:text-cyan" href="/ai-phone-assistant">AI phone assistant guide →</a></li>
              <li><a className="font-medium underline decoration-cyan/50 underline-offset-4 hover:text-cyan" href="/vs/virtual-receptionist">AI receptionist vs. virtual receptionist →</a></li>
              <li><a className="font-medium underline decoration-cyan/50 underline-offset-4 hover:text-cyan" href="/industries">AI receptionist by industry →</a></li>
            </ul>
          </div>
        </div>
      </section>

      <Faq items={FAQS} title="AI phone service questions" eyebrow="FAQ" />
    </MarketingShell>
  );
}
