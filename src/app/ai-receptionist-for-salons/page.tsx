import type { Metadata } from "next";

import type { ComparisonRow } from "@/components/landing/comparison-table";
import type { FaqItem } from "@/components/landing/faq";
import { TradePage } from "@/components/landing/trade-page";
import { pageMetadata } from "@/lib/seo";

const PATH = "/ai-receptionist-for-salons";
const TITLE = "AI Receptionist for Hair & Nail Salons | Missed No More Pro";
const DESCRIPTION =
  "AI receptionist for hair salons, nail salons, barbershops, and spas. Answers every call while you're with a client, books appointments, and texts reminders.";

export const metadata: Metadata = pageMetadata({
  title: TITLE,
  description: DESCRIPTION,
  path: PATH,
  keywords: [
    "AI receptionist for salons",
    "AI receptionist for nail salons",
    "salon answering service",
    "barbershop answering service",
    "AI receptionist for spas",
    "salon virtual receptionist",
    "AI appointment booking for salons",
  ],
});

const CALL_TYPES = [
  "New client appointment requests",
  "Existing clients canceling or rescheduling",
  "Same-day availability checks",
  "Hours, location, and parking questions",
  "Service, cancellation policy, and deposit questions from your FAQ",
  "Evening and weekend calls from clients booking ahead",
];

const COLS = ["Missed No More Pro", "Answering service", "Voicemail"];
const ROWS: ComparisonRow[] = [
  { label: "Answers while you're with a client", values: [true, true, false] },
  { label: "Books into open times on your calendar", values: [true, "Maybe", false] },
  { label: "Handles cancels and reschedules by phone", values: [true, "Maybe", false] },
  { label: "Texts appointment confirmations and reminders", values: [true, false, false] },
  { label: "Answers your policy questions in your words", values: [true, "Maybe", false] },
  { label: "Monthly cost", values: ["from $50", "$300+", "$0"] },
];

const SECTIONS = [
  {
    title: "Every call answered, mid-appointment",
    body: "You can't put down the clippers or the nail file every time the phone rings, and clients who hit voicemail often book somewhere else. Missed No More Pro answers in your salon's name, day or night, asks what service the client wants and when, and takes their best callback number. It knows clients come to you, so it never asks for their address.",
  },
  {
    title: "Booked, confirmed, and reminded",
    body: "Connect Google Calendar and the AI books clients into open times inside your hours, without double-booking. Clients get a confirmation text right away and a reminder before the appointment. When someone needs to cancel or move their visit, they can call and the AI handles it, which frees that time for someone else.",
  },
  {
    title: "Your policies, in your words",
    body: "Add answers to the questions clients ask every day, like your cancellation policy, deposits, parking, how long a service takes, or what to do before a lash appointment, and the AI uses your wording. When a caller asks what a service costs, it never guesses: it takes their number so your team can text them the price.",
  },
  {
    title: "Know your regulars",
    body: "Every caller is saved in the built-in CRM with their call history, summaries, and appointments, and returning clients are greeted by name. Visits you mark complete can trigger a review request text, and the same AI can answer questions in a chat widget on your website.",
  },
];

const FAQS: FaqItem[] = [
  {
    q: "Can an AI receptionist book salon appointments?",
    a: "Yes. Connect Google Calendar and Missed No More Pro books clients into open times inside your business hours, without double-booking, then texts a confirmation and a reminder. Clients can also call to cancel or reschedule.",
  },
  {
    q: "Does it work with Vagaro, Square Appointments, Booksy, or GlossGenius?",
    a: "Not directly today. It books on Google Calendar. If your appointment book lives in another system, you can leave booking off: the AI takes the client's request and preferred time, and your team confirms it.",
  },
  {
    q: "Can it book a specific stylist or longer services?",
    a: "It books one standard appointment length on your connected calendar. It notes the client's preferred stylist or technician and the service they want, so your team can adjust the time for longer services like color or a full set.",
  },
  {
    q: "Will it tell callers my prices?",
    a: "It never guesses at a price. When a client asks what a service costs, it takes their number and your team texts them the exact price.",
  },
  {
    q: "Does it work for nail salons, barbershops, spas, and lash studios?",
    a: "Yes. In setup, choose Hair salon, Nail salon, Barbershop, Day spa and massage, Lash and brow studio, Tattoo and piercing studio, or Pet grooming salon, and the AI handles calls for a business clients visit, with no address questions.",
  },
  {
    q: "How much does a salon answering service cost compared to this?",
    a: "Missed No More Pro plans start at $50 per month for 200 AI minutes, with a 7-day free trial. Human answering services commonly run $300 or more per month. Every plan is a hard cap, so there are no overage charges.",
  },
];

export default function AiReceptionistForSalonsPage() {
  return (
    <TradePage
      path={PATH}
      trade="salon"
      audience="Hair salons, nail salons, barbershops, spas, and lash studios"
      kicker="For salons, barbershops & spas"
      h1="AI Receptionist for Hair & Nail Salons"
      subhead="You can't pick up the phone halfway through a color or a gel set. Answer every call, book the appointment into an open time, and send the reminder, without stepping away from your client."
      callTypes={CALL_TYPES}
      comparisonCols={COLS}
      comparisonRows={ROWS}
      sections={SECTIONS}
      faqItems={FAQS}
      faqTitle="AI receptionist for salons: questions"
    />
  );
}
