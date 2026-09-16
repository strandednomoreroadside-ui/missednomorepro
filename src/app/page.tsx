import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { RevenueHome } from "@/components/landing/revenue-home";
import { Pricing } from "@/components/landing/pricing";
import { getFounderSlotsTakenSafe } from "@/lib/billing/founder";
import { env } from "@/lib/env";
import "./revenue-home.css";

const display = Barlow_Condensed({ subsets:["latin"],weight:["600","700","800"],variable:"--font-revenue-display",display:"swap" });
const body = DM_Sans({ subsets:["latin"],weight:["400","500","600","700"],variable:"--font-revenue-body",display:"swap" });
const TITLE = "AI Receptionist & Exact Quotes | Missed No More Pro";
const DESCRIPTION = "Answer calls 24/7, give exact quotes, and book jobs with an AI receptionist built for small service businesses. Try Missed No More Pro free for 7 days.";
export const metadata: Metadata = {
  title: { absolute: TITLE }, description: DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: { title: TITLE, description: DESCRIPTION, url: "/" },
  twitter: { card:"summary_large_image",title:TITLE,description:DESCRIPTION },
};
export default async function LandingPage(){
  const founderSlotsTaken = await getFounderSlotsTakenSafe();
  const base = env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${base}/#org`,
        name: "Missed No More Pro",
        url: base,
        logo: `${base}/images/mnm-official-logo-2026.png`,
      },
      {
        "@type": "SoftwareApplication",
        name: "Missed No More Pro",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web",
        url: base,
        description:
          "AI phone assistant and AI receptionist for local service businesses — answers calls 24/7, qualifies callers, quotes from your rates, books jobs, follows up by text, and logs every lead in a built-in CRM.",
        offers: {
          "@type": "Offer",
          price: "50",
          priceCurrency: "USD",
        },
        publisher: { "@id": `${base}/#org` },
      },
      {
        "@type": "Service",
        "@id": `${base}/#ai-phone-assistant-service`,
        name: "AI Phone Assistant for Local Service Businesses",
        serviceType: "AI phone answering service",
        provider: { "@id": `${base}/#org` },
        areaServed: "United States",
        description:
          "An AI phone assistant, receptionist, and CRM that answers calls, quotes prices from approved rates, books jobs, texts customers, and tracks leads for local service businesses.",
        offers: {
          "@type": "AggregateOffer",
          lowPrice: "50",
          highPrice: "200",
          priceCurrency: "USD",
          offerCount: "3",
        },
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "What is an AI receptionist?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "An AI receptionist answers your business phone, asks callers what they need, and captures their information. Missed No More Pro can also calculate quotes from your approved rates, book appointments, and organize leads in a CRM.",
            },
          },
          {
            "@type": "Question",
            name: "How does it give exact quotes?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "Prices are calculated from the rates and rules your business approves, including driving distance where applicable. If a request falls outside those rules, the assistant captures the lead and flags your team.",
            },
          },
          {
            "@type": "Question",
            name: "Will it book jobs outside my availability?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "It checks your calendar and follows the booking hours and rules you set. You approve your setup before it goes live.",
            },
          },
          {
            "@type": "Question",
            name: "What if a caller needs a real person?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "You choose the handoff rules. The assistant can warm-transfer the caller, alert your team by text, or take a detailed message.",
            },
          },
        ],
      },
    ],
  };

  return <div className={`revenue-home ${display.variable} ${body.variable}`}>
    <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify(jsonLd).replace(/</g,"\\u003c")}} />
    <RevenueHome><Pricing founderSlotsTaken={founderSlotsTaken} /></RevenueHome>
  </div>;
}
