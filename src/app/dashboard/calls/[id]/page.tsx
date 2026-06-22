import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bot,
  ClipboardList,
  ListChecks,
  PhoneCall,
  Sparkles,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getBusinessTimezone } from "@/lib/business/timezone";
import { formatDateTimeInZone, formatTimeInZone } from "@/lib/calendar/timezone";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";
import { DISPOSITION_META } from "@/lib/voice/dispositions";

export const metadata: Metadata = { title: "Call" };

type Params = Promise<{ id: string }>;

type CallRow = {
  id: string;
  from_number: string | null;
  to_number: string | null;
  status: string;
  disposition: string | null;
  ai_handled: boolean;
  duration_seconds: number | null;
  recording_url: string | null;
  started_at: string;
  ended_at: string | null;
  contacts: { id: string; name: string } | { id: string; name: string }[] | null;
};

type Transcript = {
  summary: string | null;
  sentiment: string | null;
  action_items: unknown;
  redacted_text: string | null;
  pii_redacted: boolean;
};

type ToolCall = {
  id: string;
  tool_name: string;
  status: string;
  result: Record<string, unknown> | null;
  error: string | null;
  created_at: string;
};

type Task = {
  id: string;
  type: string;
  title: string;
  details: string | null;
  status: string;
  priority: string;
  created_at: string;
};

const SENTIMENT_STYLES: Record<string, string> = {
  positive: "text-success",
  negative: "text-[#ffb3bb]",
  neutral: "text-steel",
};

