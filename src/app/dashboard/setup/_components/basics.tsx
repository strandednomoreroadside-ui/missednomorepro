import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { NICHES, US_TIMEZONES } from "@/lib/setup/steps";
import type { SetupData } from "@/lib/setup/queries";
import { cn } from "@/lib/utils";

import { saveIndustry, saveProfile } from "../actions";

export function ProfileStep({ data }: { data: SetupData }) {
  const b = data.business;
  return (
    <Card className="bg-card/60">
      <CardContent className="pt-6">
        <form action={saveProfile} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Business name *</Label>
            <Input id="name" name="name" defaultValue={b.name} required maxLength={120} />
            <p className="text-xs text-steel">
              Exactly how the AI should say it when answering calls.
            </p>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Business phone *</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={b.phone ?? ""}
                placeholder="(440) 555-0123"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone *</Label>
              <Select id="timezone" name="timezone" defaultValue={b.timezone} required>
                {US_TIMEZONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">Business address</Label>
            <Input
              id="address"
              name="address"
              defaultValue={b.address ?? ""}
              placeholder="123 Main St, Mentor, OH 44060"
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website_url">Website</Label>
              <Input
                id="website_url"
                name="website_url"
                type="url"
                defaultValue={b.website_url ?? ""}
                placeholder="https://…"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gbp_url">Google Business Profile link</Label>
              <Input
                id="gbp_url"
                name="gbp_url"
                type="url"
                defaultValue={b.gbp_url ?? ""}
                placeholder="https://maps.google.com/…"
              />
            </div>
          </div>
          <Button type="submit">Save &amp; continue</Button>
        </form>
      </CardContent>
    </Card>
  );
}

export function IndustryStep({ data }: { data: SetupData }) {
  const current = data.business.industry;
  return (
    <Card className="bg-card/60">
      <CardContent className="pt-6">
        <form action={saveIndustry}>
          <fieldset>
            <legend className="sr-only">Pick your industry</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {NICHES.map((niche) => (
                <label
                  key={niche}
                  className={cn(
                    "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
                    "has-checked:border-cyan/60 has-checked:bg-cyan/5 has-checked:text-foreground",
                    "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
                  )}
                >
                  <input
                    type="radio"
                    name="industry"
                    value={niche}
                    defaultChecked={current === niche}
                    required
                    className="accent-cyan"
                  />
                  {niche}
                </label>
              ))}
            </div>
          </fieldset>
          <Button type="submit" className="mt-6">
            Save &amp; continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
