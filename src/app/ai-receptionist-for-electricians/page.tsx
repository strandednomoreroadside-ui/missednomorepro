import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-electricians";
const TITLE = "AI Receptionist for Electricians | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for electricians. Answers every call 24/7, quotes outlets, fans, and breakers from your rates, and books the job.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for electricians",
    "electrician answering service",
    "AI answering service for electrical contractors",
    "electrical contractor virtual receptionist",
    "24/7 electrician answering service",
  ],
});

const CALL_TYPES = [
  "Outlet, switch, and light fixture installs",
  "Ceiling fan installation quotes",
  "Breaker replacements and breakers that keep tripping",
  "Flickering lights and partial power loss",
  "Panel upgrades and rewiring captured for an on-site estimate",
  "Permit, licensing, and warranty questions",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7 while your hands are in a panel", values: [true, true, false] },
  { label: "Quotes outlets, fixtures, fans, and breakers from your rates", values: [true, false, false] },
  { label: "Captures panel upgrades with details for an estimate", values: [true, "Message only", false] },
  { label: "Gives your approved safety guidance word for word", values: [true, "Maybe", false] },
  { label: "Books the visit into open slots on your calendar", values: [true, "Maybe", false] },
  { label: "Screens out spam and robocalls", values: [true, "Maybe", false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "Small jobs quoted, big jobs qualified",
    body: "Most electrical calls fall into two groups: small jobs you can price over the phone and bigger projects you need to see first. Missed No More Pro quotes the first group exactly from your rates, like outlet installs, ceiling fans, light fixtures, and breaker replacements, with a travel fee by driving distance. For panel upgrades, rewiring, and other work you price on site, it captures what the customer needs and the best callback number so your team can schedule the estimate. It never invents a price.",
  },
  {
    title: "Safety calls handled the way you would",
    body: "When a caller reports sparking, a burning smell, or a breaker that won't reset, you decide what they should hear. Add your safety guidance as an answer the AI uses word for word, then have it treat the call as urgent: it texts your on-call electrician right away, texts the customer a confirmation with an estimated arrival time, or warm-transfers the caller to someone on your team.",
  },
  {
    title: "Permits and add-on charges said out loud",
    body: "Charges that depend on the job, like attic access or a city permit when one is required, are mentioned to the caller as possible additions instead of silently rolled into the total. After-hours fees are added automatically when a call comes in during the window you set. The customer hears the same rules your office would give them.",
  },
  {
    title: "Every lead in one place",
    body: "Each call is logged in the built-in CRM with a transcript, a summary, and the quote the caller heard. On the Growth plan and up, leads move through a pipeline from new to quoted to booked. Completed jobs can trigger a review request text. On the Professional plan, a dispatch board shows the day's jobs and lets you assign them to your electricians.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI receptionist quote electrical work?",
    a: "Yes, for the jobs you choose to price by phone. Missed No More Pro computes the quote from your approved rates for work like outlet installs, ceiling fans, fixtures, and breaker replacements, adds your travel and after-hours fees, and reads back an exact total. Work you only price on site is captured for an estimate instead.",
  },
  {
    q: "What does it do with a panel upgrade or rewiring inquiry?",
    a: "It captures what the customer needs, the property address, and the best callback number, then alerts your team so someone can schedule an on-site estimate. It doesn't quote work you haven't given it a price for.",
  },
  {
    q: "What if a caller reports sparks or a burning smell?",
    a: "The AI gives the safety guidance you've approved, word for word, and treats the call as urgent. Depending on your settings, it texts your on-call electrician and sends the customer an arrival estimate, or warm-transfers the call to your team.",
  },
  {
    q: "Can I keep my business phone number?",
    a: "Yes. Forward your existing number to the number we give you, either for every call or only when you don't answer. You can also claim a new local number from your dashboard.",
  },
  {
    q: "How much does an electrician answering service cost compared to this?",
    a: "Missed No More Pro plans start at $50 per month for 200 AI minutes, with a 7-day free trial. Human answering services commonly run $300 or more per month and usually just take a message. Every plan is a hard cap, so there are no overage charges.",
  },
];

export default function AiReceptionistForElectriciansPage() {
  return (
    <TradePage
      path={PATH}
      trade="electrical"
      audience="Electricians and electrical contractors"
      kicker="For electrical contractors"
      h1="AI Receptionist for Electricians"
      subhead="You can't answer the phone with your hands in a panel. Answer every call, quote the small jobs exactly, capture the big ones for an estimate, and book the visit."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      quoteExample={{
        title: "A ceiling fan install, quoted with the fine print",
        body: "A homeowner 30 miles out calls during business hours to get a ceiling fan installed. The AI applies your zone 2 travel fee and reads back the total, then tells them attic access or a permit could add to it, so nobody is surprised on the invoice.",
        lines: [
          { label: "Ceiling fan installation", amount: "$229" },
          { label: "Travel fee, zone 2 (20-40 miles)", amount: "$29" },
          { label: "Attic access, if needed", amount: "may add $45", muted: true },
          { label: "City permit, if required", amount: "may add $95", muted: true },
        ],
        total: "$258",
        note: "Sample rates from our live demo line. Your prices, zones, and fees are whatever you set. Conditional charges are mentioned to the caller, never silently added.",
      }}
      demoPrompts={[
        "How much to install a ceiling fan?",
        "My breaker keeps tripping. Can someone take a look?",
        "Do you do panel upgrades?",
      ]}
      faqItems={FAQS}
      faqTitle="AI receptionist for electricians: questions"
    />
  );
}
