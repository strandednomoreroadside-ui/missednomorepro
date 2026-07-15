import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileText,
  FileUp,
  Trash2,
  TriangleAlert,
} from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { isExtractionConfigured, type ServiceSuggestion } from "@/lib/knowledge/extract";

import {
  approveAllForDocument,
  approveSuggestion,
  deleteDocument,
  rejectAllForDocument,
  rejectSuggestion,
  retryExtraction,
  uploadDocument,
} from "./actions";

export const metadata: Metadata = { title: "Upload documents" };

// Extraction (LLM + a possibly-large file) can take a while.
export const maxDuration = 60;

type DocRow = {
  id: string;
  file_name: string;
  mime_type: string | null;
  status: "uploaded" | "processing" | "extracted" | "failed";
  error: string | null;
  created_at: string;
};

type SuggestionRow = {
  id: string;
  document_id: string;
  kind: "faq" | "service";
  payload: Record<string, unknown>;
  status: "pending" | "approved" | "rejected";
};

function money(n: unknown): string {
  return typeof n === "number" ? `$${n}` : "—";
}

function serviceLine(p: ServiceSuggestion): string {
  if (p.pricing_type === "tow") {
    const free = p.free_miles ? `, ${p.free_miles} free mi` : "";
    return `Tow — ${money(p.hook_fee)} hook + ${money(p.per_mile_rate)}/mi${free}`;
  }
  const part = p.variable_part ? ` + cost of ${p.variable_part}` : "";
  return `Flat ${money(p.service_fee)}${part}`;
}

