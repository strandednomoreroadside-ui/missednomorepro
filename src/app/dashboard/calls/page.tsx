import type { Metadata } from "next";
import Link from "next/link";
import { PhoneIncoming, Voicemail } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Calls" };

type CallRow = {
  id: string;
  from_number: string | null;
  status: string;
  duration_seconds: number | null;
  recording_url: string | null;
  started_at: string;
  contacts: { id: string; name: string } | { id: string; name: string }[] | null;
};

const STATUS_STYLES: Record<string, string> = {
  voicemail: "border-cyan/40 bg-cyan/10 text-cyan",
  completed: "border-success/40 bg-success/10 text-success",
  missed: "border-alert/40 bg-alert/10 text-alert",
  failed: "border-destructive/40 bg-destructive/10 text-[#ffb3bb]",
  "in-progress": "border-border/70 text-steel",
};

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export default async function CallsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, from_number, status, duration_seconds, recording_url, started_at, contacts ( id, name )"
    )
    .eq("tenant_id", active.organization_id)
    .order("started_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(`Failed to load calls: ${error.message}`);
  const calls = (data ?? []) as unknown as CallRow[];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Calls</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every call to your number, logged automatically. The AI starts answering
        them at M7.
      </p>

      <Card className="mt-6 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <PhoneIncoming className="size-4 text-cyan" aria-hidden />
            Call log
          </CardTitle>
          <CardDescription>
            Voicemails play right here — no Twilio login needed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No calls yet. Once your number is assigned and pointed at the
              webhook, call it — it shows up here within seconds.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {calls.map((call) => {
                const contact = Array.isArray(call.contacts)
                  ? call.contacts[0]
                  : call.contacts;
                return (
                  <li key={call.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {contact ? (
                          <Link
                            href={`/dashboard/contacts/${contact.id}`}
                            className="hover:text-cyan"
                          >
                            {contact.name}
                          </Link>
                        ) : (
                          formatUsPhone(call.from_number) || "Unknown caller"
                        )}
                        {contact && (
                          <span className="ml-2 font-mono text-xs text-steel">
                            {formatUsPhone(call.from_number)}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {new Date(call.started_at).toLocaleString()} ·{" "}
                        <span className="font-mono">{fmtDuration(call.duration_seconds)}</span>
                      </p>
                    </div>
                    {call.recording_url && (
                      <audio
                        controls
                        preload="none"
                        src={`/api/recordings/${call.id}`}
                        className="h-9 max-w-56"
                        aria-label={`Voicemail from ${contact?.name ?? formatUsPhone(call.from_number)}`}
                      />
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        STATUS_STYLES[call.status] ?? "border-border/70 text-steel"
                      )}
                    >
                      {call.status === "voicemail" && (
                        <Voicemail className="size-3" aria-hidden />
                      )}
                      {call.status}
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
