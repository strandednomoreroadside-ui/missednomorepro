import type { Metadata } from "next";

import { ComparisonPage } from "@/components/landing/comparison-page";
import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";

const TITLE = "Missed No More Pro vs. Rosie";
const DESCRIPTION =
  "How Missed No More Pro compares to Rosie for AI phone answering: entry price, computed quoting, CRM, and what each product actually claims.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/rosie" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/rosie" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const COLS = ["Missed No More Pro", "Rosie"];
const ROWS: ComparisonRow[] = [
  { label: "Entry price", values: ["from $79/mo", "from $49/mo"] },
  {
    label: "Computes an exact price from your rates + real driving distance",
    values: [true, "Not publicly advertised"],
  },
  { label: "Built-in CRM — contacts, leads, pipeline, timeline", values: [true, "Not publicly advertised"] },
  { label: "Booking, cancel & reschedule on your calendar", values: [true, "Not publicly advertised"] },
  { label: "Every plan a hard cap — no surprise overage", values: [true, "Not publicly advertised"] },
  { label: "Free trial before you pay", values: ["7 days", "Not publicly advertised"] },
];

const SECTIONS = [
  {
    title: "Rosie starts cheaper — for a narrower job",
    body: "Rosie's entry tier is priced lower than ours, and it's built to do one thing well: answer the phone. Missed No More Pro costs more starting out because it's not just an answering line — it's a computed quoting engine, a booking calendar, and a CRM built into the same subscription, so a caller doesn't just get answered, they get quoted the exact price and booked.",
  },
  {
    title: "The one thing we haven't found any receptionist tool claim",
    body: "Nowhere in Rosie's public materials do we see a claim that it computes an exact price for a job from your own rate sheet and real driving distance. Missed No More Pro's pricing engine does exactly that — the AI never invents a number, it reads it off a server-side calculation from rules you approve, then reads it back on the call.",
  },
  {
    title: "Where Rosie may have the edge",
    body: "Rosie has been in market longer than we have, and if all you need is a lower-cost line that answers and takes a message, its lighter entry price may fit better. We're not able to independently verify every detail of Rosie's current plans as we write this — pricing and features change, so confirm directly with Rosie before deciding.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Is Missed No More Pro a Rosie alternative?",
    a: "Yes, if you want more than call answering — Missed No More Pro adds a computed quoting engine, calendar booking, and a full CRM in the same subscription, not just a line that answers and takes a message.",
  },
  {
    q: "Is Missed No More Pro cheaper than Rosie?",
    a: "No — Rosie's stated entry price is lower than ours. We cost more starting out because the plan includes a quoting engine, booking, and CRM built in, not just call answering. If you only need calls answered, compare both directly against what you need.",
  },
  {
    q: "Can I switch from Rosie to Missed No More Pro?",
    a: "Yes — our setup wizard walks you through hours, services, pricing, and your greeting in about 15 minutes, and you can upload an existing price sheet for us to extract instead of typing it all in by hand.",
  },
];

const NOTE =
  "Rosie's pricing and features above reflect the most recent publicly available information we had on hand — we were not able to re-verify them live while building this page, so confirm current details directly with Rosie before deciding. Rows marked \"Not publicly advertised\" mean we found no public claim either way, not that the feature doesn't exist.";

export default function VsRosiePage() {
  return (
    <ComparisonPage
      kicker="Missed No More Pro vs. Rosie"
      h1="Missed No More Pro vs. Rosie"
      subhead="Rosie answers the phone. Missed No More Pro answers the phone, quotes the exact price from your own rates, books the job, and keeps the CRM — all in one subscription."
      comparisonCols={COLS}
      comparisonRows={ROWS}
      comparisonNote={NOTE}
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="Rosie vs. Missed No More Pro — questions"
    />
  );
}