export default async function UploadDocsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const fromSetup = sp.from === "setup";
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id, name")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const [{ data: docsData }, { data: sugData }] = business
    ? await Promise.all([
        supabase
          .from("knowledge_documents")
          .select("id, file_name, mime_type, status, error, created_at")
          .eq("business_id", business.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("knowledge_suggestions")
          .select("id, document_id, kind, payload, status")
          .eq("business_id", business.id)
          .eq("status", "pending"),
      ])
    : [{ data: [] }, { data: [] }];

  const docs = (docsData ?? []) as DocRow[];
  const suggestions = (sugData ?? []) as SuggestionRow[];
  const byDoc = new Map<string, SuggestionRow[]>();
  for (const s of suggestions) {
    const list = byDoc.get(s.document_id) ?? [];
    list.push(s);
    byDoc.set(s.document_id, list);
  }
  const configured = isExtractionConfigured();

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={fromSetup ? "/dashboard/setup/services" : "/dashboard/knowledge"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden />
        {fromSetup ? "Back to setup" : "Knowledge Hub"}
      </Link>
      <h1 className="mt-2 font-display text-2xl font-bold tracking-tight">
        Upload documents
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Drop in a price sheet, FAQ document, or even a spreadsheet/log you use to
        track jobs and income — we read it and propose structured services, prices,
        and FAQs for {business?.name ?? "your business"} below — you approve each
        one. Your AI still only quotes computed numbers, never text from a file.
      </p>

      {!configured && (
        <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-500">
          Extraction isn&rsquo;t configured yet (missing OpenAI key). Uploads will
          be stored but won&rsquo;t be read automatically.
        </p>
      )}

      {/* Upload form */}
      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <FileUp className="size-4 text-cyan" aria-hidden />
            Upload a document
          </CardTitle>
          <CardDescription>
            PDF, image (PNG/JPG), spreadsheet (XLSX/CSV), or text. Up to
            10&nbsp;MB. Reading a file can take up to a minute.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={uploadDocument} className="space-y-3">
            <input
              type="file"
              name="file"
              required
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.csv,.md,.xlsx,application/pdf,image/png,image/jpeg,image/webp,text/plain,text/csv,text/markdown,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-cyan/10 file:px-3 file:py-2 file:text-sm file:font-medium file:text-cyan hover:file:bg-cyan/20"
            />
            <Button type="submit">Upload &amp; read</Button>
          </form>
        </CardContent>
      </Card>

      {/* Documents + their pending suggestions */}
      <div className="mt-6 space-y-4">
        {docs.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No documents yet. Upload your price sheet, an FAQ doc, or a job/income
            log to get started.
          </p>
        ) : (
          docs.map((doc) => {
            const items = byDoc.get(doc.id) ?? [];
            return (
              <Card key={doc.id} className="bg-card/60">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <FileText className="size-4 text-cyan" aria-hidden />
                    <span className="min-w-0 flex-1 truncate">{doc.file_name}</span>
                    <StatusBadge status={doc.status} />
                  </CardTitle>
                  {doc.status === "failed" && doc.error && (
                    <CardDescription className="text-amber-500">
                      {doc.error}
                    </CardDescription>
                  )}
                  {doc.status === "extracted" && items.length === 0 && (
                    <CardDescription>
                      Nothing left to review — all suggestions handled.
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-2">
                  {items.length > 0 && (
                    <div className="flex items-center justify-between gap-2 border-b border-border/40 pb-2">
                      <span className="text-xs text-muted-foreground">
                        {items.length} suggestion{items.length === 1 ? "" : "s"} to review
                      </span>
                      <div className="flex items-center gap-1">
                        <form action={approveAllForDocument}>
                          <input type="hidden" name="documentId" value={doc.id} />
                          <Button type="submit" size="sm">
                            Approve all ({items.length})
                          </Button>
                        </form>
                        <form action={rejectAllForDocument}>
                          <input type="hidden" name="documentId" value={doc.id} />
                          <Button type="submit" variant="ghost" size="sm">
                            Reject all
                          </Button>
                        </form>
                      </div>
                    </div>
                  )}
                  {items.length > 0 && (
                    <ul className="divide-y divide-border/40">
                      {items.map((s) => (
                        <li
                          key={s.id}
                          className="flex items-start gap-3 py-2.5"
                        >
                          <span
                            className="mt-0.5 shrink-0 rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-steel"
                          >
                            {s.kind}
                          </span>
                          <div className="min-w-0 flex-1">
                            {s.kind === "faq" ? (
                              <>
                                <p className="text-sm font-medium text-foreground">
                                  {String(s.payload.question ?? "")}
                                </p>
                                <p className="mt-0.5 text-sm text-muted-foreground">
                                  {String(s.payload.answer ?? "")}
                                </p>
                              </>
                            ) : (
                              <>
                                <p className="text-sm font-medium text-foreground">
                                  {String(s.payload.name ?? "")}
                                </p>
                                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                                  {serviceLine(s.payload as ServiceSuggestion)}
                                </p>
                              </>
                            )}
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <form action={approveSuggestion}>
                              <input type="hidden" name="id" value={s.id} />
                              <Button type="submit" variant="outline" size="sm">
                                Approve
                              </Button>
                            </form>
                            <form action={rejectSuggestion}>
                              <input type="hidden" name="id" value={s.id} />
                              <Button
                                type="submit"
                                variant="ghost"
                                size="sm"
                                aria-label="Reject suggestion"
                              >
                                <Trash2
                                  className="size-4 text-muted-foreground"
                                  aria-hidden
                                />
                              </Button>
                            </form>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex items-center gap-1 pt-1">
                    {doc.status === "failed" && (
                      <form action={retryExtraction}>
                        <input type="hidden" name="documentId" value={doc.id} />
                        <Button type="submit" variant="outline" size="sm">
                          Retry reading
                        </Button>
                      </form>
                    )}
                    <form action={deleteDocument}>
                      <input type="hidden" name="documentId" value={doc.id} />
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground"
                      >
                        Delete document
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {suggestions.some((s) => s.kind === "service") && (
        <p className="mt-4 text-xs text-steel">
          Approving a service adds it to{" "}
          <Link href="/dashboard/pricing" className="text-cyan hover:underline">
            Prices &amp; services
          </Link>
          . Re-approve pricing there to turn quoting on for new services.
        </p>
      )}

      {fromSetup && (
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-cyan/25 bg-cyan/5 px-4 py-3">
          <p className="text-sm text-foreground">
            Done approving? Pick up your setup where you left off.
          </p>
          <Link href="/dashboard/setup/services" className={buttonVariants({ size: "sm" })}>
            Continue setup
          </Link>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: DocRow["status"] }) {
  const map = {
    uploaded: { icon: Clock, text: "uploaded", cls: "border-border/70 text-steel" },
    processing: { icon: Clock, text: "reading…", cls: "border-cyan/30 text-cyan" },
    extracted: {
      icon: CheckCircle2,
      text: "ready to review",
      cls: "border-cyan/30 text-cyan",
    },
    failed: {
      icon: TriangleAlert,
      text: "failed",
      cls: "border-amber-500/40 text-amber-500",
    },
  } as const;
  const { icon: Icon, text, cls } = map[status];
  return (
    <span
      className={`ml-auto inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase ${cls}`}
    >
      <Icon className="size-3" aria-hidden />
      {text}
    </span>
  );
}
