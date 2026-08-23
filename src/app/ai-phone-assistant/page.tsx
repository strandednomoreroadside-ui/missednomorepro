import type { Metadata } from "next";
import { ArrowRight, CalendarCheck, Check, ClipboardList, MessageSquareText, PhoneCall } from "lucide-react";

import { ComparisonTable, type ComparisonRow } from "@/components/landing/comparison-table";
import { Faq, type FaqItem } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink, SectionHeading } from "@/components/landing/primitives";
import { env } from "@/lib/env";

const TITLE = "AI Phone Assistant for Small Business Calls";
const DESCRIPTION =
  "A practical guide to AI phone assistants for local service businesses. Learn how Missed No More Pro answers calls, quotes exact prices, books jobs, texts customers, and tracks leads in a CRM.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-phone-assistant" },
  keywords: [
    "AI phone assistant",
    "AI phone assistant for small business",
    "AI phone answering service",
    "AI answering service for local business",
    "AI receptionist",
    "AI receptionist for small business",
    "AI virtual receptionist",
    "AI call answering service",
    "AI receptionist with CRM",
    "AI receptionist with price quoting",
  ],
  openGraph: { title: `${TITLE} · Missed No More Pro`, description: DESCRIPTION, url: "/ai-phone-assistant" },
  twitter: { card: "summary_large_image", title: `${TITLE} · Missed No More Pro`, description: DESCRIPTION },
};

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Answers calls 24/7", values: [true, true, false] },
  { label: "Qualifies callers one question at a time", values: [true, "Maybe", false] },
  { label: "Quotes exact prices from approved rates", values: [true, false, false] },
  { label: "Books jobs on your calendar", values: [true, false, false] },
  { label: "Follows up by compliant text", values: [true, "Maybe", false] },
  { label: "Logs every caller in a CRM", values: [true, false, false] },
  { label: "Entry price", values: ["from $79/mo", "$300+/mo", "$0"] },
];

const FAQS: FaqItem[] = [
  {
    q: "What is an AI phone assistant?",
    a: "An AI phone assistant is software that answers calls, understands what the caller needs, captures contact details, and triggers the next business action. Missed No More Pro is built for service calls: it can quote, book, text, and log the lead in a CRM.",
  },
  {
    q: "Can an AI phone assistant replace an answering service?",
    a: "For many small service businesses, yes. A standard answering service usually takes a message. Missed No More Pro answers the call, qualifies the job, books appointments, follows up by text, and keeps the customer record updated automatically.",
  },
  {
    q: "Can it quote prices without making numbers up?",
    a: "Yes. Missed No More Pro quotes only through a server-side pricing engine using your approved rates, service area, driving distance, and rules. The AI does not invent prices.",
  },
  {
    q: "Who should use an AI phone answering service?",
    a: "It is best for local service businesses where missed calls become lost jobs: towing, roadside assistance, HVAC, plumbing, electrical, roofing, garage doors, locksmiths, pest control, cleaning, landscaping, appliance repair, mobile mechanics, and handyman teams.",
  },
];

const STEPS = [
  {
    icon: PhoneCall,
    title: "Answer every call",
    body: "The AI greets callers in your business name, handles after-hours calls, and captures the reason for the call without forcing them into voicemail.",
  },
  {
    icon: ClipboardList,
    title: "Qualify and quote",
    body: "It gathers the service, location, timing, and details needed to quote accurately from your approved rules.",
  },
  {
    icon: CalendarCheck,
    title: "Book the job",
    body: "When booking is enabled, it checks real availability and books inside the hours and buffers you approve.",
  },
  {
    icon: MessageSquareText,
    title: "Text and track",
    body: "It sends compliant follow-ups, alerts your team, and logs the full call history in the built-in CRM.",
  },
];

export default function AiPhoneAssistantPage() {
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${base}/ai-phone-assistant#webpage`,
        url: `${base}/ai-phone-assistant`,
        name: TITLE,
        description: DESCRIPTION,
      },
      {
        "@type": "Service",
        "@id": `${base}/ai-phone-assistant#service`,
        name: "AI Phone Assistant",
        serviceType: "AI phone answering service",
        provider: {
          "@type": "Organization",
          name: "Missed No More Pro",
          url: base,
        },
        areaServed: "United States",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "79",
          highPrice: "479",
          priceCurrency: "USD",
        },
      },
    ],
  };

  return (
    <MarketingShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <section className="glow-field border-b border-border/60">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-24">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
            AI phone assistant guide
          </p>
          <h1 className="mt-4 max-w-4xl font-display text-4xl font-bold tracking-tight sm:text-5xl">
            AI phone assistant for small business calls
          </h1>
          <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
            Missed No More Pro is an AI phone answering service for local service
            businesses. It answers calls, qualifies the caller, quotes exact prices,
            books jobs, follows up by text, and tracks every lead in a built-in CRM.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <ButtonLink href="/signup" large>
              Start free trial <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/pricing" variant="outline" large>
              See pricing
            </ButtonLink>
          </div>
          <p className="mt-5 font-mono text-xs uppercase tracking-wider text-steel">
            Plans from $79/mo · 7-day free trial · founder offer available
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
        <SectionHeading
          eyebrow="Definition"
          title="What does an AI phone assistant do?"
          sub="An AI phone assistant answers inbound calls and turns them into structured business actions. For a local service company, that means more than message-taking: the assistant should collect the job details, check rules, send texts, and update the CRM."
        />
        <div className="mt-10 grid gap-5 md:grid-cols-4">
          {STEPS.map((step) => (
            <article key={step.title} className="rounded-xl border border-border bg-card/60 p-5">
              <step.icon className="size-5 text-cyan" aria-hidden />
              <h2 className="mt-4 font-display text-lg font-semibold">{step.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-border/60 bg-navy/25">
        <div className="mx-auto max-w-5xl px-6 py-16 lg:py-20">
          <SectionHeading
            eyebrow="Comparison"
            title="AI phone assistant vs answering service vs voicemail"
            sub="The difference is whether the call becomes a booked job or just another message waiting for you."
          />
          <div className="mt-10">
            <ComparisonTable
              cols={["Missed No More Pro", "Answering service", "Voicemail"]}
              rows={COMPARISON_ROWS}
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-20">
        <h2 className="font-display text-3xl font-bold tracking-tight">
          Long-tail use cases Missed No More Pro covers
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {[
            "AI phone assistant for towing companies",
            "AI receptionist for HVAC and plumbing calls",
            "AI answering service with price quoting",
            "AI receptionist with CRM for small business",
            "After-hours AI phone answering service",
            "Missed-call text-back for local service businesses",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card/55 p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
              <p className="text-sm font-medium text-foreground">{item}</p>
            </div>
          ))}
        </div>
      </section>

      <Faq
        items={FAQS}
        title="AI phone assistant questions"
        eyebrow="FAQ"
      />
    </MarketingShell>
  );
}
