import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  NotebookPen,
  PhoneCall,
  Sparkles,
  UserRound,
} from "lucide-react";

import { FormBanner } from "@/components/form-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { requireActiveOrg } from "@/lib/auth";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import {
  addNote,
  createLead,
  deleteContact,
  updateContact,
  updateLeadStatus,
} from "../actions";

export const metadata: Metadata = { title: "Contact" };

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type Contact = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  consent_sms: boolean;
  consent_source: string | null;
  consent_timestamp: string | null;
  created_at: string;
};

type Lead = {
  id: string;
  status: string;
  source: string;
  service_needed: string | null;
  urgency: string | null;
  created_at: string;
};

type TimelineEvent = {
  id: string;
  event_type: string;
  summary: string;
  created_at: string;
};

const EVENT_ICONS: Record<string, typeof NotebookPen> = {
  note: NotebookPen,
  lead: Sparkles,
  call: PhoneCall,
  sms: MessageSquare,
  contact_created: UserRound,
};

const LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"] as const;

export default async function ContactDetailPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const saved = sp.saved === "1";

  await requireActiveOrg();
  const supabase = await createClient();

  const { data: contact } = await supabase
    .from("contacts")
    .select(
      "id, name, phone, email, address, notes, tags, consent_sms, consent_source, consent_timestamp, created_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (!contact) notFound();
  const c = contact as Contact;

  const [{ data: leads }, { data: events }] = await Promise.all([
    supabase
      .from("leads")
      .select("id, status, source, service_needed, urgency, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_timeline_events")
      .select("id, event_type, summary, created_at")
      .eq("contact_id", id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <Link
        href="/dashboard/contacts"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden /> All contacts
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight">{c.name}</h1>
        {c.phone && (
          <span className="font-mono text-sm text-steel">{formatUsPhone(c.phone)}</span>
        )}
        {c.tags.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border/70 px-2 py-0.5 text-xs text-steel"
          >
            {t}
          </span>
        ))}
      </div>

      {error && <div className="mt-5"><FormBanner kind="error">{error}</FormBanner></div>}
      {saved && <div className="mt-5"><FormBanner kind="success">Saved.</FormBanner></div>}

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* ── Left: details + leads ── */}
        <div className="space-y-6">
          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Details</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={updateContact} className="space-y-4">
                <input type="hidden" name="id" value={c.id} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input id="name" name="name" defaultValue={c.name} required maxLength={160} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      defaultValue={formatUsPhone(c.phone)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" name="email" type="email" defaultValue={c.email ?? ""} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="address">Address</Label>
                    <Input id="address" name="address" defaultValue={c.address ?? ""} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (comma-separated)</Label>
                  <Input
                    id="tags"
                    name="tags"
                    defaultValue={c.tags.join(", ")}
                    placeholder="vip, repeat customer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">General notes</Label>
                  <Textarea id="notes" name="notes" defaultValue={c.notes ?? ""} />
                </div>
                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    name="consent_sms"
                    defaultChecked={c.consent_sms}
                    className="mt-1 accent-cyan"
                  />
                  <span>
                    <span className="font-medium text-foreground">OK to text this contact</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {c.consent_timestamp
                        ? `Last changed ${new Date(c.consent_timestamp).toLocaleDateString()} (${c.consent_source ?? "unknown"}).`
                        : "Off until they agree — texting without consent is blocked platform-wide."}
                    </span>
                  </span>
                </label>
                <div className="flex items-center justify-between">
                  <Button type="submit">Save changes</Button>
                </div>
              </form>
              <form
                action={deleteContact}
                className="mt-3 border-t border-border/40 pt-3 text-right"
              >
                <input type="hidden" name="id" value={c.id} />
                <Button type="submit" variant="ghost" size="sm">
                  Delete contact
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Leads</CardTitle>
              <CardDescription>
                Work requests from this contact. At M7 the AI opens these from calls.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(leads ?? []).length > 0 && (
                <ul className="mb-4 space-y-2.5">
                  {(leads as Lead[]).map((l) => (
                    <li
                      key={l.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 px-3.5 py-2.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-foreground">
                          {l.service_needed ?? "General inquiry"}
                          {l.urgency && (
                            <span className="ml-2 text-xs text-steel">({l.urgency})</span>
                          )}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {l.source} · {new Date(l.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <form action={updateLeadStatus} className="flex items-center gap-2">
                        <input type="hidden" name="contact_id" value={c.id} />
                        <input type="hidden" name="lead_id" value={l.id} />
                        <Select
                          name="status"
                          defaultValue={l.status}
                          className="h-8 w-32 text-xs"
                          aria-label="Lead status"
                        >
                          {LEAD_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </Select>
                        <Button type="submit" variant="outline" size="sm">
                          Set
                        </Button>
                      </form>
                    </li>
                  ))}
                </ul>
              )}
              <form action={createLead} className="flex flex-wrap items-end gap-3">
                <input type="hidden" name="contact_id" value={c.id} />
                <div className="flex-1 space-y-2 sm:max-w-56">
                  <Label htmlFor="service_needed">Service needed</Label>
                  <Input id="service_needed" name="service_needed" placeholder="Tow to shop" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="urgency">Urgency</Label>
                  <Select id="urgency" name="urgency" defaultValue="normal" className="w-32">
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="emergency">Emergency</option>
                  </Select>
                </div>
                <Button type="submit" variant="outline">
                  Add lead
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>

        {/* ── Right: notes + timeline ── */}
        <div className="space-y-6">
          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Add a note</CardTitle>
            </CardHeader>
            <CardContent>
              <form action={addNote} className="space-y-3">
                <input type="hidden" name="contact_id" value={c.id} />
                <Label htmlFor="note" className="sr-only">
                  Note
                </Label>
                <Textarea
                  id="note"
                  name="note"
                  placeholder="Called about a dead battery on Route 20…"
                  required
                  maxLength={5000}
                />
                <Button type="submit" variant="outline">
                  Add note
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-card/60">
            <CardHeader className="pb-3">
              <CardTitle className="font-display text-base">Timeline</CardTitle>
              <CardDescription>
                Notes now; calls, texts, and jobs join automatically as milestones land.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {(events ?? []).length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  Nothing yet.
                </p>
              ) : (
                <ol className="space-y-3">
                  {(events as TimelineEvent[]).map((e) => {
                    const Icon = EVENT_ICONS[e.event_type] ?? NotebookPen;
                    return (
                      <li key={e.id} className="flex gap-3">
                        <span className="mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full border border-border/60 bg-night/60">
                          <Icon className="size-3.5 text-cyan" aria-hidden />
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm leading-snug text-foreground">{e.summary}</p>
                          <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
                            {e.event_type.replace("_", " ")} ·{" "}
                            {new Date(e.created_at).toLocaleString()}
                          </p>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
