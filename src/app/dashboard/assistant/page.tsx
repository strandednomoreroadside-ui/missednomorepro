import type { Metadata } from "next";
import Link from "next/link";
import { Bot, TriangleAlert } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";

import { AssistantChat } from "./chat";

export const metadata: Metadata = { title: "Assistant" };

export default async function AssistantPage() {
  const { active } = await requireActiveOrg();
  const ent = await getEntitlements(active.organization_id);
  const enabled = ent.has("business_assistant");

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Bot className="size-6 text-cyan" aria-hidden />
        Business Assistant
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Ask your business anything — calls, leads, schedule, and money,
        answered from your own data. It reports, it doesn&rsquo;t change things.
      </p>

      {enabled ? (
        <AssistantChat />
      ) : (
        <Card className="mt-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-amber-500">
              <TriangleAlert className="size-4" aria-hidden />
              Add-on required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The <strong>AI Business Assistant</strong> is a +$39/mo add-on (also
            in the Growth Suite bundle). Turn it on from the{" "}
            <Link href="/dashboard/billing" className="text-cyan hover:underline">
              billing page
            </Link>{" "}
            to start asking questions.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
