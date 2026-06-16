import type { Metadata } from "next";
import Link from "next/link";
import { Bot, CalendarCheck, MapPin } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

import { updateJobStatus } from "./actions";

export const metadata: Metadata = { title: "Jobs" };

type JobRow = {
  id: string;
  title: string;
  status: string;
  scheduled_for: string | null;
  address: string | null;
  source: string;
  created_at: string;
  contacts: { id: string; name: string } | { id: string; name: string }[] | null;
};

const STATUS_META: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "border-border/70 text-steel" },
  scheduled: { label: "Scheduled", className: "border-cyan/40 bg-cyan/10 text-cyan" },
  in_progress: { label: "In progress", className: "border-alert/40 bg-alert/10 text-alert" },
  completed: { label: "Completed", className: "border-success/40 bg-success/10 text-success" },
  canceled: { label: "Canceled", className: "border-border/60 text-muted-foreground" },
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function JobsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("timezone")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const tz = (business?.timezone as string) || "America/New_York";

  const { data, error } = await supabase
    .from("jobs")
    .select(
      "id, title, status, scheduled_for, address, source, created_at, contacts ( id, name )"
    )
    .eq("tenant_id", active.organization_id)
    .order("scheduled_for", { ascending: true, nullsFirst: false })
    .limit(200);
  if (error) throw new Error(`Failed to load jobs: ${error.message}`);
  const jobs = (data ?? []) as unknown as JobRow[];

  const fmt = (iso: string) =>
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(iso));

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Jobs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every appointment your AI books becomes a job here. Update status as your
        team works it.
      </p>

      <Card className="mt-6 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <CalendarCheck className="size-4 text-cyan" aria-hidden />
            Scheduled work
          </CardTitle>
          <CardDescription>
            Booked appointments and their status. Times are in your business
            timezone.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {jobs.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No jobs yet. Connect Google Calendar in Settings, then when a caller
              books an appointment it appears here.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {jobs.map((job) => {
                const contact = one(job.contacts);
                const meta = STATUS_META[job.status] ?? STATUS_META.new;
                return (
                  <li key={job.id} className="flex flex-wrap items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2 text-sm font-medium text-foreground">
                        {job.title}
                        {job.source === "ai" && (
                          <span
                            className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/5 px-1.5 py-0.5 text-[10px] font-medium text-cyan"
                            title="Booked by your AI receptionist"
                          >
                            <Bot className="size-3" aria-hidden /> AI
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {job.scheduled_for ? fmt(job.scheduled_for) : "Unscheduled"}
                        {contact && (
                          <>
                            {" · "}
                            <Link
                              href={`/dashboard/contacts/${contact.id}`}
                              className="hover:text-cyan"
                            >
                              {contact.name}
                            </Link>
                          </>
                        )}
                      </p>
                      {job.address && (
                        <p className="mt-1 inline-flex items-center gap-1 text-xs text-steel">
                          <MapPin className="size-3" aria-hidden />
                          {job.address}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs",
                        meta.className
                      )}
                    >
                      {meta.label}
                    </span>
                    <form action={updateJobStatus} className="flex items-center gap-1">
                      <input type="hidden" name="job_id" value={job.id} />
                      <Select
                        name="status"
                        defaultValue={job.status}
                        className="h-8 w-32 text-xs"
                        aria-label="Update job status"
                      >
                        {Object.entries(STATUS_META).map(([value, m]) => (
                          <option key={value} value={value}>
                            {m.label}
                          </option>
                        ))}
                      </Select>
                      <Button type="submit" variant="outline" size="sm">
                        Update
                      </Button>
                    </form>
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
