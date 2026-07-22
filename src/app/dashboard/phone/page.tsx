import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, Hash, Phone } from "lucide-react";

import { BusinessLine, type BusinessLineRecentItem } from "./business-line";
import { Card, CardContent } from "@/components/ui/card";
import { InstallApp } from "@/components/pwa/install-app";
import { isOrgManager, requireActiveOrg } from "@/lib/auth";
import { getSubscription } from "@/lib/billing/subscription";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { isTwilioConfigured } from "@/lib/twilio/numbers";

export const metadata: Metadata = { title: "Business Line" };

const CARDED_STATUSES = new Set(["active", "trialing", "past_due"]);

type NumberRow = {
  phone_number: string;
  voice_enabled: boolean;
  sms_enabled: boolean;
  a2p_status: string;
};
type ContactRow = { id: string; name: string; phone: string | null };
type MessageRow = {
  id: string;
  to_number: string | null;
  status: string;
  created_at: string;
  contacts: { name: string } | { name: string }[] | null;
};
type AuditRow = {
  id: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

function shortDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function BusinessLinePage() {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const manager = isOrgManager(active.role);
  const supabase = await createClient();

  const [numbersResult, staffResult, contactsResult, messagesResult, callsResult, subscription] =
    await Promise.all([
      supabase
        .from("phone_numbers")
        .select("phone_number, voice_enabled, sms_enabled, a2p_status")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: true }),
      supabase
        .from("staff_contacts")
        .select("phone")
        .eq("tenant_id", tenantId)
        .eq("notify_on_lead", true)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("contacts")
        .select("id, name, phone")
        .eq("tenant_id", tenantId)
        .not("phone", "is", null)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("messages")
        .select("id, to_number, status, created_at, contacts ( name )")
        .eq("tenant_id", tenantId)
        .eq("kind", "manual")
        .eq("direction", "outbound")
        .order("created_at", { ascending: false })
        .limit(8),
      supabase
        .from("audit_logs")
        .select("id, metadata, created_at")
        .eq("tenant_id", tenantId)
        .eq("action", "staff_call.placed")
        .order("created_at", { ascending: false })
        .limit(8),
      getSubscription(tenantId).catch(() => null),
    ]);

  const numbers = (numbersResult.data ?? []) as NumberRow[];
  const contacts = (contactsResult.data ?? []) as ContactRow[];
  const phoneToName = new Map(
    contacts.filter((contact) => contact.phone).map((contact) => [contact.phone as string, contact.name])
  );
  const voiceNumber = numbers.find((number) => number.voice_enabled)?.phone_number ?? null;
  const smsLine = numbers.find((number) => number.sms_enabled);
  const smsNumber = smsLine?.phone_number ?? null;
  const carded = !!subscription && CARDED_STATUSES.has(subscription.status);
  const twilioReady = isTwilioConfigured();

  const textRecents: BusinessLineRecentItem[] = ((messagesResult.data ?? []) as unknown as MessageRow[])
    .filter((message) => message.to_number)
    .map((message) => ({
      id: `text-${message.id}`,
      kind: "text",
      phone: message.to_number as string,
      name: one(message.contacts)?.name ?? phoneToName.get(message.to_number as string) ?? null,
      status: message.status,
      at: message.created_at,
      when: shortDate(message.created_at),
    }));
  const callRecents = ((callsResult.data ?? []) as AuditRow[])
    .flatMap<BusinessLineRecentItem>((call) => {
      const target = typeof call.metadata?.target === "string" ? call.metadata.target : null;
      if (!target) return [];
      return [{
        id: `call-${call.id}`,
        kind: "call",
        phone: target,
        name: phoneToName.get(target) ?? null,
        status: "started",
        at: call.created_at,
        when: shortDate(call.created_at),
      }];
    });
  const recents = [...textRecents, ...callRecents]
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 8);

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-cyan">
            Your business, in your pocket
          </p>
          <h1 className="mt-2 flex items-center gap-2 font-display text-3xl font-bold tracking-tight">
            <Phone className="size-7 text-cyan" aria-hidden />
            Business Line
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Call or text customers from your business number without sharing your personal number.
          </p>
        </div>
        {(voiceNumber || smsNumber) && (
          <div className="rounded-2xl border border-cyan/25 bg-cyan/5 px-4 py-3 text-right">
            <p className="flex items-center justify-end gap-2 text-xs font-medium text-success">
              <span className="size-2 rounded-full bg-success shadow-[0_0_12px_var(--color-success)]" />
              Ready
            </p>
            <p className="mt-1 font-mono text-base text-foreground">
              {formatUsPhone(voiceNumber ?? smsNumber)}
            </p>
          </div>
        )}
      </div>

      {!voiceNumber && !smsNumber ? (
        <Card className="mt-6 border-cyan/25 bg-cyan/5">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Set up your business number</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Once a number is attached, calls and texts will be available here.
              </p>
            </div>
            <Link
              href="/dashboard/numbers"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              <Hash className="size-4" aria-hidden />
              Set up a number
            </Link>
          </CardContent>
        </Card>
      ) : !carded ? (
        <Card className="mt-6 border-alert/35 bg-alert/5">
          <CardContent className="flex flex-col items-start gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-semibold">Finish billing to use your line</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                A plan or trial with a card on file is required for outbound calls and texts.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
            >
              <CreditCard className="size-4" aria-hidden />
              Open billing
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {(voiceNumber || smsNumber) && (
        <BusinessLine
          voiceNumber={voiceNumber}
          smsNumber={smsNumber}
          smsStatus={smsLine?.a2p_status ?? null}
          callbackPhone={(staffResult.data as { phone: string } | null)?.phone ?? ""}
          contacts={contacts.filter((contact) => contact.phone) as { id: string; name: string; phone: string }[]}
          recents={recents}
          canManage={manager}
          providerReady={twilioReady}
          serviceReady={twilioReady && carded}
        />
      )}
      <div className="mt-5 lg:hidden">
        <InstallApp prominent />
      </div>
    </div>
  );
}