function fmtDuration(seconds: number | null): string {
  if (!seconds) return "—";
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

/** Plain-English line for each AI action, for the non-technical operator. */
function describeToolCall(tc: ToolCall): string {
  const r = tc.result ?? {};
  switch (tc.tool_name) {
    case "lookup_contact":
      return r.found ? "Recognized a returning caller" : "Checked — new caller";
    case "create_contact":
      return r.lead_id ? "Saved the contact and opened a lead" : "Saved the contact";
    case "search_knowledge_base":
      return `Searched your FAQs (${Number(r.count ?? 0)} match${
        Number(r.count ?? 0) === 1 ? "" : "es"
      })`;
    case "check_service_area":
      return r.covered === false
        ? "Checked service area — outside it"
        : "Checked service area — covered";
    case "notify_staff":
      return r.notified
        ? `Texted staff (${Number(r.sent ?? 0)} sent)`
        : "Tried to alert staff — none configured";
    case "escalate_to_human":
      return "Escalated to a human";
    case "mark_spam":
      return "Marked the call as spam";
    case "create_follow_up_task":
      return "Created a follow-up task";
    default:
      return tc.tool_name;
  }
}

const TASK_TYPE_LABELS: Record<string, string> = {
  quote_request: "Quote request",
  callback: "Callback",
  escalation: "Escalation",
  general: "Follow-up",
};

export default async function CallDetailPage({ params }: { params: Params }) {
  const { id } = await params;
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const tz = await getBusinessTimezone(active.organization_id);

  const { data: callData } = await supabase
    .from("calls")
    .select(
      "id, from_number, to_number, status, disposition, ai_handled, duration_seconds, recording_url, started_at, ended_at, contacts ( id, name )"
    )
    .eq("id", id)
    .eq("tenant_id", active.organization_id)
    .maybeSingle();
  if (!callData) notFound();
  const call = callData as unknown as CallRow;
  const contact = one(call.contacts);

  const [{ data: transcriptData }, { data: toolCallData }, { data: taskData }] =
    await Promise.all([
      supabase
        .from("call_transcripts")
        .select("summary, sentiment, action_items, redacted_text, pii_redacted")
        .eq("call_id", id)
        .maybeSingle(),
      supabase
        .from("tool_calls")
        .select("id, tool_name, status, result, error, created_at")
        .eq("call_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("follow_up_tasks")
        .select("id, type, title, details, status, priority, created_at")
        .eq("call_id", id)
        .order("created_at", { ascending: true }),
    ]);

  const transcript = (transcriptData as Transcript | null) ?? null;
  const toolCalls = (toolCallData as ToolCall[] | null) ?? [];
  const tasks = (taskData as Task[] | null) ?? [];
  const actionItems: string[] = Array.isArray(transcript?.action_items)
    ? (transcript!.action_items as unknown[]).map(String)
    : [];
  const disp = call.disposition ? DISPOSITION_META[call.disposition] : null;

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/calls"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All calls
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">
          {contact ? (
            <Link href={`/dashboard/contacts/${contact.id}`} className="hover:text-cyan">
              {contact.name}
            </Link>
          ) : (
            formatUsPhone(call.from_number) || "Unknown caller"
          )}
        </h1>
        {call.ai_handled && (
          <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/5 px-2 py-0.5 text-xs font-medium text-cyan">
            <Bot className="size-3.5" aria-hidden /> AI receptionist
          </span>
        )}
        {disp && (
          <span
            className={cn(
              "inline-flex items-center rounded-full border px-2 py-0.5 text-xs",
              disp.className
            )}
          >
            {disp.label}
          </span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {contact && (
          <span className="font-mono text-steel">{formatUsPhone(call.from_number)} · </span>
        )}
        {formatDateTimeInZone(call.started_at, tz)} ·{" "}
        <span className="font-mono">{fmtDuration(call.duration_seconds)}</span>
      </p>

      {call.recording_url && (
        <audio
          controls
          preload="none"
          src={`/api/recordings/${call.id}`}
          className="mt-4 h-10 w-full max-w-md"
          aria-label="Call recording"
        />
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ── Left: summary + transcript ── */}
        <div className="space-y-6">
          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Sparkles className="size-4 text-cyan" aria-hidden /> Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              {transcript?.summary ? (
                <p className="text-sm leading-relaxed text-foreground">
                  {transcript.summary}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No summary yet. It appears moments after the call ends.
                </p>
              )}
              {transcript?.sentiment && (
                <p className="mt-3 text-xs">
                  <span className="text-muted-foreground">Caller sentiment: </span>
                  <span
                    className={cn(
                      "font-medium",
                      SENTIMENT_STYLES[transcript.sentiment] ?? "text-steel"
                    )}
                  >
                    {transcript.sentiment}
                  </span>
                </p>
              )}
              {actionItems.length > 0 && (
                <div className="mt-4">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                    <ListChecks className="size-3.5 text-cyan" aria-hidden /> Action items
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {actionItems.map((item, i) => (
                      <li key={i} className="flex gap-2 text-sm text-steel">
                        <span className="text-cyan">•</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Transcript</CardTitle>
              <CardDescription>
                {transcript?.pii_redacted
                  ? "Sensitive details are masked here; the full copy is encrypted."
                  : "What was said on the call."}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {transcript?.redacted_text ? (
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap font-sans text-sm leading-relaxed text-steel">
                  {transcript.redacted_text}
                </pre>
              ) : (
                <p className="text-sm text-muted-foreground">No transcript captured.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Right: AI actions + follow-ups ── */}
        <div className="space-y-6">
          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Bot className="size-4 text-cyan" aria-hidden /> What the AI did
              </CardTitle>
              <CardDescription>Every action, in order, during the call.</CardDescription>
            </CardHeader>
            <CardContent>
              {toolCalls.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No tools were used on this call.
                </p>
              ) : (
                <ol className="space-y-3">
                  {toolCalls.map((tc) => (
                    <li key={tc.id} className="flex gap-3">
                      <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-night/60">
                        <PhoneCall className="size-3.5 text-cyan" aria-hidden />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm leading-snug text-foreground">
                          {describeToolCall(tc)}
                          {tc.status !== "ok" && (
                            <span className="ml-2 text-xs text-[#ffb3bb]">({tc.status})</span>
                          )}
                        </p>
                        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
                          {tc.tool_name} · {formatTimeInZone(tc.created_at, tz)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <ClipboardList className="size-4 text-cyan" aria-hidden /> Follow-ups
              </CardTitle>
              <CardDescription>Tasks the AI created for your team.</CardDescription>
            </CardHeader>
            <CardContent>
              {tasks.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No follow-up tasks from this call.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {tasks.map((t) => (
                    <li
                      key={t.id}
                      className="rounded-lg border border-border/40 px-3.5 py-2.5"
                    >
                      <div className="flex items-center gap-2">
                        <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase tracking-wider text-steel">
                          {TASK_TYPE_LABELS[t.type] ?? t.type}
                        </span>
                        {t.priority === "urgent" && (
                          <span className="rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-[#ffb3bb]">
                            urgent
                          </span>
                        )}
                        <span className="ml-auto text-[10px] text-steel">{t.status}</span>
                      </div>
                      <p className="mt-1.5 text-sm text-foreground">{t.title}</p>
                      {t.details && (
                        <p className="mt-0.5 text-xs text-muted-foreground">{t.details}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
