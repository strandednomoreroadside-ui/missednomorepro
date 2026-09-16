import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-garage-door-repair";
const TITLE = "AI Receptionist for Garage Door Repair | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for garage door companies. Answers stuck-door calls 24/7, quotes springs and openers from your rates, and books jobs.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for garage door companies",
    "garage door answering service",
    "AI answering service for garage door repair",
    "garage door company virtual receptionist",
    "24/7 garage door call answering",
  ],
});

const CALL_TYPES = [
  "Broken springs and doors that won't open",
  "Cars stuck in the garage that need someone now",
  "Opener installs quoted as your labor plus the opener",
  "Off-track doors, snapped cables, and worn rollers",
  "New door and replacement inquiries captured for an estimate",
  "Tune-up and maintenance bookings",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7, including weekend breakdowns", values: [true, true, false] },
  { label: "Quotes spring and cable repairs from your rates", values: [true, false, false] },
  { label: "Quotes opener installs as your labor plus the opener", values: [true, false, false] },
  { label: "Texts the customer an arrival estimate on urgent calls", values: [true, false, false] },
  { label: "Books tune-ups into open slots on your calendar", values: [true, "Maybe", false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "A stuck car gets a truck, not a voicemail",
    body: "When a spring snaps and the car is trapped inside, the customer calls whoever answers first. Missed No More Pro answers in your company's name, takes the address and callback number, and texts your on-call tech right away. The customer gets a text confirming help is coming, with an estimated arrival time based on how many jobs are already on today's board.",
  },
  {
    title: "Springs and openers, priced exactly",
    body: "Set flat rates for the repairs you quote by phone, like torsion spring replacement, cables, and rollers, plus travel zones by driving distance and an after-hours fee. The AI reads back one exact total. Opener installs are quoted as your labor plus the cost of the opener, and anything that depends on the door, like a second spring or an oversized door, is mentioned up front instead of added later.",
  },
  {
    title: "New door leads, captured and booked",
    body: "Door replacements are usually quoted in person, so the AI captures what the customer wants and books the estimate visit into an open slot on your Google Calendar, with a confirmation text and a reminder. Customers can text a photo of their current door to your Missed No More Pro number, and it's saved on their record in the CRM.",
  },
  {
    title: "Every job tracked after the call",
    body: "Each call is logged with a transcript, a summary, and the quote the customer heard. Completed jobs can trigger a review request text, and on the Professional plan a dispatch board shows the day's jobs so you can assign them to your techs.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI receptionist quote garage door spring repair?",
    a: "Yes, from rates you approve. Missed No More Pro computes the quote from your flat spring and repair prices, a travel fee based on real driving distance, and your after-hours fee when it applies, then reads back one exact total.",
  },
  {
    q: "What happens when a customer's car is stuck in the garage?",
    a: "The AI treats it as urgent. It captures the address and callback number, texts your on-call technician immediately, and texts the customer a confirmation with an estimated arrival time. You can also have it warm-transfer those calls to your team.",
  },
  {
    q: "How does it quote a new opener?",
    a: "As your installation price plus the cost of the opener, with travel and after-hours fees added from your rules. If you only quote openers after seeing the door, it captures the details for your team instead.",
  },
  {
    q: "Can I keep my business phone number?",
    a: "Yes. Forward your existing number to the number we give you, either for every call or only when you don't answer. You can also claim a new local number from your dashboard.",
  },
  {
    q: "How much does a garage door answering service cost compared to this?",
    a: "Missed No More Pro plans start at $50 per month for 200 AI minutes, with a 7-day free trial. Human answering services commonly run $300 or more per month and usually just take a message. Every plan is a hard cap, so there are no overage charges.",
  },
];

export default function AiReceptionistForGarageDoorRepairPage() {
  return (
    <TradePage
      path={PATH}
      trade="garage door"
      audience="Garage door repair and installation companies"
      kicker="For garage door companies"
      h1="AI Receptionist for Garage Door Repair"
      subhead="A broken spring doesn't wait until Monday. Answer every call, quote the repair from your own rates, and get a tech moving or the visit booked while you're under another door."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      quoteExample={{
        title: "A broken spring, quoted on the first call",
        body: "A homeowner 18 miles from your shop calls on a weekday morning because the door won't lift. The AI applies your zone 2 travel fee, reads back the total, and mentions that a second spring would add to it.",
        lines: [
          { label: "Torsion spring replacement", amount: "$249" },
          { label: "Travel fee, zone 2 (15-30 miles)", amount: "$35" },
          { label: "Second spring, if needed", amount: "may add $89", muted: true },
        ],
        total: "$284",
        note: "Illustrative rates for this example only. Your prices, zones, and fees are whatever you set. Conditional charges are mentioned to the caller, never silently added.",
      }}
      faqItems={FAQS}
      faqTitle="AI receptionist for garage door companies: questions"
    />
  );
}
