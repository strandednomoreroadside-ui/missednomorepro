import type { Metadata } from "next";
import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight, MessageSquare } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getBusinessTimezone } from "@/lib/business/timezone";
import { formatDateTimeInZone } from "@/lib/calendar/timezone";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Messages" };

type MessageRow = {
  id: string;
  direction: string;
  from_number: string | null;
  to_number: string | null;
  body_redacted: string | null;
  status: string;
  kind: string;
  created_at: string;
  contacts: { id: string; name: string } | { id: string; name: string }[] | null;
};

const STATUS_STYLES: Record<string, string> = {
  sent: "border-success/40 bg-success/10 text-success",
  delivered: "border-success/40 bg-success/10 text-success",
  received: "border-cyan/40 bg-cyan/10 text-cyan",
  blocked: "border-destructive/40 bg-destructive/10 text-[#ffb3bb]",
  failed: "border-alert/40 bg-alert/10 text-alert",
  undelivered: "border-alert/40 bg-alert/10 text-alert",
  queued: "border-border/70 text-steel",
};

const KIND_LABELS: Record<string, string> = {
  text_back: "Missed-call text-back",
  staff_alert: "Staff alert",
  confirmation: "Confirmation",
  reply: "Reply",
  help: "HELP reply",
  optout_ack: "Opt-out confirm",
  optin_ack: "Opt-in confirm",
  manual: "Manual",
  campaign: "Campaign",
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function MessagesPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const tz = await getBusinessTimezone(active.organization_id);

  const { data, error } = await supabase
    .from("messages")
    .select(
      "id, direction, from_number, to_number, body_redacted, status, kind, created_at, contacts ( id, name )"
    )
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load messages: ${error.message}`);
  const messages = (data ?? []) as unknown as MessageRow[];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every text in, out, and blocked — including missed-call text-backs and
        staff alerts. Blocked messages show why (opted out or no consent).
      </p>

      <Card className="mt-6 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <MessageSquare className="size-4 text-cyan" aria-hidden />
            Message log
          </CardTitle>
          <CardDescription>STOP/START/HELP are handled automatically.</CardDescription>
        </CardHeader>
        <CardContent>
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No messages yet. Missed calls trigger an automatic text-back, and
              new leads alert your staff by text.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {messages.map((m) => {
                const contact = one(m.contacts);
                const inbound = m.direction === "inbound";
                const otherNumber = inbound ? m.from_number : m.to_number;
                return (
                  <li key={m.id} className="flex items-start gap-3 py-3">
                    <span
                      className={cn(
                        "mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border",
                        inbound
                          ? "border-cyan/40 bg-cyan/5 text-cyan"
                          : "border-border/60 bg-night/60 text-steel"
                      )}
                      title={inbound ? "Received" : "Sent"}
                    >
                      {inbound ? (
                        <ArrowDownLeft className="size-3.5" aria-hidden />
                      ) : (
                        <ArrowUpRight className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-foreground">
                        {contact ? (
                          <Link
                            href={`/dashboard/contacts/${contact.id}`}
                            className="hover:text-cyan"
                          >
                            {contact.name}
                          </Link>
                        ) : (
                          formatUsPhone(otherNumber) || "Unknown"
                        )}
                        {contact && (
                          <span className="font-mono text-xs text-steel">
                            {formatUsPhone(otherNumber)}
                          </span>
                        )}
                        <span className="rounded-full border border-border/70 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-steel">
                          {KIND_LABELS[m.kind] ?? m.kind}
                        </span>
                      </p>
                      {m.body_redacted && (
                        <p className="mt-1 text-sm text-steel">{m.body_redacted}</p>
                      )}
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTimeInZone(m.created_at, tz)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-xs",
                        STATUS_STYLES[m.status] ?? "border-border/70 text-steel"
                      )}
                    >
                      {m.status}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
