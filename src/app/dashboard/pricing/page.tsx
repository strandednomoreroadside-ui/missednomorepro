import type { Metadata } from "next";
import { CheckCircle2, MapPin, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { requireActiveOrg } from "@/lib/auth";
import { isMapsConfigured } from "@/lib/maps/client";
import { createClient } from "@/lib/supabase/server";

import { approvePricing, unapprovePricing, updateServiceRadius } from "./actions";

export const metadata: Metadata = { title: "Pricing" };

const BANNERS: Record<string, { ok: boolean; text: string }> = {
  approved: { ok: true, text: "AI quoting is on — the AI now gives exact prices on calls." },
  off: { ok: false, text: "AI quoting is off. The AI will say the owner texts a quote instead." },
  nogeo: {
    ok: false,
    text: "Couldn't locate your home base on the map. Check the address and that the maps key is set, then try again.",
  },
  nobase: { ok: false, text: "Add your home base address first." },
  nobiz: { ok: false, text: "Finish the setup wizard first." },
};

function money(n: number): string {
  return `$${n % 1 === 0 ? n.toFixed(0) : n.toFixed(2)}`;
}

function clock(t: string | null): string {
  if (!t) return "";
  const m = /^(\d{1,2}):(\d{2})/.exec(t);
  if (!m) return t;
  const h = Number(m[1]);
  const min = Number(m[2]);
  const period = h < 12 ? "AM" : "PM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return min === 0 ? `${h12} ${period}` : `${h12}:${String(min).padStart(2, "0")} ${period}`;
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ pricing?: string }>;
}) {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();
  const banner = (await searchParams).pricing
    ? BANNERS[(await searchParams).pricing as string]
    : undefined;

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [{ data: settings }, { data: zones }, { data: services }, { data: surcharges }] =
    await Promise.all([
      business
        ? supabase
            .from("pricing_settings")
            .select("base_address, base_lat, base_lng, max_service_miles, approved_at")
            .eq("business_id", business.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      business
        ? supabase
            .from("pricing_zones")
            .select("zone_number, min_miles, max_miles, dispatch_fee")
            .eq("business_id", business.id)
            .eq("active", true)
            .order("zone_number")
        : Promise.resolve({ data: [] }),
      business
        ? supabase
            .from("service_pricing")
            .select("name, pricing_type, service_fee, hook_fee, per_mile_rate, variable_part, available_start, available_end")
            .eq("business_id", business.id)
            .eq("active", true)
        : Promise.resolve({ data: [] }),
      business
        ? supabase
            .from("pricing_surcharges")
            .select("name, amount, apply_type, window_start, window_end")
            .eq("business_id", business.id)
            .eq("active", true)
        : Promise.resolve({ data: [] }),
    ]);

  const zoneRows = (zones ?? []) as {
    zone_number: number;
    min_miles: number;
    max_miles: number;
    dispatch_fee: number;
  }[];
  const serviceRows = (services ?? []) as {
    name: string;
    pricing_type: string;
    service_fee: number;
    hook_fee: number | null;
    per_mile_rate: number | null;
    variable_part: string | null;
    available_start: string | null;
    available_end: string | null;
  }[];
  const surchargeRows = (surcharges ?? []) as {
    name: string;
    amount: number;
    apply_type: string;
    window_start: string | null;
    window_end: string | null;
  }[];

  const hasConfig = Boolean(settings) && zoneRows.length > 0 && serviceRows.length > 0;
  const geocoded = settings?.base_lat != null && settings?.base_lng != null;
  const quotingOn = Boolean(settings?.approved_at) && geocoded && hasConfig;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Pricing</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your quote rules. When approved, the AI gives callers exact prices computed
        from these — it never makes up a number.
      </p>

      {banner && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${
            banner.ok
              ? "border-cyan/40 bg-cyan/5"
              : "border-amber-500/40 bg-amber-500/5"
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

      {!hasConfig ? (
        <Card className="mt-6 bg-card/60">
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            No pricing loaded yet. Once your pricing sheet is imported, your zones,
            services, and surcharges appear here for you to review and approve.
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Status + approve */}
          <Card className="mt-6 bg-card/60">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                {quotingOn ? (
                  <CheckCircle2 className="size-4 text-cyan" aria-hidden />
                ) : (
                  <TriangleAlert className="size-4 text-amber-500" aria-hidden />
                )}
                AI quoting is {quotingOn ? "ON" : "OFF"}
              </CardTitle>
              <CardDescription>
                {quotingOn
                  ? "Callers get exact, itemized quotes from the rules below."
                  : "Review the rules below, then approve to let the AI quote prices."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-steel" aria-hidden />
                <span className="text-muted-foreground">Home base:</span>
                <span>{settings?.base_address ?? "—"}</span>
                <span
                  className={`ml-auto rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                    geocoded ? "border-cyan/30 text-cyan" : "border-amber-500/40 text-amber-500"
                  }`}
                >
                  {geocoded ? "located" : "not located"}
                </span>
              </div>
              {!geocoded && !isMapsConfigured() && (
                <p className="text-xs text-amber-500/90">
                  The maps key isn&rsquo;t set on the server yet — quoting needs it to
                  measure distance. Add it, then approve.
                </p>
              )}
              {quotingOn ? (
                <form action={unapprovePricing}>
                  <Button type="submit" variant="outline" size="sm">
                    Turn quoting off
                  </Button>
                </form>
              ) : (
                <form action={approvePricing}>
                  <Button type="submit">Approve &amp; turn on AI quoting</Button>
                </form>
              )}
            </CardContent>
          </Card>

          {/* Zones */}
          <Card className="mt-4 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Dispatch zones</CardTitle>
              <CardDescription>
                Base fee by driving distance from your home base.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/40 text-sm">
                {zoneRows.map((z) => (
                  <li key={z.zone_number} className="flex items-center justify-between py-2">
                    <span>
                      Zone {z.zone_number}{" "}
                      <span className="text-muted-foreground">
                        ({z.min_miles}–{z.max_miles} mi)
                      </span>
                    </span>
                    <span className="font-mono text-cyan">{money(z.dispatch_fee)}</span>
                  </li>
                ))}
              </ul>
              <form action={updateServiceRadius} className="mt-3 flex items-end gap-2">
                <label className="text-xs text-steel">
                  Service area radius (miles from home base)
                  <Input
                    type="number"
                    name="max_service_miles"
                    defaultValue={settings?.max_service_miles ?? 25}
                    min={1}
                    max={200}
                    step={1}
                    className="mt-1 w-28"
                    aria-label="Service area radius in miles"
                  />
                </label>
                <Button type="submit" variant="outline" size="sm">
                  Save radius
                </Button>
              </form>
              <p className="mt-2 text-xs text-steel">
                Anywhere within this radius of your home base is serviceable; past it,
                the AI says it&rsquo;s out of area. This also caps quoting distance.
              </p>
            </CardContent>
          </Card>

          {/* Services */}
          <Card className="mt-4 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Services</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/40 text-sm">
                {serviceRows.map((s) => (
                  <li key={s.name} className="flex flex-wrap items-center gap-x-2 py-2">
                    <span className="font-medium">{s.name}</span>
                    {s.variable_part && (
                      <span className="text-xs text-steel">+ cost of {s.variable_part}</span>
                    )}
                    {s.available_start && (
                      <span className="rounded-full border border-border/60 px-1.5 py-0.5 font-mono text-[10px] text-steel">
                        {clock(s.available_start)}–{clock(s.available_end)}
                      </span>
                    )}
                    <span className="ml-auto font-mono text-cyan">
                      {s.pricing_type === "tow"
                        ? `${money(s.hook_fee ?? 0)} + ${money(s.per_mile_rate ?? 0)}/mi`
                        : money(s.service_fee)}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Surcharges */}
          <Card className="mt-4 bg-card/60">
            <CardHeader className="pb-2">
              <CardTitle className="font-display text-base">Surcharges</CardTitle>
              <CardDescription>
                Late-night adds automatically by call time; the rest the AI mentions
                but doesn&rsquo;t add.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border/40 text-sm">
                {surchargeRows.map((s) => (
                  <li key={s.name} className="flex items-center gap-2 py-2">
                    <span>{s.name}</span>
                    <span className="rounded-full border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase text-steel">
                      {s.apply_type === "auto_time"
                        ? `auto ${clock(s.window_start)}–${clock(s.window_end)}`
                        : "mentioned"}
                    </span>
                    <span className="ml-auto font-mono text-cyan">{money(s.amount)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
