import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DAYS } from "@/lib/setup/steps";
import type { SetupData } from "@/lib/setup/queries";

import { saveHours, saveSmsSettings } from "../actions";

/** "07:00:00" (Postgres time) → "07:00" (input[type=time]). */
const toTimeInput = (t: string | null) => (t ? t.slice(0, 5) : "");

export function HoursStep({ data }: { data: SetupData }) {
  const byDay = new Map(data.hours.map((h) => [h.day_of_week, h]));

  return (
    <Card className="bg-card/60">
      <CardContent className="pt-6">
        <form action={saveHours}>
          <div className="space-y-3">
            {DAYS.map(({ dow, label }) => {
              const row = byDay.get(dow);
              // Sensible default for unsaved rows: weekdays open 8–6.
              const closed = row ? row.closed : dow === 0;
              return (
                <div
                  key={dow}
                  className="flex flex-wrap items-center gap-3 rounded-lg border border-border/40 px-3.5 py-2.5"
                >
                  <span className="w-24 text-sm font-medium text-foreground">{label}</span>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      name={`closed_${dow}`}
                      defaultChecked={closed}
                      className="accent-cyan"
                    />
                    Closed
                  </label>
                  <div className="ml-auto flex items-center gap-2">
                    <Label htmlFor={`opens_${dow}`} className="sr-only">
                      {label} opens at
                    </Label>
                    <Input
                      id={`opens_${dow}`}
                      name={`opens_${dow}`}
                      type="time"
                      defaultValue={row && !row.closed ? toTimeInput(row.opens_at) : "08:00"}
                      className="w-32"
                    />
                    <span className="text-xs text-steel">to</span>
                    <Label htmlFor={`closes_${dow}`} className="sr-only">
                      {label} closes at
                    </Label>
                    <Input
                      id={`closes_${dow}`}
                      name={`closes_${dow}`}
                      type="time"
                      defaultValue={row && !row.closed ? toTimeInput(row.closes_at) : "18:00"}
                      className="w-32"
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-steel">
            Times are in your business timezone. Days marked closed ignore the time fields.
          </p>
          <Button type="submit" className="mt-5">
            Save &amp; continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function SmsStep({ data }: { data: SetupData }) {
  const s = data.sms;
  return (
    <Card className="bg-card/60">
      <CardContent className="pt-6">
        <form action={saveSmsSettings} className="space-y-5">
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="ask_consent_on_call"
              defaultChecked={s ? s.ask_consent_on_call : true}
              className="mt-1 accent-cyan"
            />
            <span>
              <span className="font-medium text-foreground">Ask permission to text on every call</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                The AI asks before any texting happens. Opt-outs are always honored — that
                part is not configurable.
              </span>
            </span>
          </label>

          <div className="space-y-2">
            <Label htmlFor="consent_script">How the AI asks *</Label>
            <Textarea
              id="consent_script"
              name="consent_script"
              defaultValue={
                s?.consent_script ??
                "Is it okay if we text you updates about your service request? Reply STOP anytime to opt out."
              }
              required
              maxLength={500}
            />
          </div>

          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              name="transactional_only"
              defaultChecked={s ? s.transactional_only : true}
              className="mt-1 accent-cyan"
            />
            <span>
              <span className="font-medium text-foreground">
                Service updates only (no marketing texts)
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Recommended. Marketing campaigns are a later add-on and need separate consent.
              </span>
            </span>
          </label>

          <Button type="submit">Save &amp; continue</Button>
        </form>
      </CardContent>
    </Card>
  );
}
