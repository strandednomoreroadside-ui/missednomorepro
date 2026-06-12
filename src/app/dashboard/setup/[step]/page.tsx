import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { FormBanner } from "@/components/form-banner";
import { requireActiveOrg } from "@/lib/auth";
import { getSetupData } from "@/lib/setup/queries";
import { isStepId, type StepId } from "@/lib/setup/steps";

import { IndustryStep, ProfileStep } from "../_components/basics";
import { LaunchStep } from "../_components/launch";
import {
  AreaStep,
  FaqsStep,
  NotificationsStep,
  PricingStep,
  ServicesStep,
} from "../_components/lists";
import { HoursStep, SmsStep } from "../_components/schedule";
import { WizardShell } from "../_components/shell";

export const metadata: Metadata = { title: "Setup wizard" };

type Params = Promise<{ step: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SetupStepPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { step } = await params;
  if (!isStepId(step)) notFound();

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const saved = sp.saved === "1";

  const { active } = await requireActiveOrg();
  const data = await getSetupData(active.organization_id, active.organizations.name);
  const canApprove = active.role === "owner" || active.role === "admin";

  const forms: Record<StepId, React.ReactNode> = {
    profile: <ProfileStep data={data} />,
    industry: <IndustryStep data={data} />,
    services: <ServicesStep data={data} />,
    pricing: <PricingStep data={data} />,
    "service-area": <AreaStep data={data} />,
    hours: <HoursStep data={data} />,
    notifications: <NotificationsStep data={data} />,
    sms: <SmsStep data={data} />,
    faqs: <FaqsStep data={data} />,
    launch: <LaunchStep data={data} canApprove={canApprove} />,
  };

  return (
    <WizardShell data={data} current={step}>
      {error && <FormBanner kind="error">{error}</FormBanner>}
      {saved && <FormBanner kind="success">Saved.</FormBanner>}
      {forms[step]}
    </WizardShell>
  );
}
