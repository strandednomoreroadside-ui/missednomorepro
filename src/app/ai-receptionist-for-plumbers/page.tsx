import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-plumbers";
const TITLE = "AI Receptionist for Plumbers | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist and answering service for plumbing companies. Answers burst-pipe and clogged-drain calls 24/7, quotes jobs from your rates, and books them.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for plumbers",
    "plumbing answering service",
    "AI answering service for plumbers",
    "plumber virtual receptionist",
    "24/7 plumbing answering service",
    "after-hours plumbing call answering",
  ],
});

const CALL_TYPES = [
  "Burst pipes, active leaks, and backups that need someone now",
  "Drain cleaning and hydro jetting quotes",
  "Water heater repair calls and replacement inquiries",
  "Faucet, toilet, disposal, and sump pump jobs",
  "Leak detection appointments",
  "Callers outside your service area, answered before a wasted trip",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7, including overnight emergencies", values: [true, true, false] },
  { label: "Quotes drain, water heater, and fixture jobs from your rates", values: [true, false, false] },
  { label: "Quotes installs as your labor plus the part", values: [true, false, false] },
  { label: "Texts the customer an arrival estimate on urgent calls", values: [true, false, false] },
  { label: "Checks the caller is inside your service area", values: [true, "Maybe", false] },
  { label: "Customer photos saved to the customer record", values: [true, false, false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "Emergencies get moving, not a voicemail",
    body: "Water on the floor doesn't wait for business hours. When a caller has a burst pipe or a backed-up drain, Missed No More Pro answers in your company's name, takes the address and callback number, and texts your on-call plumber immediately. The customer gets a text confirming help is coming, with an estimated arrival time based on how many jobs are already on today's board.",
  },
  {
    title: "Flat-rate pricing, read back exactly",
    body: "Set your prices for the jobs you quote by phone, like drain cleaning, hydro jetting, water heater repair, and toilet repair, plus a travel fee by driving distance and an after-hours fee for the hours you choose. The AI reads back one exact total computed from those rules. Installs are quoted as your labor plus the cost of the part, and charges that depend on the job, like crawl space access or a permit, are mentioned to the caller instead of silently added. It never makes up a number.",
  },
  {
    title: "See the problem before you roll a truck",
    body: "Customers can text photos to your Missed No More Pro number, including in reply to a confirmation text, like the leak under the sink, the water heater's label, or the fixture they want installed. Each photo lands on that customer's record in the built-in CRM, next to the call transcript and summary, so whoever takes the job shows up with the right parts.",
  },
  {
    title: "Only real jobs, only in your area",
    body: "The AI checks each caller's driving distance from your shop against the service radius you set, so out-of-area callers get a polite answer on the call instead of a callback that goes nowhere. Spam and robocalls are screened out, and routine work gets booked into open slots on your Google Calendar with a confirmation text and a reminder.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI answering service handle plumbing emergencies?",
    a: "Yes. When a caller needs help now, the AI captures the address and callback number, texts your on-call plumber right away, and texts the customer a confirmation with an estimated arrival time. You can also have it warm-transfer emergency callers to someone on your team.",
  },
  {
    q: "How does it quote a water heater or garbage disposal install?",
    a: "However you price it. For installs you quote by phone, the AI gives your labor price plus the cost of the part, with travel and after-hours fees added from your rules. If you only quote a replacement after seeing it, the AI captures the details and a callback number for an estimate instead.",
  },
  {
    q: "Will it book jobs when my schedule is already full?",
    a: "No. It only books into open slots on your connected Google Calendar, inside the hours you set, and the system blocks double-booking. Customers can call back to cancel or reschedule, and they get a reminder text before the visit.",
  },
  {
    q: "Can customers send photos of the problem?",
    a: "Yes. Photos texted to your Missed No More Pro number, including replies to a confirmation or text-back message, are saved to that customer's record in the CRM, alongside the call transcript and summary.",
  },
  {
    q: "Does it work with Jobber or Housecall Pro?",
    a: "Not with a direct integration today. Missed No More Pro has its own CRM, lead pipeline, and dispatch board. On the Professional plan, Zapier and Make webhooks can send new leads, bookings, completed jobs, and payments to other tools.",
  },
];

export default function AiReceptionistForPlumbersPage() {
  return (
    <TradePage
      path={PATH}
      trade="plumbing"
      audience="Plumbers and plumbing companies"
      kicker="For plumbing companies"
      h1="AI Receptionist for Plumbers"
      subhead="Catch the burst pipe at 2 AM and the drain cleaning at noon. Answer every call, quote from your own rates, and dispatch or book the job without putting down the wrench."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      quoteExample={{
        title: "A disposal replacement, quoted before the truck leaves",
        body: "A homeowner 10 miles from your shop calls mid-morning about a dead garbage disposal. They're inside your free travel zone during regular hours, so the AI quotes your labor price and tells them the disposal itself is added on top.",
        lines: [
          { label: "Garbage disposal replacement (labor)", amount: "$229" },
          { label: "Travel fee, zone 1 (0-20 miles)", amount: "$0" },
          { label: "The disposal itself", amount: "plus the part", muted: true },
          { label: "Crawl space access, if needed", amount: "may add $45", muted: true },
        ],
        total: "$229 + part",
        note: "Sample rates from our live demo line. Your prices, zones, and fees are whatever you set. Conditional charges are mentioned to the caller, never silently added.",
      }}
      demoPrompts={[
        "How much do you charge for drain cleaning?",
        "My water heater is leaking. Can someone come today?",
        "What would it cost to replace my garbage disposal?",
      ]}
      demoTip="Call after 7 PM Eastern and ask for a drain cleaning price to hear the after-hours fee added to the total."
      faqItems={FAQS}
      faqTitle="AI receptionist for plumbers: questions"
    />
  );
}
