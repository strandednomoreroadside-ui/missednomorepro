import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Check, PhoneCall } from "lucide-react";

import { ComparisonTable, type ComparisonRow } from "@/components/landing/comparison-table";
import { Faq, type FaqItem } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { ButtonLink, SectionHeading } from "@/components/landing/primitives";
import { TRADE_PAGES } from "@/components/landing/trade-links";
import { PLAN_META, SELF_SERVE_PLAN_ORDER } from "@/lib/billing/plans";
import { DEMO_PHONE_DISPLAY, DEMO_PHONE_E164 } from "@/lib/constants";
import { JsonLd, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const PATH = "/ai-answering-service";
const TITLE = "AI Answering Service for Small Business | Missed No More Pro";
const DESCRIPTION =
  "A 24/7 AI answering service that picks up every call, answers questions, quotes from your rates, and books appointments. From $50/mo, 7-day free trial.";
const H1 = "AI Answering Service for Small Business";
const INTRO =
  "An AI answering service answers your business phone with a voice AI instead of a live operator. Missed No More Pro picks up every call 24/7 in your business's name, answers questions from your own information, quotes exact prices from the rates you approve, books appointments on your calendar, and texts your team the moment a real lead comes in.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI answering service",
    "AI answering service for small business",
    "AI phone answering service",
    "24/7 answering service",
    "after-hours answering service",
    "automated answering service",
    "virtual answering service",
  ],
});

const STEPS = [
  {
    title: "Connect your number",
    body: "Forward your existing business line to us, for every call or only when you don't pick up, or claim a new local number from your dashboard.",
  },
  {
    title: "Tell it about your business",
    body: "A guided setup covers your services, hours, service area, and common questions. Upload a price sheet or FAQ document instead of typing it all in.",
  },
  {
    title: "Approve and go live",
    body: "Nothing goes live until you review it. Call your own AI from the dashboard first to hear exactly what your customers will hear.",
  },
  {
    title: "Every call handled and logged",
    body: "Each call gets a summary and transcript in the built-in CRM, and your team gets a text alert when a lead needs attention.",
  },
];

const CAPABILITIES = [
  "Answers 24/7, including nights, weekends, and holidays",
  "Screens out sales pitches and robocalls",
  "Answers questions from your FAQs, word for word",
  "Quotes exact prices from your approved rates",
  "Books, cancels, and reschedules on Google Calendar",
  "Warm-transfers callers who need a person",
  "Texts confirmations, reminders, and missed-call text-backs",
  "Logs every caller, transcript, and quote in a CRM",
];

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Answers every call 24/7", values: [true, true, false] },
  { label: "Answers questions in your words", values: [true, "Maybe", false] },
  { label: "Quotes exact prices from your rates", values: [true, false, false] },
  { label: "Books appointments on your calendar", values: [true, "Maybe", false] },
  { label: "Texts the customer a confirmation", values: [true, false, false] },
  { label: "Logs every lead in a CRM", values: [true, false, false] },
  { label: "Typical monthly cost", values: ["from $50", "$300+", "$0"] },
];

const FAQS: FaqItem[] = [
  {
    q: "What is an AI answering service?",
    a: "An AI answering service uses a voice AI, instead of a live operator, to answer your business calls. Missed No More Pro answers 24/7 in your business's name, answers questions from your information, quotes prices from your approved rates, books appointments, and logs every call in a CRM.",
  },
  {
    q: "How is it different from a live answering service?",
    a: "A live answering service usually takes a message for you to return. An AI answering service can finish the job on the call: quote the price, book the appointment, text a confirmation, and alert your team, for a flat monthly price instead of per-minute or per-call billing.",
  },
  {
    q: "Will callers know they're talking to an AI?",
    a: "It speaks in a natural voice and answers in your business's name, but it never claims to be human. If a caller asks, it tells them it is an AI assistant, and it can warm-transfer anyone who wants a person.",
  },
  {
    q: "Can it answer calls after hours and on weekends?",
    a: "Yes. It answers every call, day or night. Bookings only go into open times inside the business hours you set, and urgent after-hours calls can be texted straight to your on-call person.",
  },
  {
    q: "What happens when it can't answer a question?",
    a: "It never makes up an answer or a price. It takes the caller's details and a callback number and lets your team know, or warm-transfers the call if you've set that up.",
  },
  {
    q: "How much does an AI answering service cost?",
    a: `Missed No More Pro plans are $${PLAN_META.starter.monthly}/month for ${PLAN_META.starter.minutes}, $${PLAN_META.growth.monthly}/month for ${PLAN_META.growth.minutes}, and $${PLAN_META.professional.monthly}/month for ${PLAN_META.professional.minutes}. Annual billing saves 20%, every plan starts with a 7-day free trial, and every plan is a hard cap with no overage charges.`,
  },
];

