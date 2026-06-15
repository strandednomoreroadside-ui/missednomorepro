import type { Metadata } from "next";
import { CheckCircle2, MapPin, Plus, Trash2, TriangleAlert } from "lucide-react";

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

import {
  addService,
  addSurcharge,
  addZone,
  approvePricing,
  deleteService,
  deleteSurcharge,
  deleteZone,
  setHomeBase,
  toggleService,
  unapprovePricing,
  updateServiceRadius,
} from "./actions";

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

const SELECT_CLASS =
  "mt-1 h-9 w-full rounded-md border border-input bg-night/60 px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

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

type ZoneRow = {
  id: string;
  zone_number: number;
  min_miles: number;
  max_miles: number;
  dispatch_fee: number;
};
type ServiceRow = {
  id: string;
  name: string;
  pricing_type: string;
  service_fee: number;
  hook_fee: number | null;
  per_mile_rate: number | null;
  free_miles: number | null;
  variable_part: string | null;
  available_start: string | null;
  available_end: string | null;
  active: boolean;
};
type SurchargeRow = {
  id: string;
  name: string;
  amount: number;
  apply_type: string;
  window_start: string | null;
  window_end: string | null;
};

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
            .select("id, zone_number, min_miles, max_miles, dispatch_fee")
            .eq("business_id", business.id)
            .eq("active", true)
            .order("zone_number")
        : Promise.resolve({ data: [] }),
      business
        ? supabase
            .from("service_pricing")
            .select("id, name, pricing_type, service_fee, hook_fee, per_mile_rate, free_miles, variable_part, available_start, available_end, active")
            .eq("business_id", business.id)
            .order("created_at", { ascending: true })
        : Promise.resolve({ data: [] }),
      business
        ? supabase
            .from("pricing_surcharges")
            .select("id, name, amount, apply_type, window_start, window_end")
            .eq("business_id", business.id)
            .eq("active", true)
        : Promise.resolve({ data: [] }),
    ]);

  const zoneRows = (zones ?? []) as ZoneRow[];
  const serviceRows = (services ?? []) as ServiceRow[];
  const surchargeRows = (surcharges ?? []) as SurchargeRow[];

  const hasConfig =
    Boolean(settings) && zoneRows.length > 0 && serviceRows.some((s) => s.active);
  const geocoded = settings?.base_lat != null && settings?.base_lng != null;
  const quotingOn = Boolean(settings?.approved_at) && geocoded && hasConfig;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Prices &amp; Services</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage your services, zone fees, and surcharges. When approved, the AI quotes
        callers exact prices computed from these — it never makes up a number.
      </p>

      {banner && (
        <div
          className={`mt-4 flex items-start gap-2 rounded-lg border px-3.5 py-3 text-sm ${
            banner.ok ? "border-cyan/40 bg-cyan/5" : "border-amber-500/40 bg-amber-500/5"
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

      {/* Home base + status + approve */}
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
              : "Set your home base, add your services, then approve to let the AI quote."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <form action={setHomeBase} className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 text-xs text-steel">
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> Home base address (distance is
                measured from here)
              </span>
              <Input
                name="base_address"
                defaultValue={settings?.base_address ?? ""}
                placeholder="123 Main St, City, ST 00000"
                className="mt-1"
                aria-label="Home base address"
              />
            </label>
            <Button type="submit" variant="outline" size="sm">
              Save base
            </Button>
            <span
              className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase ${
                geocoded ? "border-cyan/30 text-cyan" : "border-amber-500/40 text-amber-500"
              }`}
            >
              {geocoded ? "located" : "not located"}
            </span>
          </form>

          <form action={updateServiceRadius} className="flex items-end gap-2">
            <label className="text-xs text-steel">
              Service-area radius (miles)
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
          <p className="text-xs text-steel">
            Anywhere within this radius of your home base is serviceable; past it the AI
            says it&rsquo;s out of area. This also caps quoting distance.
          </p>

          {!geocoded && !isMapsConfigured() && (
            <p className="text-xs text-amber-500/90">
              The maps key isn&rsquo;t set on the server yet — quoting needs it to measure
              distance.
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
              <Button type="submit" disabled={!hasConfig}>
                Approve &amp; turn on AI quoting
              </Button>
              {!hasConfig && (
                <span className="ml-2 text-xs text-steel">
                  Add at least one zone and one service first.
                </span>
              )}
            </form>
          )}
        </CardContent>
      </Card>

      {/* Zones */}
      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Dispatch zones</CardTitle>
          <CardDescription>Base fee by driving distance from your home base.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/40 text-sm">
            {zoneRows.length === 0 && (
              <li className="py-2 text-muted-foreground">No zones yet.</li>
            )}
            {zoneRows.map((z) => (
              <li key={z.id} className="flex items-center gap-2 py-2">
                <span>
                  Zone {z.zone_number}{" "}
                  <span className="text-muted-foreground">
                    ({z.min_miles}–{z.max_miles} mi)
                  </span>
                </span>
                <span className="ml-auto font-mono text-cyan">{money(z.dispatch_fee)}</span>
                <form action={deleteZone}>
                  <input type="hidden" name="id" value={z.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label="Delete zone">
                    <Trash2 className="size-4 text-muted-foreground" aria-hidden />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-cyan">
              <Plus className="mr-1 inline size-3.5" aria-hidden />
              Add a zone
            </summary>
            <form action={addZone} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input type="number" name="zone_number" placeholder="Zone #" min={1} step={1} required aria-label="Zone number" />
              <Input type="number" name="min_miles" placeholder="Min mi" min={0} step="0.1" required aria-label="Min miles" />
              <Input type="number" name="max_miles" placeholder="Max mi" min={0} step="0.1" required aria-label="Max miles" />
              <Input type="number" name="dispatch_fee" placeholder="Fee $" min={0} step="1" required aria-label="Dispatch fee" />
              <Button type="submit" size="sm" className="col-span-2 sm:col-span-1">
                Add
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>

      {/* Services */}
      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Services</CardTitle>
          <CardDescription>What you offer and what each costs.</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/40 text-sm">
            {serviceRows.length === 0 && (
              <li className="py-2 text-muted-foreground">No services yet.</li>
            )}
            {serviceRows.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-2 py-2">
                <span className={`font-medium ${s.active ? "" : "text-muted-foreground line-through"}`}>
                  {s.name}
                </span>
                {!s.active && (
                  <span className="rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
                    off
                  </span>
                )}
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
                    ? `${money(s.hook_fee ?? 0)} + ${money(s.per_mile_rate ?? 0)}/mi` +
                      (s.free_miles ? ` (${s.free_miles} free)` : "")
                    : money(s.service_fee)}
                </span>
                <form action={toggleService}>
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={(!s.active).toString()} />
                  <Button type="submit" variant="ghost" size="sm">
                    {s.active ? "Off" : "On"}
                  </Button>
                </form>
                <form action={deleteService}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label="Delete service">
                    <Trash2 className="size-4 text-muted-foreground" aria-hidden />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-cyan">
              <Plus className="mr-1 inline size-3.5" aria-hidden />
              Add a service
            </summary>
            <form action={addService} className="mt-3 space-y-2">
              <Input name="name" placeholder="Service name (e.g. Jump Start)" maxLength={160} required aria-label="Service name" />
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="text-xs text-steel">
                  Type
                  <select name="pricing_type" className={SELECT_CLASS} aria-label="Pricing type" defaultValue="flat">
                    <option value="flat">Flat price</option>
                    <option value="tow">Tow (hook + per-mile)</option>
                  </select>
                </label>
                <label className="text-xs text-steel">
                  Flat price $
                  <Input type="number" name="service_fee" min={0} step="1" className="mt-1" aria-label="Flat price" />
                </label>
                <label className="text-xs text-steel">
                  + cost of (optional)
                  <Input name="variable_part" placeholder="tire / battery / fuel" className="mt-1" aria-label="Variable part" />
                </label>
                <label className="text-xs text-steel">
                  Tow hook fee $
                  <Input type="number" name="hook_fee" min={0} step="1" className="mt-1" aria-label="Tow hook fee" />
                </label>
                <label className="text-xs text-steel">
                  Tow per-mile $
                  <Input type="number" name="per_mile_rate" min={0} step="0.25" className="mt-1" aria-label="Tow per-mile rate" />
                </label>
                <label className="text-xs text-steel">
                  Tow free miles
                  <Input type="number" name="free_miles" min={0} step="1" className="mt-1" aria-label="Tow free miles" />
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <label className="text-xs text-steel">
                  Available from (optional)
                  <Input type="time" name="available_start" className="mt-1" aria-label="Available from" />
                </label>
                <label className="text-xs text-steel">
                  Available to (optional)
                  <Input type="time" name="available_end" className="mt-1" aria-label="Available to" />
                </label>
              </div>
              <p className="text-xs text-steel">
                For a flat service, fill <em>Flat price</em>. For a tow, pick Tow and fill
                the hook fee + per-mile. Times limit when the AI offers a service.
              </p>
              <Button type="submit" size="sm">
                Add service
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>

      {/* Surcharges */}
      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-2">
          <CardTitle className="font-display text-base">Surcharges</CardTitle>
          <CardDescription>
            Auto surcharges add by call time; conditional ones the AI mentions but
            doesn&rsquo;t add.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="divide-y divide-border/40 text-sm">
            {surchargeRows.length === 0 && (
              <li className="py-2 text-muted-foreground">No surcharges yet.</li>
            )}
            {surchargeRows.map((s) => (
              <li key={s.id} className="flex items-center gap-2 py-2">
                <span>{s.name}</span>
                <span className="rounded-full border border-border/60 px-1.5 py-0.5 font-mono text-[10px] uppercase text-steel">
                  {s.apply_type === "auto_time"
                    ? `auto ${clock(s.window_start)}–${clock(s.window_end)}`
                    : "mentioned"}
                </span>
                <span className="ml-auto font-mono text-cyan">{money(s.amount)}</span>
                <form action={deleteSurcharge}>
                  <input type="hidden" name="id" value={s.id} />
                  <Button type="submit" variant="ghost" size="sm" aria-label="Delete surcharge">
                    <Trash2 className="size-4 text-muted-foreground" aria-hidden />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
          <details className="mt-3">
            <summary className="cursor-pointer text-sm font-medium text-cyan">
              <Plus className="mr-1 inline size-3.5" aria-hidden />
              Add a surcharge
            </summary>
            <form action={addSurcharge} className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Input name="name" placeholder="Name" maxLength={160} required aria-label="Surcharge name" />
              <Input type="number" name="amount" placeholder="Amount $" min={0} step="1" required aria-label="Surcharge amount" />
              <label className="text-xs text-steel">
                Type
                <select name="apply_type" className={SELECT_CLASS} aria-label="Surcharge type" defaultValue="conditional">
                  <option value="conditional">Mentioned only</option>
                  <option value="auto_time">Auto by time</option>
                </select>
              </label>
              <div className="grid grid-cols-2 gap-1">
                <Input type="time" name="window_start" aria-label="Window start" />
                <Input type="time" name="window_end" aria-label="Window end" />
              </div>
              <Button type="submit" size="sm" className="col-span-2 sm:col-span-1">
                Add
              </Button>
            </form>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
