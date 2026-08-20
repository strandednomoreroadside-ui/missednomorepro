import type { Metadata } from "next";

import { Faq } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { Pricing } from "@/components/landing/pricing";
import { getFounderSlotsTakenSafe } from "@/lib/billing/founder";

const TITLE = "AI Receptionist Pricing — Plans from $99/mo";
const DESCRIPTION =
  "Plans that pay for themselves, from $99/mo. AI receptionist minutes, a built-in CRM, and add-ons for local service businesses — hard caps, no surprise overage, 7-day free trial on every plan.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/pricing" },
  openGraph: {
    title: `${TITLE} · Missed No More Pro`,
    description: DESCRIPTION,
    url: "/pricing",
  },
  twitter: {
    card: "summary_large_image",
    title: `${TITLE} · Missed No More Pro`,
    description: DESCRIPTION,
  },
};

export default async function PricingPage() {
  const founderSlotsTaken = await getFounderSlotsTakenSafe();
  return (
    <MarketingShell>
      <Pricing founderSlotsTaken={founderSlotsTaken} />
      <Faq />
    </MarketingShell>
  );
}
