import type { Metadata } from "next";
import {
  BellRing,
  CalendarCheck,
  CheckCircle2,
  MessageSquare,
  Phone,
  PhoneCall,
  TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireActiveOrg } from "@/lib/auth";
import { isGoogleConfigured } from "@/lib/google/credentials";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  updateBookingConfirmation,
  updateReminders,
  updateTextBack,
} from "./actions";

const DEFAULT_REMINDER_TEMPLATE =
  "Reminder: your appointment with {business} is {time}. Need to change it? Just call us back. Reply STOP to opt out.";

export const metadata: Metadata = { title: "Settings" };

type NumberRow = {
  id: string;
  phone_number: string;
  type: string;
  voice_enabled: boolean;
  sms_enabled: boolean;
  a2p_status: string;
};

const DEFAULT_TEMPLATE =
  "Hi! Thanks for calling {business}. Sorry we missed you — text us back here and we'll help right away. Reply STOP to opt out.";
const DEFAULT_BOOKING_TEMPLATE =
  "You're booked with {business} for {time}. Reply STOP to opt out.";

const CALENDAR_BANNERS: Record<string, { ok: boolean; text: string }> = {
  connected: { ok: true, text: "Google Calendar connected — your AI can now book appointments." },
  denied: { ok: false, text: "Calendar connection was canceled." },
  norefresh: {
    ok: false,
    text: "Google didn't return a refresh token. In your Google Account → Security → Third-party access, remove this app, then connect again.",
  },
  unconfigured: {
    ok: false,
    text: "Calendar isn't configured on the server yet (missing Google credentials).",
  },
  nobusiness: { ok: false, text: "Finish the setup wizard before connecting a calendar." },
  error: { ok: false, text: "Something went wrong connecting your calendar. Please try again." },
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ calendar?: string }>;
}) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const params = await searchParams;
  const banner = params.calendar ? CALENDAR_BANNERS[params.calendar] : undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [{ data: numbers }, { data: sms }, { data: calendar }] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select("id, phone_number, type, voice_enabled, sms_enabled, a2p_status")
      .eq("tenant_id", active.organization_id)
      .order("created_at", { ascending: true }),
    business
      ? supabase
          .from("sms_settings")
          .select(
            "text_back_enabled, text_back_template, booking_confirmation_template, reminder_enabled, reminder_lead_hours, reminder_template"
          )
          .eq("business_id", business.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    business
      ? supabase
          .from("calendar_connections")
          .select("google_account_email, status, connected_at")
          .eq("business_id", business.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = (numbers ?? []) as NumberRow[];
  const textBackEnabled = (sms?.text_back_enabled ?? true) as boolean;
  const textBackTemplate = (sms?.text_back_template ?? DEFAULT_TEMPLATE) as string;
  const bookingTemplate = (sms?.booking_confirmation_template ??
    DEFAULT_BOOKING_TEMPLATE) as string;
  const reminderEnabled = (sms?.reminder_enabled ?? true) as boolean;
  const reminderLeadHours = (sms?.reminder_lead_hours ?? 24) as number;
  const reminderTemplate = (sms?.reminder_template ??
    DEFAULT_REMINDER_TEMPLATE) as string;
  const cal = calendar as
    | { google_account_email: string | null; status: string; connected_at: string }
    | null;
  const calConnected = cal?.status === "connected";
  const googleConfigured = isGoogleConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your number, calendar booking, and text behavior.
      </p>

      {banner && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${
            banner.ok
              ? "border-cyan/40 bg-cyan/5 text-foreground"
              : "border-amber-500/40 bg-amber-500/5 text-foreground"
          }`}
        >
          {banner.ok ? (
            <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-cyan" aria-hidden />
          ) : (
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
          )}
          <span>{banner.text}</span>
        </div>
      )}

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Phone className="size-4 text-cyan" aria-hidden />
            Your business number
          </CardTitle>
          <CardDescription>
            Your AI receptionist answers this number; calls are logged under Calls
            and texts under Messages.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {rows.length === 0 ? (
            <p className="rounded-lg border border-border/40 px-3.5 py-4 text-sm text-muted-foreground">
              No number assigned yet. During beta, numbers are assigned by the
              platform team — yours will appear here the moment it&rsquo;s attached.
            </p>
          ) : (
            <ul className="space-y-3">
              {rows.map((n) => (
                <li
                  key={n.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 px-3.5 py-3"
                >
                  <span className="font-mono text-lg text-cyan">
                    {formatUsPhone(n.phone_number)}
                  </span>
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

      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <CalendarCheck className="size-4 text-cyan" aria-hidden />
            Calendar booking
          </CardTitle>
          <CardDescription>
            Connect Google Calendar so your AI can book appointments inside your
            business hours and add them to your calendar automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {calConnected ? (
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 px-3.5 py-3">
              <CheckCircle2 className="size-5 text-cyan" aria-hidden />
              <span className="text-sm">
                Connected
                {cal?.google_account_email ? (
                  <span className="text-muted-foreground"> as {cal.google_account_email}</span>
                ) : null}
              </span>
              <form action={disconnectGoogleCalendar} className="ml-auto">
                <Button type="submit" variant="outline" size="sm">
                  Disconnect
                </Button>
              </form>
            </div>
          ) : !googleConfigured ? (
            <p className="rounded-lg border border-border/40 px-3.5 py-4 text-sm text-muted-foreground">
              Google Calendar isn&rsquo;t configured on the server yet. Once the
              platform adds Google credentials, a Connect button appears here.
            </p>
          ) : (
            <form action={connectGoogleCalendar}>
              <p className="mb-3 text-sm text-muted-foreground">
                Your AI will offer only open times inside your business hours and
                never double-book.
              </p>
              <Button type="submit">Connect Google Calendar</Button>
            </form>
          )}
        </CardContent>
      </Card>

      {calConnected && (
        <Card className="mt-4 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <MessageSquare className="size-4 text-cyan" aria-hidden />
              Booking confirmation text
            </CardTitle>
            <CardDescription>
              Sent when the AI books an appointment (only if the caller agreed to
              texts). Use <code className="text-cyan">{"{business}"}</code> and{" "}
              <code className="text-cyan">{"{time}"}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateBookingConfirmation} className="space-y-4">
              <Textarea
                name="booking_confirmation_template"
                defaultValue={bookingTemplate}
                rows={3}
                maxLength={480}
                aria-label="Booking confirmation message"
              />
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      {calConnected && (
        <Card className="mt-4 bg-card/60">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <BellRing className="size-4 text-cyan" aria-hidden />
              Appointment reminders
            </CardTitle>
            <CardDescription>
              We text customers once before their appointment so they don&rsquo;t
              forget (and can call to change it). Use{" "}
              <code className="text-cyan">{"{business}"}</code> and{" "}
              <code className="text-cyan">{"{time}"}</code>. STOP always wins.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={updateReminders} className="space-y-4">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="reminder_enabled"
                  defaultChecked={reminderEnabled}
                  className="mt-1 accent-cyan"
                />
                <span>
                  <span className="font-medium text-foreground">
                    Send appointment reminders
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    One reminder per appointment — keeps your no-show rate down.
                  </span>
                </span>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">
                  Hours before the appointment
                </span>
                <Input
                  type="number"
                  name="reminder_lead_hours"
                  min={1}
                  max={168}
                  defaultValue={reminderLeadHours}
                  className="mt-1 w-28"
                  aria-label="Reminder lead hours"
                />
                <span className="mt-1 block text-xs text-steel">
                  Reminders are checked once a day, so the actual notice is
                  roughly this many hours (or up to a day less for same-day
                  bookings).
                </span>
              </label>
              <Textarea
                name="reminder_template"
                defaultValue={reminderTemplate}
                rows={3}
                maxLength={480}
                aria-label="Reminder message"
              />
              <Button type="submit">Save</Button>
            </form>
          </CardContent>
        </Card>
      )}

      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <MessageSquare className="size-4 text-cyan" aria-hidden />
            Missed-call text-back
          </CardTitle>
          <CardDescription>
            When a caller hangs up before the AI helps them, we text them
            automatically. Use <code className="text-cyan">{"{business}"}</code> to
            insert your business name.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateTextBack} className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="text_back_enabled"
                defaultChecked={textBackEnabled}
                className="mt-1 accent-cyan"
              />
              <span>
                <span className="font-medium text-foreground">
                  Text missed callers automatically
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  The product&rsquo;s namesake feature — never lose a missed call.
                </span>
              </span>
            </label>
            <Textarea
              name="text_back_template"
              defaultValue={textBackTemplate}
              rows={3}
              maxLength={480}
              aria-label="Text-back message"
            />
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
