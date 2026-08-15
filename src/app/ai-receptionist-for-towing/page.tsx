import type { Metadata } from "next";

import { ComparisonPage } from "@/components/landing/comparison-page";
import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";

const TITLE = "AI Receptionist for Towing & Roadside Assistance";
const DESCRIPTION =
  "An AI receptionist built for towing and roadside assistance — answers 24/7, quotes the tow by hook fee plus per-mile rate, and books the job while you're on the road.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/ai-receptionist-for-towing" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/ai-receptionist-for-towing" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const COLS = ["Missed No More Pro", "Voicemail", "Answering service"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7, including 2am breakdowns", values: [true, false, true] },
  { label: "Computes the tow price — hook fee + per-mile", values: [true, false, false] },
  { label: "Finds the nearest shop when the caller has no drop-off in mind", values: [true, false, false] },
  { label: "Books the dispatch and texts staff instantly", values: [true, false, false] },
  { label: "Monthly cost", values: ["from $99", "$0", "$300+"] },
];

const SECTIONS = [
  {
    title: "Built on a real roadside-assistance business",
    body: "Missed No More Pro didn't start as generic software — it runs live today on a real roadside-assistance business, answering calls, quoting tows and jumps to the dollar, booking jobs, and texting customers back. The towing-specific pricing logic (dispatch zone, hook fee, per-mile rate, free tow miles) is the same engine that business uses on every real call.",
  },
  {
    title: "Quotes a tow the way you actually price one",
    body: "Most AI receptionists can promise to \"book an appointment.\" Ours computes the real number: your dispatch-zone fee, a hook fee, a per-mile rate for the tow distance, minus any free miles you offer — server-side, from your own rates, never guessed. If the caller doesn't know where to tow the car, the AI can look up nearby shops and price the tow to whichever one they pick.",
  },
  {
    title: "Answers from the truck, not just the front desk",
    body: "A 2am breakdown call doesn't wait for business hours. Missed No More Pro answers every call — day, night, weekend — captures the vehicle and location, quotes the job, and gets it on your board while you're still driving the last tow.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can it quote a tow by mileage?",
    a: "Yes. The pricing engine computes tow jobs as a dispatch-zone fee plus a hook fee plus a per-mile rate for the tow distance (minus any free miles you set) — using real driving distance, not a flat guess.",
  },
  {
    q: "What if the caller doesn't know where to tow the car?",
    a: "The AI can find nearby shops — a mechanic, tire shop, body shop, dealership, or gas station — and price the tow to whichever one the caller picks, using real driving-distance ranking.",
  },
  {
    q: "Does it work with my existing dispatch board?",
    a: "Missed No More Pro has its own built-in dispatch board and CRM, so nothing needs to be re-typed — every booked tow becomes a job with status and tech assignment automatically. If you want it feeding an outside system too, the Professional+ plans include a Zapier/Make webhook you can wire up.",
  },
];

export default function AiReceptionistForTowingPage() {
  return (
    <ComparisonPage
      kicker="For Towing & Roadside Assistance"
      h1="AI Receptionist for Towing & Roadside Assistance"
      subhead="Answer every call from the truck, quote the tow to the exact mile, and book the job — without pulling over."
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="Towing & roadside — questions"
    />
  );
}
