import type { Metadata } from "next";

import { ComparisonPage } from "@/components/landing/comparison-page";
import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";

const TITLE = "Missed No More Pro vs. a Human Answering Service";
const DESCRIPTION =
  "Why local service businesses are replacing $300+/mo answering services with an AI receptionist that quotes, books, and logs every lead automatically.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/vs/answering-service" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/vs/answering-service" },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
};

const COLS = ["Missed No More Pro", "Human answering service"];
const ROWS: ComparisonRow[] = [
  { label: "Answers 24/7", values: [true, true] },
  { label: "Books jobs on your calendar", values: [true, false] },
  { label: "Quotes the exact price", values: [true, false] },
  { label: "Logs every lead in a CRM", values: [true, "Maybe"] },
  { label: "Follows up by text", values: [true, "Maybe"] },
  { label: "Never calls in sick", values: [true, true] },
  { label: "Monthly cost", values: ["from $99", "$300+"] },
];

const SECTIONS = [
  {
    title: "The gap between an answered call and a booked job",
    body: "A human answering service picks up the phone — but most stop there. They take a message and email it to you, which still leaves the real work on your plate: calling the customer back, quoting the job, booking it, and typing it all into your CRM. Missed No More Pro closes that gap in the same call: the AI quotes the exact price from your rates, books the appointment on your calendar, and logs the whole thing automatically.",
  },
  {
    title: "You're paying for messages, not outcomes",
    body: "A $300+/mo answering service charges roughly the same whether it books zero jobs or ten. Missed No More Pro starts at $99/mo, and on most plans one recovered job covers the month — because the AI doesn't just take a message, it moves the caller all the way to a booked appointment.",
  },
  {
    title: "No re-entering someone else's notes",
    body: "Switching off a message-only service usually means re-typing every emailed message into your own CRM by hand. Missed No More Pro builds the contact, the lead, and the timeline automatically from the call itself — there's nothing to copy over.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Do I have to give up my answering service to try this?",
    a: "No — you can run a 7-day free trial alongside whatever you use today and compare directly. Most businesses switch once they see the AI booking jobs, not just taking messages.",
  },
  {
    q: "What happens to calls the AI can't handle?",
    a: "It can warm-transfer to a real person on your team, send an instant text alert, or take a detailed message — your choice per situation. Emergencies follow the escalation rules you set, the same job a human answering service does today, just automatic.",
  },
  {
    q: "Is it really cheaper than a $300/mo answering service?",
    a: "Plans start at $99/mo with a 7-day free trial, and every plan is a hard cap — no surprise overage. If you go over your minutes, calls simply forward to your phone instead of billing you more.",
  },
];

export default function VsAnsweringServicePage() {
  return (
    <ComparisonPage
      kicker="Missed No More Pro vs. Answering Services"
      h1="Missed No More Pro vs. a Human Answering Service"
      subhead="A human answering service picks up the phone and takes a message. Missed No More Pro answers, quotes the exact price, books the job, and logs the lead — automatically, for a fraction of the cost."
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="Answering service vs. Missed No More Pro — questions"
    />
  );
}