export default function AiAnsweringServicePage() {
  const prices = SELF_SERVE_PLAN_ORDER.map((id) => PLAN_META[id].monthly);
  const jsonLd = {
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}${PATH}#webpage`,
        url: `${SITE_URL}${PATH}`,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}${PATH}#service` },
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}${PATH}#service`,
        name: H1,
        serviceType: "AI answering service",
        alternateName: ["AI phone answering service", "24/7 answering service", "AI receptionist"],
        provider: { "@id": `${SITE_URL}/#org` },
        areaServed: { "@type": "Country", name: "United States" },
        description: INTRO,
        offers: {
          "@type": "AggregateOffer",
          priceCurrency: "USD",
          lowPrice: String(Math.min(...prices)),
          highPrice: String(Math.max(...prices)),
          offerCount: String(prices.length),
        },
      },
      breadcrumbJsonLd([{ name: "AI Answering Service", path: PATH }]),
    ],
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />

      <section className="mx-auto max-w-4xl px-6 py-16 lg:py-24">
        <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
          AI answering service
        </p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">{H1}</h1>
        <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{INTRO}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href="/signup" large>
            Start free trial <ArrowRight className="size-4" aria-hidden />
          </ButtonLink>
          <ButtonLink href={`tel:${DEMO_PHONE_E164}`} variant="outline" large>
            <PhoneCall className="size-4" aria-hidden /> Call the live demo
          </ButtonLink>
        </div>
        <p className="mt-5 font-mono text-xs uppercase tracking-wider text-steel">
          Plans from ${Math.min(...prices)}/mo · 7-day free trial · no overage charges
        </p>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          How an AI answering service works
        </h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="rounded-xl border border-border bg-card/60 p-5">
              <span className="font-mono text-xs text-cyan">0{i + 1}</span>
              <h3 className="mt-2 font-display text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          What it does on every call
        </h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {CAPABILITIES.map((item) => (
            <li key={item} className="flex items-start gap-3 rounded-xl border border-border bg-card/55 p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
              <span className="text-sm font-medium text-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-border/60 bg-navy/25">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="mb-6 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            AI answering service vs. live answering service vs. voicemail
          </h2>
          <ComparisonTable
            cols={["Missed No More Pro", "Live answering service", "Voicemail"]}
            rows={COMPARISON_ROWS}
          />
          <p className="mt-4 text-sm text-muted-foreground">
            More detail:{" "}
            <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/vs/answering-service">
              AI receptionist vs. a human answering service
            </Link>{" "}
            and{" "}
            <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/vs/virtual-receptionist">
              AI receptionist vs. a virtual receptionist
            </Link>
            .
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 py-16">
        <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          What an AI answering service costs
        </h2>
        <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
          Flat monthly plans based on AI minutes, the time the AI is actually on the phone with a
          caller. Every plan is a hard cap: if you reach your limit, calls forward to your phone
          instead of creating overage charges.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {SELF_SERVE_PLAN_ORDER.map((id) => {
            const plan = PLAN_META[id];
            return (
              <div key={id} className="rounded-xl border border-border bg-card/60 p-5">
                <h3 className="font-display text-lg font-semibold">{plan.name}</h3>
                <p className="mt-1 font-display text-3xl font-bold">
                  ${plan.monthly}
                  <span className="text-sm font-normal text-muted-foreground">/mo</span>
                </p>
                <p className="mt-2 text-sm text-foreground">{plan.minutes}</p>
                <p className="mt-1 text-sm text-muted-foreground">{plan.blurb}</p>
              </div>
            );
          })}
        </div>
        <p className="mt-4 text-sm">
          <Link className="text-foreground underline underline-offset-4 hover:text-primary" href="/pricing">
            See everything included in each plan
          </Link>
        </p>
      </section>

      <section className="border-y border-border/60 bg-navy/25">
        <div className="mx-auto max-w-5xl px-6 py-16">
          <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
            Built for local service businesses
          </h2>
          <p className="mt-3 max-w-3xl text-base leading-relaxed text-muted-foreground">
            It works for businesses that go out to the customer, like home services and towing, and
            for businesses customers visit, like salons, barbershops, and repair shops. Pick your
            trade in setup and the AI asks the right questions for it.
          </p>
          <ul className="mt-6 flex flex-wrap gap-2">
            {TRADE_PAGES.map((t) => (
              <li key={t.href}>
                <Link
                  href={t.href}
                  className="inline-flex rounded-full border border-border bg-card/60 px-4 py-2 text-sm text-foreground transition-colors hover:border-primary/50 hover:text-primary"
                >
                  {t.breadcrumb}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-16">
        <SectionHeading
          eyebrow="Live demo"
          title="Hear an AI answering service right now"
          sub={`Call ${DEMO_PHONE_DISPLAY}. It answers as Summit Home Services, a sample heating, cooling, plumbing, and electrical company, and quotes from that company's real price list. No signup needed.`}
        />
        <div className="mt-8 flex justify-center">
          <ButtonLink href={`tel:${DEMO_PHONE_E164}`} large>
            <PhoneCall className="size-4" aria-hidden /> Call {DEMO_PHONE_DISPLAY}
          </ButtonLink>
        </div>
      </section>

      <Faq items={FAQS} title="AI answering service questions" />

      <section className="border-t border-border/60">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight">
            Stop letting calls go to voicemail.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
            Start a 7-day free trial. Card required, cancel anytime before it ends.
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
