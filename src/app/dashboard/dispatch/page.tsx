import type { Metadata } from "next";
import Link from "next/link";
import { CalendarRange, MapPin, Send, TriangleAlert, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { addDays, parseDateString, todayInZone, zonedTimeToUtc } from "@/lib/calendar/timezone";
import { createClient } from "@/lib/supabase/server";
import { updateJobStatus } from "@/app/dashboard/jobs/actions";

import { assignWork, textTechSchedule } from "./actions";

export const metadata: Metadata = { title: "Dispatch" };

type Ymd = { year: number; month: number; day: number };
type Staff = { id: string; name: string };
type Item = {
  kind: "job" | "appointment";
  id: string;
  iso: string | null;
  title: string;
  customer: string | null;
  address: string | null;
  status: string;
  assignedTo: string | null;
};

const ymd = (d: Ymd) =>
  `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
const one = <T,>(v: T | T[] | null | undefined): T | null =>
  Array.isArray(v) ? (v[0] ?? null) : (v ?? null);

export default async function DispatchPage({
  searchParams,
}: {
  searchParams: Promise<{ d?: string; view?: string }>;
}) {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);

  if (!ent.has("dispatch_board")) {
    return (
      <div className="mx-auto max-w-3xl">
        <Header />
        <Card className="mt-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-amber-500">
              <TriangleAlert className="size-4" aria-hidden />
              Professional plan required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            The dispatch board and team schedule are on <strong>Professional</strong> and up.{" "}
            <Link href="/dashboard/billing" className="text-cyan hover:underline">
              Upgrade
            </Link>{" "}
            to plan your team&rsquo;s day and assign jobs.
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: business } = await supabase
    .from("businesses")
    .select("id, timezone")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const tz = (business?.timezone as string) || "America/New_York";

  const params = await searchParams;
  const isWeek = params.view === "week" && ent.has("team_calendar");
  const start = parseDateString(params.d ?? "") ?? todayInZone(tz);
  const days = isWeek ? 7 : 1;
  const end = addDays(start, days);
  const fromIso = zonedTimeToUtc(start.year, start.month, start.day, 0, 0, tz).toISOString();
  const toIso = zonedTimeToUtc(end.year, end.month, end.day, 0, 0, tz).toISOString();

  const [{ data: appts }, { data: jobs }, { data: staffRows }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, title, starts_at, location, status, assigned_to, contacts ( name )")
      .eq("tenant_id", tenantId)
      .eq("status", "confirmed")
      .gte("starts_at", fromIso)
      .lt("starts_at", toIso)
      .order("starts_at", { ascending: true }),
    supabase
      .from("jobs")
      .select("id, title, scheduled_for, address, status, assigned_to, appointment_id, contacts ( name )")
      .eq("tenant_id", tenantId)
      .in("status", ["scheduled", "in_progress"])
      .gte("scheduled_for", fromIso)
      .lt("scheduled_for", toIso)
      .order("scheduled_for", { ascending: true }),
    supabase
      .from("staff_contacts")
      .select("id, name")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true }),
  ]);

  const staff = (staffRows ?? []) as Staff[];
  const staffName = new Map(staff.map((s) => [s.id, s.name]));

  // A booking creates both an appointment row (what syncs to Google Calendar)
  // and a linked job row (the work order — status + tech assignment) in the
  // same call. Showing both on the board reads as a double-booking for what
  // is really one job. The job is the operationally useful one (it carries
  // status + assignment), so once a job links back to an appointment, drop
  // that appointment's own row and let the job represent it.
  const jobbedApptIds = new Set((jobs ?? []).map((j) => j.appointment_id as string | null).filter(Boolean));

  const items: Item[] = [
    ...(appts ?? [])
      .filter((a) => !jobbedApptIds.has(a.id as string))
      .map((a) => ({
        kind: "appointment" as const,
        id: a.id as string,
        iso: a.starts_at as string,
        title: a.title as string,
        customer: one(a.contacts)?.name ?? null,
        address: (a.location as string | null) ?? null,
        status: a.status as string,
        assignedTo: (a.assigned_to as string | null) ?? null,
      })),
    ...(jobs ?? []).map((j) => ({
      kind: "job" as const,
      id: j.id as string,
      iso: (j.scheduled_for as string | null) ?? null,
      title: j.title as string,
      customer: one(j.contacts)?.name ?? null,
      address: (j.address as string | null) ?? null,
      status: j.status as string,
      assignedTo: (j.assigned_to as string | null) ?? null,
    })),
  ].sort((a, b) => (a.iso ?? "").localeCompare(b.iso ?? ""));

  const prev = ymd(addDays(start, -days));
  const nextNav = ymd(addDays(start, days));
  const todayStr = ymd(todayInZone(tz));

  // Group by local day for the week view.
  const dayKey = (iso: string | null) =>
    iso ? new Date(iso).toLocaleDateString("en-CA", { timeZone: tz }) : "unscheduled";
  const byDay = new Map<string, Item[]>();
  for (const it of items) {
    const k = dayKey(it.iso);
    (byDay.get(k) ?? byDay.set(k, []).get(k)!).push(it);
  }

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Header />
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/dispatch?view=day&d=${todayStr}`}
            className={`rounded-lg border px-3 py-1.5 text-sm ${!isWeek ? "border-cyan/50 bg-cyan/5 text-cyan" : "border-border text-muted-foreground hover:text-foreground"}`}
          >
            Day
          </Link>
          {ent.has("team_calendar") && (
            <Link
              href={`/dashboard/dispatch?view=week&d=${ymd(start)}`}
              className={`rounded-lg border px-3 py-1.5 text-sm ${isWeek ? "border-cyan/50 bg-cyan/5 text-cyan" : "border-border text-muted-foreground hover:text-foreground"}`}
            >
              Week
            </Link>
          )}
        </div>
      </div>

      {/* Date nav */}
      <div className="mt-5 flex items-center justify-between">
        <Link
          href={`/dashboard/dispatch?view=${isWeek ? "week" : "day"}&d=${prev}`}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          ← Prev
        </Link>
        <span className="font-display text-sm font-semibold">
          {new Date(fromIso).toLocaleDateString("en-US", {
            weekday: isWeek ? undefined : "long",
            month: "long",
            day: "numeric",
            year: "numeric",
            timeZone: tz,
          })}
          {isWeek && (
            <>
              {" – "}
              {new Date(zonedTimeToUtc(addDays(start, 6).year, addDays(start, 6).month, addDays(start, 6).day, 12, 0, tz)).toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: tz })}
            </>
          )}
        </span>
        <Link
          href={`/dashboard/dispatch?view=${isWeek ? "week" : "day"}&d=${nextNav}`}
          className="rounded-lg border border-border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          Next →
        </Link>
      </div>

      {items.length === 0 ? (
        <Card className="mt-5 bg-card/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Nothing scheduled for this {isWeek ? "week" : "day"}.
          </CardContent>
        </Card>
      ) : isWeek ? (
        <div className="mt-5 space-y-5">
          {Array.from({ length: 7 }).map((_, i) => {
            const d = addDays(start, i);
            const k = `${d.year}-${String(d.month).padStart(2, "0")}-${String(d.day).padStart(2, "0")}`;
            const dayItems = byDay.get(k) ?? [];
            return (
              <div key={k}>
                <h3 className="mb-2 font-mono text-xs uppercase tracking-wider text-steel">
                  {new Date(zonedTimeToUtc(d.year, d.month, d.day, 12, 0, tz)).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: tz })}
                  <span className="ml-2 text-muted-foreground">{dayItems.length || ""}</span>
                </h3>
                {dayItems.length === 0 ? (
                  <p className="text-xs text-muted-foreground">—</p>
                ) : (
                  <div className="space-y-2">
                    {dayItems.map((it) => (
                      <Row key={`${it.kind}-${it.id}`} item={it} tz={tz} staff={staff} staffName={staffName} date={ymd(start)} compact />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 space-y-2">
          {items.map((it) => (
            <Row key={`${it.kind}-${it.id}`} item={it} tz={tz} staff={staff} staffName={staffName} date={ymd(start)} />
          ))}
        </div>
      )}

      {/* Per-tech "text my schedule" */}
      {!isWeek && staff.length > 0 && (
        <Card className="mt-6 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <Send className="size-4 text-cyan" aria-hidden />
              Text a tech their day
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form action={textTechSchedule} className="flex flex-wrap items-center gap-2">
              <input type="hidden" name="date" value={ymd(start)} />
              <select
                name="staff_id"
                className="h-9 rounded-md border border-input bg-night/60 px-2 text-sm"
                aria-label="Team member"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button type="submit" size="sm" variant="outline">
                Text schedule
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <CalendarRange className="size-6 text-cyan" aria-hidden />
        Dispatch
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your team&rsquo;s day — assign work and keep everyone moving.
      </p>
    </div>
  );
}

const JOB_STATUSES = ["scheduled", "in_progress", "completed", "canceled"] as const;

function Row({
  item,
  tz,
  staff,
  staffName,
  date,
  compact,
}: {
  item: Item;
  tz: string;
  staff: Staff[];
  staffName: Map<string, string>;
  date: string;
  compact?: boolean;
}) {
  const time = item.iso
    ? new Date(item.iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: tz })
    : "—";
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-card/40 px-4 py-3">
      <span className="w-20 shrink-0 font-mono text-sm text-cyan">{time}</span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="truncate text-sm font-medium text-foreground">{item.title}</span>
          <span className="rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-steel">
            {item.kind}
          </span>
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
          {item.customer && (
            <span className="inline-flex items-center gap-1">
              <User className="size-3" aria-hidden />
              {item.customer}
            </span>
          )}
          {item.address && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3" aria-hidden />
              {item.address}
            </span>
          )}
        </div>
      </div>

      {/* Assign */}
      <form action={assignWork} className="flex items-center gap-1.5">
        <input type="hidden" name="kind" value={item.kind} />
        <input type="hidden" name="id" value={item.id} />
        <select
          name="assigned_to"
          defaultValue={item.assignedTo ?? ""}
          className="h-9 max-w-32 rounded-md border border-input bg-night/60 px-2 text-xs sm:h-8"
          aria-label="Assign to"
        >
          <option value="">Unassigned</option>
          {staff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm" variant="ghost" className="h-9 px-2 text-xs sm:h-8">
          Set
        </Button>
      </form>

      {/* Job status (appointments are managed on the calendar) */}
      {item.kind === "job" && !compact && (
        <form action={updateJobStatus} className="flex items-center gap-1.5">
          <input type="hidden" name="job_id" value={item.id} />
          <select
            name="status"
            defaultValue={item.status}
            className="h-9 rounded-md border border-input bg-night/60 px-2 text-xs sm:h-8"
            aria-label="Job status"
          >
            {JOB_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.replace("_", " ")}
              </option>
            ))}
          </select>
          <Button type="submit" size="sm" variant="ghost" className="h-9 px-2 text-xs sm:h-8">
            Update
          </Button>
        </form>
      )}
      {item.assignedTo && (
        <span className="hidden font-mono text-[10px] uppercase tracking-wider text-cyan sm:inline">
          {staffName.get(item.assignedTo) ?? ""}
        </span>
      )}
    </div>
  );
}
