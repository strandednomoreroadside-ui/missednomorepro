import type { Metadata } from "next";

import { Faq } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { Pricing } from "@/components/landing/pricing";
import { getFounderSlotsTakenSafe } from "@/lib/billing/founder";
import { PLAN_META, SELF_SERVE_PLAN_ORDER } from "@/lib/billing/plans";
import { JsonLd, SITE_NAME, SITE_URL, breadcrumbJsonLd, pageMetadata } from "@/lib/seo";

const { starter, professional } = PLAN_META;
const TITLE = `AI Receptionist Pricing from $${starter.monthly}/mo | ${SITE_NAME}`;
const DESCRIPTION = `AI receptionist plans from $${starter.monthly}/mo for ${starter.minutes.replace("AI ", "")} up to $${professional.monthly}/mo for ${professional.minutes.replace("AI ", "")}. Built-in CRM, exact quotes, no overage fees, 7-day free trial.`;

export const metadata: Metadata = pageMetadata({ title: TITLE, description: DESCRIPTION, path: "/pricing" });

export default async function PricingPage() {
  const founderSlotsTaken = await getFounderSlotsTakenSafe();
  const jsonLd = {
    "@graph": [
      {
        "@type": "WebPage",
        "@id": `${SITE_URL}/pricing#webpage`,
        url: `${SITE_URL}/pricing`,
        name: TITLE,
        description: DESCRIPTION,
        isPartOf: { "@id": `${SITE_URL}/#website` },
        about: { "@id": `${SITE_URL}/#software` },
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE_URL}/#software`,
        name: SITE_NAME,
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "AI receptionist",
        operatingSystem: "Web",
        url: SITE_URL,
        offers: SELF_SERVE_PLAN_ORDER.flatMap((id) => {
          const plan = PLAN_META[id];
          return [
            { interval: "monthly", price: plan.monthly, unit: "MON" },
            { interval: "annual", price: plan.monthly * 12 * 0.8, unit: "ANN" },
          ].map((o) => ({
            "@type": "Offer",
            name: `${plan.name} plan (${o.interval}) - ${plan.minutes} per month`,
            description: plan.highlights.join(", "),
            price: String(o.price),
            priceCurrency: "USD",
            url: `${SITE_URL}/signup?plan=${id}`,
            availability: "https://schema.org/InStock",
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              price: String(o.price),
              priceCurrency: "USD",
              unitCode: o.unit,
            },
          }));
        }),
      },
      breadcrumbJsonLd([{ name: "Pricing", path: "/pricing" }]),
    ],
  };

  return (
    <MarketingShell>
      <JsonLd data={jsonLd} />
      <Pricing
        founderSlotsTaken={founderSlotsTaken}
        title="AI receptionist pricing for small service teams"
        headingAs="h1"
      />
      <Faq />
    </MarketingShell>
  );
}
