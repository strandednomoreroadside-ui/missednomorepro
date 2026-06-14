import type { Metadata } from "next";
import { MessageSquare, Phone, PhoneCall } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { requireActiveOrg } from "@/lib/auth";
import { formatUsPhone } from "@/lib/phone";
import { createClient } from "@/lib/supabase/server";

import { updateTextBack } from "./actions";

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

export default async function SettingsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [{ data: numbers }, { data: sms }] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select("id, phone_number, type, voice_enabled, sms_enabled, a2p_status")
      .eq("tenant_id", active.organization_id)
      .order("created_at", { ascending: true }),
    business
      ? supabase
          .from("sms_settings")
          .select("text_back_enabled, text_back_template")
          .eq("business_id", business.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const rows = (numbers ?? []) as NumberRow[];
  const textBackEnabled = (sms?.text_back_enabled ?? true) as boolean;
  const textBackTemplate = (sms?.text_back_template ?? DEFAULT_TEMPLATE) as string;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your number and text-back behavior. Calendars and more arrive with later
        milestones.
      </p>

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
