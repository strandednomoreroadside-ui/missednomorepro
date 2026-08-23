import type { Metadata } from "next";

import { ComparisonPage } from "@/components/landing/comparison-page";
import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";

const TITLE = "Missed No More Pro vs. Sameday AI";
const DESCRIPTION =
  "How Missed No More Pro compares to Sameday AI for home-service AI receptionists: pricing, computed quoting, CRM, and what each product actually claims.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/sameday" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/sameday" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const COLS = ["Missed No More Pro", "Sameday AI"];
const ROWS: ComparisonRow[] = [
  { label: "Entry price", values: ["from $79/mo", "$449/mo (Pro plan)"] },
  { label: "Free trial before you pay", values: ["7 days", "Not publicly advertised"] },
  { label: "Built-in CRM — contacts, leads, pipeline, timeline", values: [true, "Not publicly advertised"] },
  { label: "Hard cap billing — no surprise overage", values: [true, "Not publicly advertised"] },
  { label: "Priced for solo operators and small crews", values: [true, "Not publicly advertised"] },
];

const SECTIONS = [
  {
    title: "Built for a smaller crew and a smaller budget",
    body: "Sameday AI's Pro plan is priced well above our entry price. Missed No More Pro starts at $79/mo with a 7-day free trial, aimed at solo operators and small crews (1-15 people) who want to prove the AI recovers a job before committing to enterprise-scale spend.",
  },
  {
    title: "Hard caps, not surprise bills",
    body: "Every Missed No More Pro plan is a hard cap: if you hit your included minutes, calls forward straight to your phone instead of racking up an overage charge. We can't independently confirm how Sameday AI bills past its included usage as we write this — check directly with them.",
  },
  {
    title: "Where Sameday AI may have the edge",
    body: "Sameday AI is squarely built for home-service trades and, at its price point, likely includes more done-for-you setup and support than a self-serve $79/mo plan does. We're earlier and smaller — if you need white-glove onboarding and have the budget for it, it's worth a look. We're not able to independently verify every detail of Sameday's current plans as we write this — pricing and features change, so confirm directly with them before deciding.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Is Missed No More Pro a Sameday AI alternative?",
    a: "For solo operators and small crews, yes — both answer calls for home-service trades, but Missed No More Pro starts at roughly a fifth of Sameday AI's stated Pro price, with a 7-day free trial and a hard usage cap instead of an enterprise-scale commitment.",
  },
  {
    q: "Is Missed No More Pro cheaper than Sameday AI?",
    a: "Based on Sameday AI's publicly stated $449/mo Pro plan, yes — Missed No More Pro starts at $79/mo. Confirm current pricing directly with Sameday AI, since plans change.",
  },
  {
    q: "Can I switch from Sameday AI to Missed No More Pro?",
    a: "Yes — our setup wizard walks you through hours, services, pricing, and your greeting in about 15 minutes, and you can upload an existing price sheet for us to extract instead of typing it all in by hand.",
  },
];

const NOTE =
  "Sameday AI's pricing and features above reflect the most recent publicly available information we had on hand — we were not able to re-verify them live while building this page, so confirm current details directly with Sameday AI before deciding. Rows marked \"Not publicly advertised\" mean we found no public claim either way, not that the feature doesn't exist.";

export default function VsSamedayPage() {
  return (
    <ComparisonPage
      kicker="Missed No More Pro vs. Sameday AI"
      h1="Missed No More Pro vs. Sameday AI"
      subhead="Sameday AI is built for home-service trades at an enterprise-leaning price. Missed No More Pro is the same idea — answer, quote, book — sized and priced for a 1–15 person crew."
      comparisonCols={COLS}
      comparisonRows={ROWS}
      comparisonNote={NOTE}
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="Sameday AI vs. Missed No More Pro — questions"
    />
  );
}
