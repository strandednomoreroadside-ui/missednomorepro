import type { Metadata } from "next";

import { ComparisonPage } from "@/components/landing/comparison-page";
import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";

const TITLE = "Missed No More Pro vs. Hexnut";
const DESCRIPTION =
  "How Missed No More Pro compares to Hexnut for home-service AI receptionists: pricing, deterministic quoting, and what each product actually claims.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/hexnut" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/hexnut" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const COLS = ["Missed No More Pro", "Hexnut"];
const ROWS: ComparisonRow[] = [
  { label: "Entry price", values: ["from $99/mo", "$297/mo (Pro plan)"] },
  { label: "Computes an exact price from your rates — never invented", values: [true, false] },
  { label: "Shows the dollar revenue it saved", values: [true, false] },
  { label: "Free trial before you pay", values: ["7 days", "None stated — pay to start"] },
  { label: "White-glove, done-for-you onboarding", values: [false, true] },
  { label: "Named customer testimonials published", values: [false, true] },
];

const SECTIONS = [
  {
    title: "The one thing Hexnut's page doesn't claim",
    body: "Hexnut's site sells an AI phone team that answers, qualifies, and books — but nowhere does it promise the price it quotes is exact. Missed No More Pro's pricing engine computes every quote server-side from your own approved rates plus real driving distance, so the AI never guesses a number on a call. That's the difference between \"we'll book the appointment\" and \"we'll book it at the right price.\"",
  },
  {
    title: "Built for the smallest crews too",
    body: "Hexnut's entry point is $297/mo with no free tier. Missed No More Pro starts at $99/mo with a 7-day free trial, and every plan is a hard cap — no surprise overage charges. If you hit your limit, calls simply forward to your phone instead of racking up a bill.",
  },
  {
    title: "Where Hexnut has the edge — for now",
    body: "Hexnut has been live longer and has real, named, geo-tagged customer testimonials and a white-glove onboarding process. We're earlier — Missed No More Pro runs live today on a real roadside-assistance business, and we're onboarding a small group of founding customers now. We'd rather say that plainly than dress up a pre-launch product with proof we can't back up yet.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Is Missed No More Pro a Hexnut alternative?",
    a: "Yes. Both answer calls 24/7 for home-service trades and book appointments. The clearest difference is price accuracy: Missed No More Pro computes every quote from your own rates and real driving distance, server-side — Hexnut's page doesn't make that claim.",
  },
  {
    q: "Is Missed No More Pro cheaper than Hexnut?",
    a: "Missed No More Pro starts at $99/mo with a 7-day free trial; Hexnut's Pro plan is $297/mo with no stated free tier. Both scale up from there — check each vendor's current pricing before you decide, since plans change.",
  },
  {
    q: "Can I switch from Hexnut to Missed No More Pro?",
    a: "Yes — our setup wizard walks you through hours, services, pricing, and your greeting in about 15 minutes, and you can upload an existing price sheet for us to extract instead of typing it all in by hand.",
  },
];

const NOTE =
  "Hexnut's pricing, features, and claims above are Hexnut's own publicly stated positioning, current as of our last review — vendor offerings change, so confirm directly with them before deciding.";

export default function VsHexnutPage() {
  return (
    <ComparisonPage
      kicker="Missed No More Pro vs. Hexnut"
      h1="Missed No More Pro vs. Hexnut"
      subhead="Both answer calls 24/7 for home-service trades and book appointments. Here's where they're actually different — including the one claim neither Hexnut nor most AI receptionists make: a computed, never-invented price."
      comparisonCols={COLS}
      comparisonRows={ROWS}
      comparisonNote={NOTE}
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="Hexnut vs. Missed No More Pro — questions"
    />
  );
}
