import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-roofers";
const TITLE = "AI Receptionist for Roofing Companies | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for roofers. Answers storm and leak calls 24/7, books roof inspections, and captures every replacement lead.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for roofers",
    "roofing answering service",
    "AI answering service for roofing companies",
    "roofing virtual receptionist",
    "storm damage call answering",
  ],
});

const CALL_TYPES = [
  "Active roof leaks that need a tarp or emergency repair",
  "Storm, hail, and wind damage inspection requests",
  "Roof inspection and estimate appointments",
  "Small repairs like missing shingles or flashing",
  "Full replacement leads captured for an on-site estimate",
  "Insurance claim, warranty, and financing questions",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers every call after a storm, day or night", values: [true, true, false] },
  { label: "Books inspections into open slots on your calendar", values: [true, "Maybe", false] },
  { label: "Quotes the jobs you price by phone, like tarping", values: [true, false, false] },
  { label: "Captures replacement leads for an on-site estimate", values: [true, "Message only", false] },
  { label: "Customer photos of the damage saved to the lead", values: [true, false, false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "Storm days without the voicemail pileup",
    body: "After hail or high winds, roofing phones ring all day while every crew is already booked. Missed No More Pro answers each call in your company's name, takes the address, what the homeowner is seeing, and the best callback number, and saves the full call transcript. When water is coming in, it treats the call as urgent and texts your on-call crew lead right away.",
  },
  {
    title: "Inspections booked, estimates set up",
    body: "Most roofing work is priced after someone climbs the ladder, so the AI does what your office would: it books the inspection into an open slot on your Google Calendar, inside your hours, and texts the homeowner a confirmation and a reminder. Replacement and insurance-claim leads are captured with their details, so your estimator walks in already knowing the story.",
  },
  {
    title: "Exact prices for the jobs you do quote by phone",
    body: "If you have set prices for things like an inspection or emergency tarping, add them with your travel zones and after-hours fee, and the AI reads back one exact total computed from those rules. Charges that depend on the roof, like a steep pitch or a third story, are mentioned to the caller instead of silently added. It never makes up a number for work you haven't priced.",
  },
  {
    title: "See the damage before you drive out",
    body: "Homeowners can text photos of the leak or storm damage to your Missed No More Pro number, including in reply to a confirmation text. Every photo lands on that customer's record in the built-in CRM next to the call summary, so you can size up the job before the inspection.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI receptionist handle roofing calls after a storm?",
    a: "Yes. Missed No More Pro answers every call in your company's name, captures the address, the damage, and a callback number, and books inspections into open calendar slots. Urgent leaks are flagged and texted to your on-call crew lead right away.",
  },
  {
    q: "Can it give roofing estimates over the phone?",
    a: "Only for the jobs you choose to price by phone, like an inspection fee or emergency tarping, computed from your approved rates. Full replacements and repairs you price on site are captured for an inspection instead. The AI never guesses a price.",
  },
  {
    q: "Can it book roof inspections?",
    a: "Yes. Connect Google Calendar and it books inspections only into open times inside your business hours, without double-booking, then texts a confirmation and a reminder. Homeowners can call back to cancel or reschedule.",
  },
  {
    q: "Does it integrate with roofing CRMs like JobNimbus or AccuLynx?",
    a: "Not directly today. Missed No More Pro includes its own CRM and lead pipeline. On the Professional plan, Zapier and Make webhooks can send new leads, bookings, completed jobs, and payments to other tools.",
  },
  {
    q: "How much does a roofing answering service cost compared to this?",
    a: "Missed No More Pro plans start at $50 per month for 200 AI minutes, with a 7-day free trial. Human answering services commonly run $300 or more per month and usually just take a message. Every plan is a hard cap, so there are no overage charges.",
  },
];

export default function AiReceptionistForRoofersPage() {
  return (
    <TradePage
      path={PATH}
      trade="roofing"
      audience="Roofers and roofing contractors"
      kicker="For roofing contractors"
      h1="AI Receptionist for Roofing Companies"
      subhead="When a storm rolls through, the phone doesn't stop. Answer every call, book the inspections, and capture the details your estimator needs while your crews are on the roof."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      quoteExample={{
        title: "An emergency tarp after a storm, quoted at night",
        body: "A homeowner 20 miles out calls at 10 PM with water coming through the ceiling. The AI applies your zone and after-hours rules, reads back one exact total, and tells them a steep roof could add to it.",
        lines: [
          { label: "Emergency roof tarping", amount: "$350" },
          { label: "Travel fee, zone 2 (15-30 miles)", amount: "$40" },
          { label: "After-hours service", amount: "$100" },
          { label: "Steep or high roof, if needed", amount: "may add $75", muted: true },
        ],
        total: "$490",
        note: "Illustrative rates for this example only. Your prices, zones, and fees are whatever you set. Conditional charges are mentioned to the caller, never silently added.",
      }}
      faqItems={FAQS}
      faqTitle="AI receptionist for roofers: questions"
    />
  );
}
