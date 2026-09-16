import { ChevronDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { CATEGORIES, OTHER_NICHE, findNiche, nichesIn } from "@/lib/setup/niches";
import { US_TIMEZONES } from "@/lib/setup/steps";
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
            <Input
              id="name"
              name="name"
              defaultValue={b.name}
              required
              maxLength={120}
              autoComplete="organization"
            />
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
  const selected = findNiche(current);
  const currentValue = selected?.name ?? (current === OTHER_NICHE ? OTHER_NICHE : null);
  const option = cn(
    "flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-3 text-sm transition-colors",
    "has-checked:border-cyan/60 has-checked:bg-cyan/5 has-checked:text-foreground",
    "border-border/70 text-muted-foreground hover:border-border hover:text-foreground"
  );
  return (
    <Card className="bg-card/60">
      <CardContent className="pt-6">
        <form action={saveIndustry}>
          <fieldset>
            <legend className="text-sm text-muted-foreground">
              Open your category, then pick the option closest to your business. It decides
              what the AI asks callers, like whether it needs a service address or a vehicle.
            </legend>
            {current && (
              <p className="mt-3 text-sm text-muted-foreground">
                Current pick: <span className="font-medium text-foreground">{current}</span>
              </p>
            )}
            <div className="mt-4 space-y-2">
              {CATEGORIES.map((category, i) => (
                <details
                  key={category.id}
                  open={selected?.category === category.id}
                  className="group rounded-lg border border-border/70 bg-background/30"
                >
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
                    <span>
                      <span className="block text-sm font-medium text-foreground">
                        {i + 1}. {category.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">{category.blurb}</span>
                    </span>
                    <ChevronDown
                      className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                      aria-hidden
                    />
                  </summary>
                  <div className="grid gap-2 border-t border-border/60 p-3 sm:grid-cols-2">
                    {nichesIn(category.id).map((niche) => (
                      <label key={niche.name} className={option}>
                        <input
                          type="radio"
                          name="industry"
                          value={niche.name}
                          defaultChecked={niche.name === currentValue}
                          className="accent-cyan"
                        />
                        {niche.name}
                      </label>
                    ))}
                  </div>
                </details>
              ))}
            </div>
            <label className={cn(option, "mt-2")}>
              <input
                type="radio"
                name="industry"
                value={OTHER_NICHE}
                defaultChecked={currentValue === OTHER_NICHE}
                className="accent-cyan"
              />
              Other (my business isn't listed)
            </label>
          </fieldset>
          <Button type="submit" className="mt-6">
            Save &amp; continue
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
