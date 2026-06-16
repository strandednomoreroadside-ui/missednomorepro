import type { Metadata } from "next";
import Link from "next/link";
import {
  Building2,
  CheckCircle2,
  DollarSign,
  FileUp,
  HelpCircle,
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
  const [hours, services, settings, faqs] = await Promise.all([
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
          .select("approved_at, max_service_miles")
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
  ]);

  const openDays = ((hours.data ?? []) as { closed: boolean }[]).filter((h) => !h.closed).length;
  const serviceCount = (services as { count: number | null }).count ?? 0;
  const faqCount = (faqs as { count: number | null }).count ?? 0;
  const quotingOn = Boolean((settings.data as { approved_at?: string } | null)?.approved_at);
  const radius = (settings.data as { max_service_miles?: number } | null)?.max_service_miles ?? null;

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

        {/* Document upload — the fast-follow */}
        <Card className="border-dashed bg-card/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-muted-foreground">
              <FileUp className="size-4" aria-hidden />
              Upload documents
              <span className="ml-auto rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-steel">
                soon
              </span>
            </CardTitle>
            <CardDescription>
              Coming next: drop in a price sheet or FAQ doc and we&rsquo;ll turn it into the
              structured services, prices, and answers above for you to approve — your AI
              still only quotes computed numbers, never text from a file.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    </div>
  );
}
