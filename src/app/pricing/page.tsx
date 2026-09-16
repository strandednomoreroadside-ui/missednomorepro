import type { Metadata } from "next";

import { Faq } from "@/components/landing/faq";
import { MarketingShell } from "@/components/landing/marketing-shell";
import { Pricing } from "@/components/landing/pricing";
import { getFounderSlotsTakenSafe } from "@/lib/billing/founder";

const TITLE = "AI Receptionist Pricing — Plans from $50/mo";
const DESCRIPTION =
  "AI receptionist plans from $50/mo for 200 minutes, with 400- and 800-minute options. Built-in CRM, exact AI price quoting, hard caps, and a 7-day free trial.";

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
