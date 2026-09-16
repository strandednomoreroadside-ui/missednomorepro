import type { Metadata } from "next";

import { ComparisonPage } from "@/components/landing/comparison-page";
import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { pageMetadata } from "@/lib/seo";

const PATH = "/vs/virtual-receptionist";
const TITLE = "AI Receptionist vs. Virtual Receptionist | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist vs. a live virtual receptionist service for small business: pricing model, 24/7 coverage, quoting, booking, and when a person is better.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist vs virtual receptionist",
    "virtual receptionist alternative",
    "virtual receptionist for small business",
    "AI virtual receptionist",
    "live receptionist service alternative",
  ],
});

const COLS = ["Missed No More Pro", "Live virtual receptionist"];
const ROWS: ComparisonRow[] = [
  { label: "Pricing model", values: ["Flat monthly plan, hard cap", "Usually per minute or per call"] },
  { label: "Answers every call, day or night", values: [true, "Depends on plan"] },
  { label: "Computes exact quotes from your rates and driving distance", values: [true, false] },
  { label: "Books appointments on your calendar", values: [true, true] },
  { label: "Built-in CRM with call transcripts", values: [true, "Varies"] },
  { label: "Human judgment on unusual or emotional calls", values: ["Warm-transfers to your team", true] },
  { label: "Free trial", values: ["7 days", "Varies"] },
];

const SECTIONS = [
  {
    title: "A flat price instead of a meter that's always running",
    body: "Live virtual receptionist services put a real person on your calls and usually bill by the minute or by the call, so a busy month costs more. Missed No More Pro plans are a flat monthly price with a hard cap on AI minutes. If you reach the cap, calls forward to your phone instead of creating overage charges.",
  },
  {
    title: "Quoting and booking without a script to maintain",
    body: "A live receptionist can only quote what's on the sheet you gave them. Missed No More Pro computes each quote from the rates, travel zones, and after-hours fees you approve, using real driving distance, and reads back one exact total. It books into open times on your Google Calendar, texts the customer a confirmation, and logs the call in the built-in CRM with a transcript.",
  },
  {
    title: "Where a live virtual receptionist is the better fit",
    body: "Some calls need a person: a caller who is upset, a situation nobody planned for, or a business where nearly every call takes judgment. Missed No More Pro warm-transfers those calls to your team with a quick briefing, but if most of your calls need a human from the first word, a live virtual receptionist service may suit you better. Pricing and features vary by provider, so compare current plans directly.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "What is the difference between an AI receptionist and a virtual receptionist?",
    a: "A virtual receptionist is usually a live person working remotely who answers your calls. An AI receptionist is a voice AI that answers instead. Missed No More Pro answers 24/7, quotes exact prices from your rates, books appointments, and logs every call, for a flat monthly price.",
  },
  {
    q: "Is an AI receptionist cheaper than a virtual receptionist?",
    a: "Usually, for small service businesses. Missed No More Pro starts at $50 per month for 200 AI minutes on a flat plan with a hard cap. Live virtual receptionist services are typically billed per minute or per call, so cost rises with call volume. Check each provider's current pricing before deciding.",
  },
  {
    q: "Can an AI receptionist replace a virtual receptionist?",
    a: "For businesses whose calls are mostly booking, pricing, and common questions, often yes. For businesses where most calls need a person's judgment, a live service may still fit better. Missed No More Pro can warm-transfer the calls that need a person to your team.",
  },
  {
    q: "Will callers know they're talking to an AI?",
    a: "It speaks in a natural voice and answers in your business's name, but it never claims to be human. If a caller asks, it tells them it is an AI assistant.",
  },
];

export default function VsVirtualReceptionistPage() {
  return (
    <ComparisonPage
      path={PATH}
      breadcrumb="vs. Virtual Receptionist"
      kicker="AI vs. virtual receptionist"
      h1="AI Receptionist vs. Virtual Receptionist"
      subhead="Live virtual receptionist services put a real person on your calls, usually billed by the minute or call. An AI receptionist answers every call for a flat monthly price and can quote and book on its own. Here's how to choose."
      comparisonCols={COLS}
      comparisonRows={ROWS}
      comparisonNote="Live virtual receptionist pricing and features vary widely by provider and plan. Confirm current details with any provider you're considering."
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="AI vs. virtual receptionist: questions"
    />
  );
}
