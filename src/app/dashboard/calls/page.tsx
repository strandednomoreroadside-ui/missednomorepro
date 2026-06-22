import type { Metadata } from "next";
import Link from "next/link";
import { Bot, PhoneIncoming, Voicemail } from "lucide-react";

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
import { DISPOSITION_META } from "@/lib/voice/dispositions";

export const metadata: Metadata = { title: "Calls" };

type CallRow = {
  id: string;
  from_number: string | null;
  status: string;
  disposition: string | null;
  ai_handled: boolean;
  duration_seconds: number | null;
  recording_url: string | null;
  started_at: string;
  contacts: { id: string; name: string } | { id: string; name: string }[] | null;
  call_transcripts:
    | { summary: string | null }
    | { summary: string | null }[]
    | null;
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

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function CallsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const tz = await getBusinessTimezone(active.organization_id);

  const { data, error } = await supabase
    .from("calls")
    .select(
      "id, from_number, status, disposition, ai_handled, duration_seconds, recording_url, started_at, contacts ( id, name ), call_transcripts ( summary )"
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
        Every call to your number. Your AI receptionist answers, qualifies the
        caller, and writes a summary — click any call to read it.
      </p>

      <Card className="mt-6 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <PhoneIncoming className="size-4 text-cyan" aria-hidden />
            Call log
          </CardTitle>
          <CardDescription>
            AI calls show a summary and disposition; voicemails play right here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calls.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No calls yet. Once your number is assigned and your business is
              live, call it — it shows up here within seconds.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {calls.map((call) => {
                const contact = one(call.contacts);
                const summary = one(call.call_transcripts)?.summary ?? null;
                const disp = call.disposition
                  ? DISPOSITION_META[call.disposition]
                  : null;
                return (
                  <li key={call.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Link href={`/dashboard/calls/${call.id}`} className="hover:text-cyan">
                          {contact
                            ? contact.name
                            : formatUsPhone(call.from_number) || "Unknown caller"}
                        </Link>
                        {call.ai_handled && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/5 px-1.5 py-0.5 text-[10px] font-medium text-cyan"
                            title="Answered by your AI receptionist"
                          >
                            <Bot className="size-3" aria-hidden /> AI
                          </span>
                        )}
                        {contact && (
                          <span className="font-mono text-xs text-steel">
                            {formatUsPhone(call.from_number)}
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {formatDateTimeInZone(call.started_at, tz)} ·{" "}
                        <span className="font-mono">
                          {fmtDuration(call.duration_seconds)}
                        </span>
                      </p>
                      {summary && (
                        <p className="mt-1 line-clamp-2 text-xs text-steel">{summary}</p>
                      )}
                    </div>
                    {call.recording_url && (
                      <audio
                        controls
                        preload="none"
                        src={`/api/recordings/${call.id}`}
                        className="h-9 max-w-56"
                        aria-label={`Recording from ${contact?.name ?? formatUsPhone(call.from_number)}`}
                      />
                    )}
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        disp
                          ? disp.className
                          : STATUS_STYLES[call.status] ?? "border-border/70 text-steel"
                      )}
                    >
                      {call.status === "voicemail" && !disp && (
                        <Voicemail className="size-3" aria-hidden />
                      )}
                      {disp ? disp.label : call.status}
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
