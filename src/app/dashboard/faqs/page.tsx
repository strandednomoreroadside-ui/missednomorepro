import type { Metadata } from "next";
import { HelpCircle, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { requireActiveOrg } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

import { addFaq, deleteFaq, toggleFaq, updateFaq } from "./actions";

export const metadata: Metadata = { title: "FAQs" };

type FaqRow = { id: string; question: string; answer: string; active: boolean };

export default async function FaqsPage() {
  const { active } = await requireActiveOrg();
  const supabase = await createClient();

  const { data: business } = await supabase
    .from("businesses")
    .select("id")
    .eq("tenant_id", active.organization_id)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  const { data } = business
    ? await supabase
        .from("faqs")
        .select("id, question, answer, active")
        .eq("business_id", business.id)
        .order("created_at", { ascending: true })
    : { data: [] };
  const faqs = (data ?? []) as FaqRow[];
  const activeCount = faqs.filter((f) => f.active).length;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="font-display text-2xl font-bold tracking-tight">FAQs</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Questions your callers ask and the answers the AI may give. Add your 5–10
        most common ones — the AI uses these instead of guessing.
      </p>

      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <HelpCircle className="size-4 text-cyan" aria-hidden />
            Add an FAQ
          </CardTitle>
          <CardDescription>
            Keep answers short and factual. The AI reads these on calls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={addFaq} className="space-y-3">
            <Input
              name="question"
              placeholder="e.g. Do you tow motorcycles?"
              maxLength={300}
              required
              aria-label="Question"
            />
            <Textarea
              name="answer"
              placeholder="e.g. Yes — we tow motorcycles with a flatbed; just let us know it's a bike."
              rows={3}
              maxLength={2000}
              required
              aria-label="Answer"
            />
            <Button type="submit">Add FAQ</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="mt-4 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Your FAQs{" "}
            <span className="ml-1 font-mono text-xs text-steel">
              {activeCount} active
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {faqs.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No FAQs yet. Add your most common questions above.
            </p>
          ) : (
            <ul className="divide-y divide-border/40">
              {faqs.map((f) => (
                <li key={f.id} className="py-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{f.question}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{f.answer}</p>
                      {!f.active && (
                        <span className="mt-1 inline-block rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-steel">
                          off
                        </span>
                      )}
                      <details className="group mt-1">
                        <summary className="cursor-pointer list-none text-xs text-cyan hover:underline [&::-webkit-details-marker]:hidden">
                          Edit
                        </summary>
                        <form action={updateFaq} className="mt-2 space-y-2">
                          <input type="hidden" name="id" value={f.id} />
                          <Input
                            name="question"
                            defaultValue={f.question}
                            maxLength={300}
                            required
                            aria-label="Edit question"
                          />
                          <Textarea
                            name="answer"
                            defaultValue={f.answer}
                            rows={3}
                            maxLength={2000}
                            required
                            aria-label="Edit answer"
                          />
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                        </form>
                      </details>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <form action={toggleFaq}>
                        <input type="hidden" name="id" value={f.id} />
                        <input type="hidden" name="active" value={(!f.active).toString()} />
                        <Button type="submit" variant="ghost" size="sm">
                          {f.active ? "Turn off" : "Turn on"}
                        </Button>
                      </form>
                      <form action={deleteFaq}>
                        <input type="hidden" name="id" value={f.id} />
                        <Button
                          type="submit"
                          variant="ghost"
                          size="sm"
                          aria-label="Delete FAQ"
                        >
                          <Trash2 className="size-4 text-muted-foreground" aria-hidden />
                        </Button>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
