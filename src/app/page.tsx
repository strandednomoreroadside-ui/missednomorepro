import type { Metadata } from "next";
import { Barlow_Condensed, DM_Sans } from "next/font/google";
import { RevenueHome } from "@/components/landing/revenue-home";
import { HOME_FAQS } from "@/components/landing/home-faqs";
import { Pricing } from "@/components/landing/pricing";
import { getFounderSlotsTakenSafe } from "@/lib/billing/founder";
import { PLAN_META, SELF_SERVE_PLAN_ORDER } from "@/lib/billing/plans";
import { DEMO_PHONE_E164, SUPPORT_EMAIL } from "@/lib/constants";
import { JsonLd, SITE_NAME, SITE_URL, pageMetadata } from "@/lib/seo";
import "./revenue-home.css";

const display = Barlow_Condensed({ subsets:["latin"],weight:["600","700","800"],variable:"--font-revenue-display",display:"swap" });
const body = DM_Sans({ subsets:["latin"],weight:["400","500","600","700"],variable:"--font-revenue-body",display:"swap" });
const TITLE = "AI Receptionist for Small Business | Missed No More Pro";
const DESCRIPTION = "AI receptionist and answering service for small service businesses. Answers calls 24/7, quotes exact prices, and books jobs. From $50/mo, free 7-day trial.";
export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/" });

const SUMMARY =
  "Missed No More Pro is an AI receptionist and AI answering service for small local service businesses. It answers business calls 24/7, qualifies callers, quotes exact prices computed from the owner's approved rates and real driving distance, books jobs on the calendar, sends missed-call text-backs and confirmations, warm-transfers to a human when needed, and logs every lead in a built-in CRM.";

const FEATURES = [
  "24/7 AI call answering in your business name",
  "Exact price quotes computed from your approved rates and driving distance",
  "Appointment booking, cancel, and reschedule on Google Calendar",
  "Missed-call text-back and SMS confirmations and reminders",
  "Warm transfer to a real person with a caller briefing",
  "Spam call screening",
  "Built-in CRM with call transcripts, summaries, and lead pipeline",
  "Website chat and two-way AI texting",
  "AI business assistant and weekly performance insights",
  "Review requests and reputation management",
  "Dispatch board, team calendar, and Zapier/Make integrations",
];

export default async function LandingPage(){
  const founderSlotsTaken = await getFounderSlotsTakenSafe();
  const plans = SELF_SERVE_PLAN_ORDER.map((id) => PLAN_META[id]);
  const prices = plans.map((p) => p.monthly);
  const offers = {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: String(Math.min(...prices)),
    highPrice: String(Math.max(...prices)),
    offerCount: String(plans.length),
    offers: SELF_SERVE_PLAN_ORDER.map((id) => ({
      "@type": "Offer",
      name: `${PLAN_META[id].name} plan - ${PLAN_META[id].minutes} per month`,
      price: String(PLAN_META[id].monthly),
      priceCurrency: "USD",
      url: `${SITE_URL}/signup?plan=${id}`,
      availability: "https://schema.org/InStock",
      priceSpecification: {
        "@type": "UnitPriceSpecification",
        price: String(PLAN_META[id].monthly),
        priceCurrency: "USD",
        unitCode: "MON",
        referenceQuantity: { "@type": "QuantitativeValue", value: "1", unitCode: "MON" },
      },
    })),
  };

  const jsonLd = {
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        alternateName: ["MNM Pro", "Missed No More"],
        description: SUMMARY,
        inLanguage: "en-US",
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/#webpage`,
        url: SITE_URL,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#software` },
        primaryImageOfPage: `${SITE_URL}/opengraph-image`,
        inLanguage: "en-US",
      },
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#org`,
        name: SITE_NAME,
        alternateName: "MNM Pro",
        url: SITE_URL,
        logo: {
          "@type": "ImageObject",
          url: `${SITE_URL}/images/mnm-official-logo-2026.png`,
          width: 695,
          height: 160,
        },
        description: SUMMARY,
        email: "hello@missednomorepro.com",
        founder: {
          "@type": "Person",
          "@id": `${SITE_URL}/about#founder`,
          name: "Josh Millsaps",
        },
        areaServed: { "@type": "Country", name: "United States" },
        contactPoint: [
          {
            "@type": "ContactPoint",
            contactType: "sales",
            email: "hello@missednomorepro.com",
            areaServed: "US",
            availableLanguage: "English",
          },
          {
            "@type": "ContactPoint",
            contactType: "customer support",
            email: SUPPORT_EMAIL,
            areaServed: "US",
            availableLanguage: "English",
          },
        ],
        knowsAbout: [
          "AI receptionist",
          "AI answering service",
          "AI phone assistant",
          "Virtual receptionist",
          "Call answering for small business",
          "Field service CRM",
        ],
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "AI receptionist",
        operatingSystem: "Web",
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image`,
        description: SUMMARY,
        featureList: FEATURES,
        offers,
        publisher: { "@id": `${SITE_URL}/#org` },
      },
      {
        "@type": "Service",
        "@id": `${SITE_URL}/#ai-receptionist-service`,
        name: "AI Receptionist and Answering Service for Small Business",
        serviceType: "AI receptionist",
        alternateName: ["AI answering service", "AI phone answering service", "AI virtual receptionist"],
        provider: { "@id": `${SITE_URL}/#org` },
        areaServed: { "@type": "Country", name: "United States" },
        audience: {
          "@type": "BusinessAudience",
          audienceType: "Small local service businesses: towing, roadside assistance, HVAC, plumbing, electrical, roofing, garage doors, locksmiths, pest control, cleaning, landscaping, appliance repair, handyman",
        },
        description: SUMMARY,
        availableChannel: {
          "@type": "ServiceChannel",
          name: "Live AI receptionist demo line",
          servicePhone: { "@type": "ContactPoint", telephone: DEMO_PHONE_E164, contactType: "sales" },
        },
        offers,
      },
      {
        "@type": "FAQPage",
        "@id": `${SITE_URL}/#faq`,
        mainEntity: HOME_FAQS.map((f) => ({
          "@type": "Question",
          name: f.q,
          acceptedAnswer: { "@type": "Answer", text: f.a },
        })),
      },
    ],
  };

  return <div className={`revenue-home ${display.variable} ${body.variable}`}>
    <JsonLd data={jsonLd} />
    <RevenueHome><Pricing founderSlotsTaken={founderSlotsTaken} /></RevenueHome>
  </div>;
}
