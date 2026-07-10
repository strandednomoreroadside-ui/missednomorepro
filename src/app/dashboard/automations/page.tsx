import type { Metadata } from "next";
import Link from "next/link";
import { Send, TriangleAlert } from "lucide-react";

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
import { isOrgManager, requireActiveOrg } from "@/lib/auth";
import { getEntitlements, outboundEnabled } from "@/lib/billing/entitlements";
import { AUTOMATION_DEFAULTS, AUTOMATION_KINDS } from "@/lib/sms/outbound-engine";
import { createClient } from "@/lib/supabase/server";
import { ManagerOnlyNote } from "@/components/manager-only-note";

import { saveAutomation } from "./actions";

export const metadata: Metadata = { title: "Follow-ups" };

type AutomationRow = {
  kind: string;
  enabled: boolean;
  delay_hours: number | null;
  delay_days: number | null;
  template: string;
};

export default async function AutomationsPage() {
  const { active } = await requireActiveOrg();
  const canManage = isOrgManager(active.role);
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data: rows } = business
    ? await supabase
        .from("automations")
        .select("kind, enabled, delay_hours, delay_days, template")
        .eq("business_id", business.id)
    : { data: [] };
  const byKind = new Map<string, AutomationRow>(
    ((rows ?? []) as AutomationRow[]).map((r) => [r.kind, r])
  );

  const ent = await getEntitlements(active.organization_id);
  const enabled = outboundEnabled(ent);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">
        AI Follow-ups
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Proactive texts that bring work back in — sent automatically, on your
        terms. Each one is off until you turn it on, only goes to customers who
        opted in, and always honors STOP.
      </p>

      {!enabled && (
        <p className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-500">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            Follow-ups send with the <strong>AI Outbound Assistant</strong>{" "}
            add-on (or the Growth plan). You can set them up now —{" "}
            <Link href="/dashboard/billing" className="underline">
              add it on the billing page
            </Link>{" "}
            to start sending.
          </span>
        </p>
      )}

      {!canManage && (
        <div className="mt-4">
          <ManagerOnlyNote>
            Only an owner or admin can change follow-ups. Here&rsquo;s the current setup.
          </ManagerOnlyNote>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {AUTOMATION_KINDS.map((kind) => {
          const def = AUTOMATION_DEFAULTS[kind];
          const row = byKind.get(kind);
          const isOn = row?.enabled ?? false;
          const delay = def.unit === "hours" ? row?.delay_hours : row?.delay_days;
          return (
            <Card key={kind} className="bg-card/60">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Send className="size-4 text-cyan" aria-hidden />
                  {def.label}
                  {isOn && (
                    <span className="ml-auto inline-flex items-center rounded-full border border-cyan/30 px-2 py-0.5 text-[10px] font-medium uppercase text-cyan">
                      on
                    </span>
                  )}
                </CardTitle>
                <CardDescription>{def.description}</CardDescription>
              </CardHeader>
              <CardContent>
                {canManage ? (
                  <form action={saveAutomation} className="space-y-3">
                    <input type="hidden" name="kind" value={kind} />
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        name="enabled"
                        defaultChecked={isOn}
                        className="accent-cyan"
                      />
                      <span className="font-medium text-foreground">Send this automatically</span>
                    </label>
                    <label className="block text-sm">
                      <span className="text-muted-foreground">
                        Send {def.unit === "hours" ? "hours" : "days"} after{" "}
                        {kind === "quote_followup" ? "the quote" : "the job"}
                      </span>
                      <Input
                        type="number"
                        name="delay"
                        min={1}
                        max={def.unit === "hours" ? 720 : 730}
                        defaultValue={delay ?? def.delay}
                        className="mt-1 w-28"
                        aria-label="Delay"
                      />
                    </label>
                    <Textarea
                      name="template"
                      defaultValue={row?.template ?? def.template}
                      rows={3}
                      maxLength={480}
                      aria-label={`${def.label} message`}
                    />
                    <p className="text-xs text-steel">
                      Use <code className="text-cyan">{"{name}"}</code> and{" "}
                      <code className="text-cyan">{"{business}"}</code>.
                    </p>
                    <Button type="submit" size="sm">Save</Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {isOn
                      ? `On — sends ${delay ?? def.delay} ${def.unit} after ${kind === "quote_followup" ? "the quote" : "the job"}.`
                      : "Off."}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
