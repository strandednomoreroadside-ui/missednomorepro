import type { Metadata } from "next";
import Link from "next/link";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { requireActiveOrg } from "@/lib/auth";
import {
  BOARD_STAGES,
  PIPELINE_STAGES,
  STAGE_META,
  type PipelineStage,
} from "@/lib/crm/pipeline";
import { createClient } from "@/lib/supabase/server";

import { moveLeadStage } from "./actions";

export const metadata: Metadata = { title: "Pipeline" };

type LeadRow = {
  id: string;
  status: string;
  service_needed: string | null;
  estimated_value: number | null;
  urgency: string | null;
  created_at: string;
  contacts: { id: string; name: string } | { id: string; name: string }[] | null;
};

function one<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export default async function LeadsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data } = await supabase
    .from("leads")
    .select(
      "id, status, service_needed, estimated_value, urgency, created_at, contacts ( id, name )"
    )
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: false });

  const leads = (data ?? []) as LeadRow[];
  const byStage = new Map<string, LeadRow[]>();
  for (const l of leads) {
    const list = byStage.get(l.status) ?? [];
    list.push(l);
    byStage.set(l.status, list);
  }

  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">Pipeline</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every lead, from first call to repeat customer. Your AI moves them
        forward as it quotes and books — drag-free: change a stage anytime.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {BOARD_STAGES.map((stage) => {
          const items = byStage.get(stage) ?? [];
          const meta = STAGE_META[stage];
          return (
            <div key={stage} className="flex flex-col">
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium ${meta.className}`}
                >
                  {meta.label}
                </span>
                <span className="font-mono text-xs text-steel">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/50 px-2 py-4 text-center text-[11px] text-steel">
                    —
                  </p>
                ) : (
                  items.map((l) => {
                    const contact = one(l.contacts);
                    return (
                      <Card key={l.id} className="bg-card/60">
                        <CardHeader className="p-3 pb-2">
                          <CardTitle className="text-sm font-medium">
                            {contact ? (
                              <Link
                                href={`/dashboard/contacts/${contact.id}`}
                                className="hover:text-cyan"
                              >
                                {contact.name}
                              </Link>
                            ) : (
                              "Unknown"
                            )}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-2 p-3 pt-0">
                          {l.service_needed && (
                            <p className="text-xs text-muted-foreground">{l.service_needed}</p>
                          )}
                          <div className="flex items-center gap-2 text-[11px] text-steel">
                            {l.estimated_value != null && (
                              <span className="font-mono text-cyan">
                                ${Number(l.estimated_value).toLocaleString()}
                              </span>
                            )}
                            {l.urgency && <span>· {l.urgency}</span>}
                          </div>
                          <form action={moveLeadStage} className="flex items-center gap-1">
                            <input type="hidden" name="lead_id" value={l.id} />
                            <Select
                              name="status"
                              defaultValue={l.status}
                              className="h-7 flex-1 text-[11px]"
                              aria-label="Move stage"
                            >
                              {PIPELINE_STAGES.map((s) => (
                                <option key={s} value={s}>
                                  {STAGE_META[s as PipelineStage].label}
                                </option>
                              ))}
                            </Select>
                            <Button type="submit" variant="outline" size="sm" className="h-7 px-2 text-[11px]">
                              Move
                            </Button>
                          </form>
                        </CardContent>
                      </Card>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
