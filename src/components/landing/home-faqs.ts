import { PLAN_META } from "@/lib/billing/plans";

// Single source for the homepage FAQ: rendered by RevenueHome and emitted as
// FAQPage JSON-LD by app/page.tsx, so the visible answers and the schema that
// search engines and AI assistants read can't drift apart. Not in
// revenue-home.tsx because a "use client" module can't hand plain data to a
// server component.
const { starter, growth, professional } = PLAN_META;

export const HOME_FAQS: { q: string; a: string }[] = [
  {
    q: "What is an AI receptionist?",
    a: "An AI receptionist answers your business phone, asks callers what they need, and captures their information. Missed No More Pro can also calculate quotes from your approved rates, book appointments, and organize leads in a CRM.",
  },
  {
    q: "How is an AI receptionist different from an answering service?",
    a: "A traditional answering service takes a message for you to return later. Missed No More Pro answers the call, quotes from your approved rates, books the job on your calendar, texts the customer a confirmation, and saves the lead in your CRM.",
  },
  {
    q: "How does it give exact quotes?",
    a: "Prices are calculated from the rates and rules your business approves, including driving distance where applicable. If a request falls outside those rules, the assistant captures the lead and flags your team.",
  },
  {
    q: "Will it book jobs outside my availability?",
    a: "It checks your calendar and follows the booking hours and rules you set. You approve your setup before it goes live.",
  },
  {
    q: "What if a caller needs a real person?",
    a: "You choose the handoff rules. The assistant can warm-transfer the caller, alert your team by text, or take a detailed message.",
  },
  {
    q: "Will callers know they are talking to an AI?",
    a: "The assistant speaks in a natural voice, answers in your business name, and never claims to be human. If a caller asks, it tells them it is an AI assistant.",
  },
  {
    q: "Can I keep my current business phone number?",
    a: "Yes. Forward your existing number to the number we give you, either for every call or only when you don't pick up. You can also claim a new local number from your dashboard.",
  },
  {
    q: "What kinds of businesses use an AI receptionist?",
    a: "Local service businesses where a missed call means a lost job: towing and roadside assistance, HVAC, plumbing, electrical, roofing, garage doors, locksmiths, pest control, cleaning, landscaping, appliance repair, and handyman services.",
  },
  {
    q: "How long does setup take?",
    a: "The guided setup covers your services, opening hours, service area, and greeting. You can upload a price sheet to help configure rates. Review and approve everything before going live.",
  },
  {
    q: "How much does an AI receptionist cost?",
    a: `Missed No More Pro plans are $${starter.monthly}/month for ${starter.minutes} (${starter.name}), $${growth.monthly}/month for ${growth.minutes} (${growth.name}), and $${professional.monthly}/month for ${professional.minutes} (${professional.name}). Annual billing saves 20%, and every plan starts with a 7-day free trial.`,
  },
  {
    q: "Can I cancel, and what happens at my minute limit?",
    a: "Monthly plans have no long contract. Cancel before the 7-day trial ends to avoid charges. We warn you as minutes run low; at your limit, calls forward to your phone instead of creating overage charges.",
  },
];
