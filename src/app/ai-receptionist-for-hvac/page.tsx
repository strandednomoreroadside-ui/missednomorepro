import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-hvac";
const TITLE = "AI Receptionist for HVAC Companies | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for HVAC companies. Answers no-heat and no-AC calls 24/7, quotes repairs and tune-ups exactly, and books the visit.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for HVAC",
    "HVAC answering service",
    "AI answering service for HVAC companies",
    "HVAC virtual receptionist",
    "after-hours HVAC answering service",
    "HVAC call answering",
  ],
});

const CALL_TYPES = [
  "No-heat and no-AC calls that need someone out now",
  "Furnace and AC tune-up bookings",
  "Repair quotes for AC, furnace, heat pump, and ductwork",
  "Thermostat installs quoted as your fee plus the thermostat",
  "System replacement inquiries captured for an in-home estimate",
  "Maintenance plan, financing, warranty, and brand questions",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7, including the first heat wave and cold snap", values: [true, true, false] },
  { label: "Quotes repairs and tune-ups from your own rates", values: [true, false, false] },
  { label: "Adds your after-hours fee automatically", values: [true, false, false] },
  { label: "Books tune-ups into open slots on your calendar", values: [true, "Maybe", false] },
  { label: "Texts the homeowner a confirmation", values: [true, false, false] },
  { label: "Logs every caller, transcript, and quote in a CRM", values: [true, false, false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "Built for the days the weather turns",
    body: "HVAC phones don't ring evenly. The first hot week of summer and the first cold night of fall bring a flood of no-cool and no-heat calls, usually while every tech is already on a job. Missed No More Pro answers every call in your company's name, day or night, so the homeowner talks to someone right away instead of hitting voicemail and calling the next contractor on the list.",
  },
  {
    title: "Quotes from your price list, never a guess",
    body: "You set flat rates for the work you quote by phone, like AC repair, furnace repair, and seasonal tune-ups, plus travel zones by driving distance and an after-hours fee for the hours you choose. The AI reads back an exact total computed from those rules. Installs like a new thermostat are quoted as your fee plus the part. Anything you only price on site, like a full system replacement, gets captured with the details so your team can schedule the assessment. The AI never invents a number.",
  },
  {
    title: "Urgent calls dispatched, routine calls booked",
    body: "When a caller needs help now, the AI takes the address and callback number, texts your on-call tech right away, and texts the homeowner a confirmation with an estimated arrival time. Tune-ups and non-urgent repairs get booked into open slots on your Google Calendar, only inside your hours, with a text confirmation and a reminder before the visit. Callers who want a person can be warm-transferred to your team.",
  },
  {
    title: "Your safety answers, word for word",
    body: "Add your own answers to the questions HVAC callers ask, from maintenance plans and financing to what to do if they smell gas, and the AI gives your approved wording instead of improvising. It can also follow up on completed jobs with review requests and maintenance reminder texts so this year's tune-up customer books again next season.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI receptionist quote HVAC repairs?",
    a: "Yes, from rates you approve. Missed No More Pro computes each quote from your flat repair and tune-up prices, a travel fee based on real driving distance, and your after-hours fee when the call falls in that window. Jobs you only price on site, like system replacements, are captured for an in-home estimate instead of quoted.",
  },
  {
    q: "What happens when someone calls with no heat at night?",
    a: "The AI treats it as urgent. It captures the address and callback number, texts your on-call technician immediately, and texts the homeowner a confirmation with an estimated arrival time. If you prefer, it can warm-transfer the caller to someone on your team instead.",
  },
  {
    q: "Can it book furnace and AC tune-ups?",
    a: "Yes. Connect Google Calendar and it books tune-ups only into open slots inside your business hours, never double-books, and texts a confirmation and a reminder. Customers can also call back to cancel or reschedule.",
  },
  {
    q: "Does it integrate with ServiceTitan or Housecall Pro?",
    a: "Not directly today. Missed No More Pro includes its own CRM, lead pipeline, and dispatch board, so most small HVAC teams don't need another system. On the Professional plan, Zapier and Make webhooks can send new leads, bookings, completed jobs, and payments to other tools.",
  },
  {
    q: "How much does an HVAC answering service cost compared to this?",
    a: "Missed No More Pro plans start at $50 per month for 200 AI minutes, with a 7-day free trial. Human answering services commonly run $300 or more per month and usually take a message rather than quoting or booking. Every plan is a hard cap, so there are no overage charges.",
  },
];

export default function AiReceptionistForHvacPage() {
  return (
    <TradePage
      path={PATH}
      trade="HVAC"
      audience="HVAC contractors and heating and cooling companies"
      kicker="For HVAC contractors"
      h1="AI Receptionist for HVAC Companies"
      subhead="Answer every no-heat and no-AC call, quote the repair or tune-up to the dollar from your own rates, and book the visit while your techs are on a roof or in an attic."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      quoteExample={{
        title: "An after-hours AC repair, quoted on the call",
        body: "A homeowner 25 miles out calls at 8 PM because the AC stopped cooling. The AI checks their driving distance, applies your zone and after-hours rules, and reads back one exact total before anyone rolls a truck.",
        lines: [
          { label: "AC repair (flat rate)", amount: "$249" },
          { label: "Travel fee, zone 2 (20-40 miles)", amount: "$29" },
          { label: "After-hours service (7 PM - 7 AM)", amount: "$99" },
          { label: "Attic access, if needed", amount: "may add $45", muted: true },
        ],
        total: "$377",
        note: "Sample rates from our live demo line. Your prices, zones, and fees are whatever you set. Conditional charges like attic access are mentioned to the caller, never silently added.",
      }}
      demoPrompts={[
        "How much is an AC tune-up?",
        "My furnace stopped working. Can someone come out?",
        "Do you offer maintenance plans or financing?",
      ]}
      demoTip="Call after 7 PM Eastern and ask for an AC repair price to hear the after-hours fee added to the total."
      faqItems={FAQS}
      faqTitle="AI receptionist for HVAC: questions"
    />
  );
}
