import type { Metadata } from "next";
import { randomUUID } from "node:crypto";
import Link from "next/link";
import {
  BellRing,
  Bot,
  CalendarCheck,
  CheckCircle2,
  Globe,
  MessageSquare,
  Phone,
  PhoneCall,
  Truck,
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
import { getEntitlements } from "@/lib/billing/entitlements";
import { env } from "@/lib/env";
import { isGoogleConfigured } from "@/lib/google/credentials";
import { formatUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import {
  connectGoogleCalendar,
  disconnectGoogleCalendar,
  updateAiSwitch,
  updateBookingConfirmation,
  updateChatSettings,
  updateDispatchEta,
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
const DEFAULT_DISPATCH_TEMPLATE =
  "Thanks {name}! {business} is on the way. Estimated arrival: {eta}. We'll call if anything changes. Reply STOP to opt out.";

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
    .select("id, name, ai_enabled, forward_number")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const aiEnabled = (business?.ai_enabled ?? true) as boolean;
  const forwardNumber = (business?.forward_number ?? "") as string;

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
            "text_back_enabled, text_back_template, booking_confirmation_template, reminder_enabled, reminder_lead_hours, reminder_template, dispatch_confirmation_enabled, dispatch_confirmation_template, eta_base_minutes, eta_per_job_minutes, web_chat_enabled, web_greeting, widget_accent, two_way_sms_ai_enabled, widget_key"
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
  const dispatchEnabled = (sms?.dispatch_confirmation_enabled ?? true) as boolean;
  const dispatchTemplate = (sms?.dispatch_confirmation_template ??
    DEFAULT_DISPATCH_TEMPLATE) as string;
  const etaBaseMinutes = (sms?.eta_base_minutes ?? 60) as number;
  const etaPerJobMinutes = (sms?.eta_per_job_minutes ?? 30) as number;
  const cal = calendar as
    | { google_account_email: string | null; status: string; connected_at: string }
    | null;
  const calConnected = cal?.status === "connected";
  const googleConfigured = isGoogleConfigured();

  // ── Omnichannel chat (Phase 10) ──
  const chatEntitled = (await getEntitlements(active.organization_id)).has("omnichannel_chat");
  const webChatEnabled = (sms?.web_chat_enabled ?? false) as boolean;
  const webGreeting = (sms?.web_greeting ?? "Hi! How can we help you today?") as string;
  const widgetAccent = (sms?.widget_accent ?? "#00E5FF") as string;
  const twoWaySmsAi = (sms?.two_way_sms_ai_enabled ?? false) as boolean;
  let widgetKey = (sms?.widget_key ?? null) as string | null;
  // Ensure a widget key exists so the embed snippet is always valid.
  if (chatEntitled && business && !widgetKey) {
    widgetKey = randomUUID().replace(/-/g, "");
    const admin = createAdminClient();
    await admin
      .from("sms_settings")
      .update({ widget_key: widgetKey })
      .eq("business_id", business.id)
      .eq("tenant_id", active.organization_id);
  }
  const embedSnippet = widgetKey
    ? `<script src="${env.NEXT_PUBLIC_APP_URL}/widget.js" data-key="${widgetKey}" async></script>`
    : "";

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
            <Bot className="size-4 text-cyan" aria-hidden />
            AI receptionist
          </CardTitle>
          <CardDescription>
            Your master on/off switch. When the AI is off, callers ring the
            phone below instead — so a real person always picks up. Turn it
            off for vacations, outages, or whenever you want to take calls
            yourself.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateAiSwitch} className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="ai_enabled"
                defaultChecked={aiEnabled}
                className="mt-1 accent-cyan"
              />
              <span>
                <span className="font-medium text-foreground">
                  AI answers my calls
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  When off (or when you hit your plan&rsquo;s minutes), calls
                  forward to your phone — never to voicemail.
                </span>
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-muted-foreground">
                Forward calls to this phone
              </span>
              <Input
                type="tel"
                name="forward_number"
                defaultValue={forwardNumber}
                placeholder="+1 440 555 0199"
                className="mt-1 w-56 font-mono"
                aria-label="Forward-to number"
              />
              <span className="mt-1 block text-xs text-steel">
                Leave blank to use your first staff-alert number. If neither is
                set, callers hear your voicemail greeting.
              </span>
            </label>
            <Button type="submit">Save</Button>
          </form>
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

      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Truck className="size-4 text-cyan" aria-hidden />
            Dispatch confirmation &amp; ETA
          </CardTitle>
          <CardDescription>
            When the AI dispatches you for an urgent &ldquo;come now&rdquo; call, the
            caller gets a text confirming help is on the way with a rough arrival
            time. The estimate is <strong>base + per-job × (open jobs on today&rsquo;s
            board)</strong>, so it reflects how busy you are. Use{" "}
            <code className="text-cyan">{"{name}"}</code>,{" "}
            <code className="text-cyan">{"{business}"}</code>, and{" "}
            <code className="text-cyan">{"{eta}"}</code>. STOP always wins.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={updateDispatchEta} className="space-y-4">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="dispatch_confirmation_enabled"
                defaultChecked={dispatchEnabled}
                className="mt-1 accent-cyan"
              />
              <span>
                <span className="font-medium text-foreground">
                  Text an arrival ETA on dispatch
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  A job is still created on your dispatch board even if this is off.
                </span>
              </span>
            </label>
            <div className="flex flex-wrap gap-4">
              <label className="block text-sm">
                <span className="text-muted-foreground">Base minutes</span>
                <Input
                  type="number"
                  name="eta_base_minutes"
                  min={0}
                  max={1440}
                  defaultValue={etaBaseMinutes}
                  className="mt-1 w-28"
                  aria-label="ETA base minutes"
                />
                <span className="mt-1 block text-xs text-steel">Minimum arrival time.</span>
              </label>
              <label className="block text-sm">
                <span className="text-muted-foreground">Minutes per job ahead</span>
                <Input
                  type="number"
                  name="eta_per_job_minutes"
                  min={0}
                  max={240}
                  defaultValue={etaPerJobMinutes}
                  className="mt-1 w-28"
                  aria-label="ETA minutes per job ahead"
                />
                <span className="mt-1 block text-xs text-steel">
                  Added for each open job already on today&rsquo;s board.
                </span>
              </label>
            </div>
            <Textarea
              name="dispatch_confirmation_template"
              defaultValue={dispatchTemplate}
              rows={3}
              maxLength={480}
              aria-label="Dispatch confirmation message"
            />
            <Button type="submit">Save</Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Omnichannel AI Chat (Phase 10 add-on) ── */}
      <Card className="mt-4 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Globe className="size-4 text-cyan" aria-hidden />
            Omnichannel AI Chat
            <span className="rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-cyan">
              Add-on
            </span>
          </CardTitle>
          <CardDescription>
            Add a website chat widget and let the AI answer texts both ways — all in one{" "}
            <Link href="/dashboard/inbox" className="text-cyan hover:underline">
              Inbox
            </Link>
            . The same AI brain as your receptionist (it never invents prices or books outside your
            rules).
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!chatEntitled ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-3 text-sm text-muted-foreground">
              <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-500" aria-hidden />
              <span>
                Omnichannel AI Chat is a +$29/mo add-on (also in the Growth Suite bundle). Enable it
                on the{" "}
                <Link href="/dashboard/billing" className="text-cyan hover:underline">
                  billing page
                </Link>{" "}
                to turn on website chat and two-way AI texting.
              </span>
            </div>
          ) : (
            <form action={updateChatSettings} className="space-y-5">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  name="web_chat_enabled"
                  defaultChecked={webChatEnabled}
                  className="mt-1 accent-cyan"
                />
                <span>
                  <span className="font-medium text-foreground">Website chat widget</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Show a chat bubble on your website that the AI answers instantly.
                  </span>
                </span>
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">Greeting</span>
                <Textarea
                  name="web_greeting"
                  defaultValue={webGreeting}
                  rows={2}
                  maxLength={240}
                  className="mt-1"
                  aria-label="Web chat greeting"
                />
              </label>

              <label className="block text-sm">
                <span className="text-muted-foreground">Accent color</span>
                <Input
                  type="text"
                  name="widget_accent"
                  defaultValue={widgetAccent}
                  className="mt-1 w-40 font-mono"
                  aria-label="Widget accent color (hex)"
                  placeholder="#00E5FF"
                />
              </label>

              <label className="flex items-start gap-3 border-t border-border/60 pt-4 text-sm">
                <input
                  type="checkbox"
                  name="two_way_sms_ai_enabled"
                  defaultChecked={twoWaySmsAi}
                  className="mt-1 accent-cyan"
                />
                <span>
                  <span className="font-medium text-foreground">Two-way AI texting</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    When someone texts your number, the AI replies and books just like on a call.
                    STOP always wins; you can take over any thread from the Inbox.
                  </span>
                </span>
              </label>

              <Button type="submit">Save</Button>
            </form>
          )}

          {chatEntitled && embedSnippet && (
            <div className="mt-5 border-t border-border/60 pt-4">
              <p className="text-sm font-medium text-foreground">Embed snippet</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Paste this once before <code className="text-cyan">{"</body>"}</code> on your
                website. It only shows when website chat is on above.
              </p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-border/60 bg-night/60 p-3 font-mono text-[11px] text-steel">
                {embedSnippet}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
