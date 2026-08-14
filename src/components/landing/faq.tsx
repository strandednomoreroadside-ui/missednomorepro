import { Plus } from "lucide-react";

import { SectionHeading } from "./primitives";

const FAQS: { q: string; a: string }[] = [
  {
    q: "Is it really AI — and will it sound robotic?",
    a: "Yes, it's a real AI receptionist with a natural voice. It answers in your business name, asks one question at a time, and always discloses it's an AI assistant if asked. Most callers just think they reached a friendly front desk.",
  },
  {
    q: "Will it book the wrong jobs or invent prices?",
    a: "No. It only books inside the hours and rules you approve, and it never makes up a price — every quote is computed by our pricing engine from your approved rates plus real driving distance. If it's unsure, it captures the lead and flags your team.",
  },
  {
    q: "What if a call gets complicated — will the AI fumble it?",
    a: "If a caller is upset, the situation is unusual, or it's outside what the AI is trained on, it warm-transfers to a real person on your team instead of struggling through it — briefed on who's calling and why, so the caller never has to repeat themselves. And it never invents details or prices to fill a gap; if it's not sure, it captures the lead and flags your team instead of guessing.",
  },
  {
    q: "Is it compliant with texting rules?",
    a: "Yes. We're A2P 10DLC registered, and STOP / START / HELP are handled automatically. We keep a tenant-wide opt-out list, so a customer who opts out never gets another text — even a transactional one.",
  },
  {
    q: "How long does setup take?",
    a: "A guided wizard walks you through your hours, services, service area, and greeting in about 15 minutes. You can upload an existing price sheet and we extract it for you. Nothing goes live until you approve it.",
  },
  {
    q: "What happens to calls it can't handle?",
    a: "It can warm-transfer to a real person, send your team an instant text alert, or take a detailed message — your choice per situation. Emergencies follow the escalation rules you set.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Plans are month-to-month (annual just saves you 20%). No long contracts, and you keep your data export.",
  },
];

export function Faq() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-24 px-6 py-20 lg:py-28">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <SectionHeading eyebrow="FAQ" title="Questions, answered" />
      <div className="mt-10 divide-y divide-border/60 rounded-2xl border border-border bg-card/40">
        {FAQS.map((item) => (
          <details key={item.q} className="group px-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-left font-medium text-foreground transition-colors hover:text-cyan [&::-webkit-details-marker]:hidden">
              {item.q}
              <Plus
                className="size-4 shrink-0 text-steel transition-transform duration-200 group-open:rotate-45 group-open:text-cyan"
                aria-hidden
              />
            </summary>
            <p className="-mt-1 pb-5 pr-8 text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
