import type { Metadata } from "next";
import Link from "next/link";
import { Hash, MessageSquare, PhoneCall, PhoneForwarded, Sparkles } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { formatUsPhone } from "@/lib/phone";
import { isTwilioConfigured } from "@/lib/twilio/numbers";
import { createClient } from "@/lib/supabase/server";

import { provisionEligibility } from "./actions";
import { ProvisionNumber } from "./provision";

export const metadata: Metadata = { title: "Numbers" };

type NumberRow = {
  id: string;
  phone_number: string;
  type: string;
  voice_enabled: boolean;
  sms_enabled: boolean;
  a2p_status: string;
};

export default async function NumbersPage() {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);
  const multiNumber = ent.has("multi_number");
  const canManage = active.role === "owner" || active.role === "admin";

  const supabase = await createClient();
  const { data } = await supabase
    .from("phone_numbers")
    .select("id, phone_number, type, voice_enabled, sms_enabled, a2p_status")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true });
  const rows = (data ?? []) as NumberRow[];

  // Provisioning is gated server-side (card on file + plan number cap). Only
  // show the picker when the tenant can actually claim one.
  const twilioReady = isTwilioConfigured();
  const eligibility = canManage && twilioReady ? await provisionEligibility(tenantId) : { ok: false };
  const showProvision = canManage && twilioReady;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Hash className="size-6 text-cyan" aria-hidden />
        Numbers
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The phone numbers your AI receptionist answers.{" "}
        <Link
          href="/dashboard/numbers/guide"
          className="inline-flex items-center gap-1 text-cyan hover:underline"
        >
          <PhoneForwarded className="size-3.5" aria-hidden />
          Set up / forward your number
        </Link>
      </p>

      <Card className="mt-6 bg-card/60">
        <CardContent className="py-5">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No number yet. {showProvision ? "Claim one below" : "Your number appears here once it's attached"} — your AI starts answering it
              right away.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 px-3.5 py-3"
                >
                  <span className="font-mono text-lg text-cyan">{formatUsPhone(n.phone_number)}</span>
                  <span className="rounded-full border border-border/70 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
                    {n.type}
                  </span>
                  <span className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <PhoneCall className="size-3.5" aria-hidden />
                      {n.voice_enabled ? "voice on" : "voice off"}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <MessageSquare className="size-3.5" aria-hidden />
                      {n.sms_enabled ? `sms ${n.a2p_status}` : "sms off"}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {showProvision && (
        <Card className="mt-4 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="size-4 text-cyan" aria-hidden />
              {rows.length === 0 ? "Get your number" : "Add a number"}
            </CardTitle>
            <CardDescription>
              Pick a local number by area code and we&rsquo;ll set it up instantly — your AI
              answers it and texts from it. Included with your plan, no extra charge.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {eligibility.ok ? (
              <ProvisionNumber />
            ) : "reason" in eligibility && eligibility.reason === "limit_reached" ? (
              <p className="rounded-lg border border-border/50 px-3.5 py-3 text-sm text-muted-foreground">
                Your plan includes one number.{" "}
                {multiNumber ? (
                  <>Need another? Contact us and we&rsquo;ll add it.</>
                ) : (
                  <>
                    Additional numbers and locations are available on{" "}
                    <Link href="/dashboard/billing" className="text-cyan hover:underline">
                      Elite
                    </Link>
                    .
                  </>
                )}
              </p>
            ) : (
              <p className="rounded-lg border border-border/50 px-3.5 py-3 text-sm text-muted-foreground">
                Start a plan or free trial to claim your number.{" "}
                <Link href="/dashboard/billing" className="text-cyan hover:underline">
                  See plans
                </Link>
                .
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!canManage && (
        <p className="mt-4 text-xs text-steel">
          Only an owner or admin can add a number.
        </p>
      )}
    </div>
  );
}
