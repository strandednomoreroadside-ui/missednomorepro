import type { Metadata } from "next";
import Link from "next/link";
import { BadgeCheck, TriangleAlert, Users } from "lucide-react";

import { FormBanner } from "@/components/form-banner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { isOrgManager, requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { ManagerOnlyNote } from "@/components/manager-only-note";
import {
  INTERVAL_LABEL,
  INTERVAL_MONTHS,
  MEMBERSHIP_INTERVALS,
  type MembershipInterval,
  type MembershipPlanRow,
} from "@/lib/membership/queries";
import { createClient } from "@/lib/supabase/server";

import { createPlan, togglePlanActive } from "./actions";

export const metadata: Metadata = { title: "Membership" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function MembershipPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : null;
  const saved = sp.saved === "1";

  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const canManage = isOrgManager(active.role);
  const ent = await getEntitlements(tenantId);

  if (!ent.has("membership")) {
    return (
      <div className="mx-auto max-w-3xl">
        <Header />
        <Card className="mt-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-amber-500">
              <TriangleAlert className="size-4" aria-hidden />
              Elite plan required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <strong>Customer memberships</strong> let you sell your own customers a recurring
            maintenance or membership plan (a comfort club, a road club) — steady monthly revenue on
            top of one-off jobs. It&rsquo;s included on the{" "}
            <strong className="text-foreground">Elite</strong> plan. Upgrade from the{" "}
            <Link href="/dashboard/billing" className="text-cyan hover:underline">
              billing page
            </Link>
            .
          </CardContent>
        </Card>
      </div>
    );
  }

  const supabase = await createClient();
  const [{ data: planData }, { data: memberData }] = await Promise.all([
    supabase
      .from("membership_plans")
      .select("id, name, description, price_cents, currency, interval, benefits, active, created_at")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true }),
    supabase
      .from("customer_memberships")
      .select("plan_id, status")
      .eq("tenant_id", tenantId)
      .eq("status", "active"),
  ]);

  const plans = (planData ?? []) as MembershipPlanRow[];
  const members = (memberData ?? []) as { plan_id: string; status: string }[];
  const countByPlan = new Map<string, number>();
  for (const m of members) countByPlan.set(m.plan_id, (countByPlan.get(m.plan_id) ?? 0) + 1);

  const priceById = new Map(plans.map((p) => [p.id, p]));
  const mrrCents = members.reduce((sum, m) => {
    const plan = priceById.get(m.plan_id);
    if (!plan) return sum;
    return sum + Math.round(plan.price_cents / INTERVAL_MONTHS[plan.interval]);
  }, 0);

  const stats: [string, string][] = [
    ["Active plans", `${plans.filter((p) => p.active).length}`],
    ["Members", `${members.length}`],
    ["Est. monthly revenue", money(mrrCents)],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Header />

      {error && <div className="mt-5"><FormBanner kind="error">{error}</FormBanner></div>}
      {saved && <div className="mt-5"><FormBanner kind="success">Saved.</FormBanner></div>}

      <div className="mt-5 grid grid-cols-3 gap-3">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card/50 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-steel">{label}</div>
            <div className="mt-1 font-mono text-xl font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Create a plan (owner/admin only) ── */}
      {!canManage ? (
        <div className="mt-6">
          <ManagerOnlyNote>
            Only an owner or admin can create or change membership plans.
          </ManagerOnlyNote>
        </div>
      ) : (
      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base">New plan</CardTitle>
          <CardDescription>
            Define what you charge. Enroll customers from their contact page; renewals send a secure
            Stripe link each cycle.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createPlan} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Plan name *</Label>
                <Input id="name" name="name" required maxLength={80} placeholder="Comfort Club" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="price">Price *</Label>
                  <Input
                    id="price"
                    name="price"
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="29.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="interval">Billed</Label>
                  <Select id="interval" name="interval" defaultValue="monthly">
                    {MEMBERSHIP_INTERVALS.map((i: MembershipInterval) => (
                      <option key={i} value={i}>
                        {INTERVAL_LABEL[i]}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                maxLength={200}
                placeholder="Priority service + 2 tune-ups a year"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="benefits">Benefits (one per line)</Label>
              <Textarea
                id="benefits"
                name="benefits"
                rows={3}
                placeholder={"Priority dispatch\nNo after-hours fee\n10% off repairs"}
              />
            </div>
            <Button type="submit">Create plan</Button>
          </form>
        </CardContent>
      </Card>
      )}

      {/* ── Existing plans ── */}
      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Your plans</CardTitle>
        </CardHeader>
        <CardContent>
          {plans.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No plans yet. Create one above, then enroll customers from their contact page.
            </p>
          ) : (
            <ul className="space-y-3">
              {plans.map((p) => (
                <li
                  key={p.id}
                  className={`rounded-lg border px-4 py-3 ${
                    p.active ? "border-border/60" : "border-border/40 opacity-60"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-medium text-foreground">{p.name}</span>
                    <span className="font-mono text-sm text-cyan">
                      {money(p.price_cents)}
                      <span className="text-steel"> / {INTERVAL_LABEL[p.interval].toLowerCase()}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 text-xs text-steel">
                      <Users className="size-3.5" aria-hidden />
                      {countByPlan.get(p.id) ?? 0}
                    </span>
                    {!p.active && (
                      <span className="rounded-full border border-border/70 px-2 py-0.5 text-[10px] uppercase text-steel">
                        Inactive
                      </span>
                    )}
                    {canManage && (
                      <form action={togglePlanActive} className="ml-auto">
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-xs">
                          {p.active ? "Deactivate" : "Reactivate"}
                        </Button>
                      </form>
                    )}
                  </div>
                  {p.description && (
                    <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                  )}
                  {p.benefits.length > 0 && (
                    <ul className="mt-2 flex flex-wrap gap-1.5">
                      {p.benefits.map((b) => (
                        <li
                          key={b}
                          className="rounded-full border border-border/50 px-2 py-0.5 text-xs text-steel"
                        >
                          {b}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <BadgeCheck className="size-6 text-cyan" aria-hidden />
        Membership
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Sell your customers a recurring plan — steady monthly revenue on top of one-off jobs.
      </p>
    </div>
  );
}
