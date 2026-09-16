import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-locksmiths";
const TITLE = "AI Receptionist for Locksmiths | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for locksmiths. Answers lockout calls 24/7, gives one exact total with your after-hours fee, and dispatches fast.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for locksmiths",
    "locksmith answering service",
    "AI answering service for locksmiths",
    "24/7 locksmith call answering",
    "locksmith virtual receptionist",
  ],
});

const CALL_TYPES = [
  "House and apartment lockouts",
  "Car lockouts in driveways and parking lots",
  "Rekeying after a move-in or lost keys",
  "Lock changes quoted as your labor plus the hardware",
  "Business lockouts and lock repairs",
  "Callers outside your service area, answered before a wasted trip",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7, including late-night lockouts", values: [true, true, false] },
  { label: "Gives one exact total, after-hours fee included", values: [true, false, false] },
  { label: "Texts the caller an arrival estimate", values: [true, false, false] },
  { label: "Checks the caller is inside your service area", values: [true, "Maybe", false] },
  { label: "Quotes lock changes as your labor plus hardware", values: [true, false, false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "A real total builds trust on the first call",
    body: "Plenty of people who call a locksmith have heard about a low phone price that grew once the truck showed up. Missed No More Pro gives the caller one exact total computed from your approved rates, a travel fee based on real driving distance, and your after-hours fee when it applies. Anything that depends on the lock, like a high-security lock, is mentioned up front. The AI never gives a vague starting price or invents a number.",
  },
  {
    title: "Lockouts dispatched in one call",
    body: "Someone locked out at night wants to know help is coming. The AI takes the location, even cross streets or a nearby landmark when they're in a parking lot, plus the best callback number, and texts your on-call locksmith right away. The caller gets a text confirming help is on the way, with an estimated arrival time based on how many jobs are already on today's board.",
  },
  {
    title: "Rekeys and lock changes booked",
    body: "Not every call is an emergency. Rekeys, lock changes, and business jobs get booked into open slots on your Google Calendar, only inside your hours, with a confirmation text and a reminder. Lock changes are quoted as your labor plus the cost of the hardware.",
  },
  {
    title: "Only calls you can actually take",
    body: "The AI checks each caller's driving distance from your shop against the service radius you set, so out-of-area callers hear it on the call instead of waiting on a callback. Sales pitches and robocalls are screened out, and every real lead lands in the built-in CRM with a transcript and summary.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI answering service handle locksmith lockout calls?",
    a: "Yes. Missed No More Pro answers 24/7, captures the location and callback number, gives the caller an exact total, texts your on-call locksmith, and texts the caller a confirmation with an estimated arrival time.",
  },
  {
    q: "How does it quote a lockout?",
    a: "From the rates you approve: your lockout price, a travel fee based on real driving distance, and your after-hours fee when the call comes in during that window. The caller hears one exact total, and charges that depend on the lock are mentioned as possible additions.",
  },
  {
    q: "What about jobs I can't price over the phone?",
    a: "The AI only quotes services you've given it a price for. For anything else, it captures what the caller needs and a callback number and alerts your team, instead of guessing.",
  },
  {
    q: "Will it take calls from outside my area?",
    a: "It checks the caller's driving distance against the service radius you set. Callers outside it are told on the call, and their details are still saved in case you want to follow up.",
  },
  {
    q: "How much does a locksmith answering service cost compared to this?",
    a: "Missed No More Pro plans start at $50 per month for 200 AI minutes, with a 7-day free trial. Human answering services commonly run $300 or more per month and usually just take a message. Every plan is a hard cap, so there are no overage charges.",
  },
];

export default function AiReceptionistForLocksmithsPage() {
  return (
    <TradePage
      path={PATH}
      trade="locksmith"
      audience="Locksmiths and locksmith companies"
      kicker="For locksmiths"
      h1="AI Receptionist for Locksmiths"
      subhead="Lockouts happen at midnight, in parking lots, and in the rain. Answer every call, give the caller one exact total from your own rates, and get the job moving before they call the next locksmith."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      quoteExample={{
        title: "A car lockout at 11 PM",
        body: "A driver locked out in a parking lot 12 miles away calls late at night. The AI applies your zone and after-hours rules and reads back one exact total, so the caller knows the price before you roll.",
        lines: [
          { label: "Car lockout", amount: "$95" },
          { label: "Travel fee, zone 2 (10-20 miles)", amount: "$25" },
          { label: "After-hours service", amount: "$50" },
          { label: "High-security lock, if needed", amount: "may add $40", muted: true },
        ],
        total: "$170",
        note: "Illustrative rates for this example only. Your prices, zones, and fees are whatever you set. Conditional charges are mentioned to the caller, never silently added.",
      }}
      faqItems={FAQS}
      faqTitle="AI receptionist for locksmiths: questions"
    />
  );
}
