import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  Check,
  CheckCircle2,
  Circle,
  DollarSign,
  FileUp,
  HelpCircle,
  Sparkles,
  TriangleAlert,
} from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Knowledge Hub" };

export default async function KnowledgeHubPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name, industry")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const bizId = business?.id;
  const [hours, services, settings, faqs, pendingSuggestions, zones] = await Promise.all([
    bizId
      ? supabase.from("business_hours").select("closed").eq("business_id", bizId)
      : Promise.resolve({ data: [] }),
    bizId
      ? supabase
          .from("service_pricing")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bizId)
          .eq("active", true)
      : Promise.resolve({ count: 0 }),
    bizId
      ? supabase
          .from("pricing_settings")
          .select("approved_at, max_service_miles, base_address")
          .eq("business_id", bizId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    bizId
      ? supabase
          .from("faqs")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bizId)
          .eq("active", true)
      : Promise.resolve({ count: 0 }),
    bizId
      ? supabase
          .from("knowledge_suggestions")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bizId)
          .eq("status", "pending")
      : Promise.resolve({ count: 0 }),
    bizId
      ? supabase
          .from("pricing_zones")
          .select("id", { count: "exact", head: true })
          .eq("business_id", bizId)
          .eq("active", true)
      : Promise.resolve({ count: 0 }),
  ]);

  const openDays = ((hours.data ?? []) as { closed: boolean }[]).filter((h) => !h.closed).length;
  const serviceCount = (services as { count: number | null }).count ?? 0;
  const faqCount = (faqs as { count: number | null }).count ?? 0;
  const pendingCount = (pendingSuggestions as { count: number | null }).count ?? 0;
  const zoneCount = (zones as { count: number | null }).count ?? 0;
  const settingsRow = settings.data as
    | { approved_at?: string; max_service_miles?: number; base_address?: string }
    | null;
  const quotingOn = Boolean(settingsRow?.approved_at);
  const radius = settingsRow?.max_service_miles ?? null;

  // "Steps to start quoting" — mirrors approvePricing's requirements (home
  // base geocoded + ≥1 zone + ≥1 active service, then owner approval). Shown
  // only while quoting is off, so it disappears once the business is live.
  const quotingSteps = [
    { label: "Set your home base address", done: Boolean(settingsRow?.base_address), href: "/dashboard/setup/service-area" },
    { label: "Add at least one dispatch zone", done: zoneCount > 0, href: "/dashboard/pricing" },
    { label: "Add at least one service with a price", done: serviceCount > 0, href: "/dashboard/pricing" },
    { label: "Review & approve pricing", done: quotingOn, href: "/dashboard/pricing" },
  ];
  const stepsLeft = quotingSteps.filter((s) => !s.done).length;

  const cards = [
    {
      icon: Building2,
      title: "Business basics",
      desc: "Name, trade, hours, and service area the AI introduces and works from.",
      stat:
        `${business?.industry ? business.industry + " · " : ""}` +
        `${openDays} day${openDays === 1 ? "" : "s"}/week open` +
        `${radius != null ? ` · ${radius}-mi radius` : ""}`,
      href: "/dashboard/setup",
      cta: "Edit in setup",
    },
    {
      icon: DollarSign,
      title: "Services & pricing",
      desc: "What you offer and exact prices the AI quotes (computed, never guessed).",
      stat: `${serviceCount} service${serviceCount === 1 ? "" : "s"}`,
      badge: quotingOn
        ? { ok: true, text: "quoting on" }
        : { ok: false, text: "quoting off" },
      href: "/dashboard/pricing",
      cta: "Manage prices & services",
    },
    {
      icon: HelpCircle,
      title: "FAQs",
      desc: "Common questions and the answers the AI may give callers.",
      stat: `${faqCount} active`,
      href: "/dashboard/faqs",
      cta: "Manage FAQs",
    },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Knowledge Hub</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything your AI knows about {business?.name ?? "your business"}, in one place.
        Keep it current and your AI stays accurate on every call.
      </p>

      {!quotingOn && (
        <Card className="mt-6 border-cyan/25 bg-cyan/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Sparkles className="size-4 text-cyan" aria-hidden />
              {stepsLeft === 0
                ? "You're ready — approve to start quoting"
                : `${stepsLeft} step${stepsLeft === 1 ? "" : "s"} to start quoting exact prices`}
            </CardTitle>
            <CardDescription>
              Until this is done, the AI books and answers but says &ldquo;the owner will
              text you an exact quote&rdquo; on price. Finish these and it quotes computed
              totals on the call.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-1">
              {quotingSteps.map((s) => (
                <li key={s.label}>
                  <Link
                    href={s.href}
                    className="flex items-center gap-2.5 rounded-md px-1.5 py-1.5 text-sm transition-colors hover:bg-card/60"
                  >
                    {s.done ? (
                      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-success/40 bg-success/10">
                        <Check className="size-3 text-success" strokeWidth={3} aria-hidden />
                      </span>
                    ) : (
                      <Circle className="size-5 shrink-0 text-steel/50" aria-hidden />
                    )}
                    <span className={s.done ? "text-muted-foreground line-through" : "text-foreground"}>
                      {s.label}
                    </span>
                    {!s.done && <span className="ml-auto text-xs text-cyan">Do this →</span>}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 space-y-4">
        {cards.map((c) => (
          <Card key={c.title} className="bg-card/60 transition-colors hover:border-cyan/40">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <c.icon className="size-4 text-cyan" aria-hidden />
                {c.title}
                {c.badge && (
                  <span
                    className={`ml-auto inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${
                      c.badge.ok ? "border-cyan/30 text-cyan" : "border-amber-500/40 text-amber-500"
                    }`}
                  >
                    {c.badge.ok ? (
                      <CheckCircle2 className="size-3" aria-hidden />
                    ) : (
                      <TriangleAlert className="size-3" aria-hidden />
                    )}
                    {c.badge.text}
                  </span>
                )}
              </CardTitle>
              <CardDescription>{c.desc}</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <span className="font-mono text-sm text-foreground">{c.stat}</span>
              <Link
                href={c.href}
                className="text-sm font-medium text-cyan hover:underline"
              >
                {c.cta} →
              </Link>
            </CardContent>
          </Card>
        ))}

        {/* Document upload — extract structured FAQs + prices to approve */}
        <Card className="bg-card/60 transition-colors hover:border-cyan/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <FileUp className="size-4 text-cyan" aria-hidden />
              Upload documents
              {pendingCount > 0 && (
                <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-cyan/30 px-2 py-0.5 text-[10px] font-medium uppercase text-cyan">
                  {pendingCount} to review
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Drop in a price sheet, FAQ doc, or a spreadsheet/log you use to track
              jobs and income — we&rsquo;ll turn it into structured services, prices,
              and answers for you to approve. Your AI still only quotes computed
              numbers, never text from a file.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            <span className="font-mono text-sm text-foreground">
              {pendingCount > 0
                ? `${pendingCount} suggestion${pendingCount === 1 ? "" : "s"} pending`
                : "PDF, image, spreadsheet, or text"}
            </span>
            <Link
              href="/dashboard/knowledge/upload"
              className="text-sm font-medium text-cyan hover:underline"
            >
              Upload &amp; review →
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
