import type { Metadata } from "next";
import { MessageSquare, Phone, PhoneCall } from "lucide-react";

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

export const metadata: Metadata = { title: "Settings" };

type NumberRow = {
  id: string;
  phone_number: string;
  type: string;
  voice_enabled: boolean;
  sms_enabled: boolean;
  a2p_status: string;
};

export default async function SettingsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const [{ data: numbers }, { data: business }] = await Promise.all([
    supabase
      .from("phone_numbers")
      .select("id, phone_number, type, voice_enabled, sms_enabled, a2p_status")
      .eq("tenant_id", active.organization_id)
      .order("created_at", { ascending: true }),
    supabase
      .from("businesses")
      .select("name")
      .eq("tenant_id", active.organization_id)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
  ]);
  const rows = (numbers ?? []) as NumberRow[];
  const businessName = business?.name ?? active.organizations.name;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Phone setup now; AI voice, calendars, and more arrive with later milestones.
      </p>

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <Phone className="size-4 text-cyan" aria-hidden />
            Your business number
          </CardTitle>
          <CardDescription>
            Calls to this number are answered by the platform and logged under
            Calls.
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
          <CardTitle className="font-display text-base">
            What callers hear right now
          </CardTitle>
          <CardDescription>
            The placeholder greeting until your AI receptionist goes live at M7.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <blockquote className="rounded-lg border border-cyan/20 bg-cyan/5 px-4 py-3 text-sm italic leading-relaxed text-foreground">
            &ldquo;Thanks for calling {businessName}. Our AI assistant is still
            being set up, so please leave your name, phone number, and what you
            need after the beep, and the team will call you right back.&rdquo;
          </blockquote>
          <p className="mt-3 text-xs text-steel">
            Voicemails land in your call log with one-click playback.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
