import type { Metadata } from "next";
import Link from "next/link";
import { MessageSquareWarning, Star, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";

import { updateReputation } from "./actions";

export const metadata: Metadata = { title: "Reputation" };

type ReviewRow = {
  id: string;
  rating: number | null;
  status: "requested" | "rated" | "feedback";
  feedback_redacted: string | null;
  public_url_sent: boolean;
  created_at: string;
  rated_at: string | null;
  contacts: { name: string | null } | null;
};

const STATUS_LABEL: Record<ReviewRow["status"], string> = {
  requested: "Sent · awaiting reply",
  rated: "Rated",
  feedback: "Private feedback",
};

export default async function ReputationPage() {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);

  if (!ent.has("reputation_manager")) {
    return (
      <div className="mx-auto max-w-3xl">
        <Header />
        <Card className="mt-6 border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base text-amber-500">
              <TriangleAlert className="size-4" aria-hidden />
              Add-on required
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            <strong>AI Reputation Manager</strong> is a +$29/mo add-on — it texts customers for a
            rating after a job, sends happy ones to your public review page, and routes unhappy ones
            to private feedback so a bad day doesn&rsquo;t become a public 1-star. Turn it on from
            the{" "}
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
  const [{ data: settings }, { data: business }, { data: reviewData }] = await Promise.all([
    supabase
      .from("sms_settings")
      .select("reputation_enabled, review_request_template, review_facebook_url")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("businesses")
      .select("gbp_url")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select(
        "id, rating, status, feedback_redacted, public_url_sent, created_at, rated_at, contacts(name)"
      )
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const reviews = (reviewData ?? []) as unknown as ReviewRow[];
  const rated = reviews.filter((r) => r.rating != null);
  const avg = rated.length
    ? (rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length).toFixed(1)
    : "—";
  const happy = rated.filter((r) => (r.rating ?? 0) >= 4).length;
  const gbpUrl = (business?.gbp_url as string | null) ?? null;

  const stats: [string, string][] = [
    ["Requests sent", `${reviews.length}`],
    ["Avg rating", avg],
    ["4–5 stars", `${happy}`],
    ["Needs follow-up", `${reviews.filter((r) => r.status === "feedback").length}`],
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <Header />

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-border/60 bg-card/50 px-4 py-3">
            <div className="font-mono text-[10px] uppercase tracking-wider text-steel">{label}</div>
            <div className="mt-1 font-mono text-xl font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>

      {/* ── Settings ── */}
      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form action={updateReputation} className="space-y-5">
            <label className="flex items-start gap-3 text-sm">
              <input
                type="checkbox"
                name="reputation_enabled"
                defaultChecked={settings?.reputation_enabled ?? false}
                className="mt-1 accent-cyan"
              />
              <span>
                <span className="font-medium text-foreground">
                  Ask for a review after each completed job
                </span>
                <span className="mt-0.5 block text-xs text-muted-foreground">
                  When you mark a job complete, we text the customer for a 1–5 rating. 4–5 get your
                  public review link; 1–3 are routed to you privately.
                </span>
              </span>
            </label>

            <div className="space-y-1.5">
              <Label htmlFor="review_request_template">Review request text</Label>
              <Textarea
                id="review_request_template"
                name="review_request_template"
                rows={3}
                defaultValue={settings?.review_request_template ?? ""}
                placeholder="Thanks for choosing {business}, {name}! How did we do? Reply 1-5 (5 = great). Reply STOP to opt out."
              />
              <p className="text-xs text-steel">
                Use <code className="text-cyan">{"{name}"}</code> and{" "}
                <code className="text-cyan">{"{business}"}</code>. Always keep a STOP notice.
              </p>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="review_facebook_url">Facebook review link (optional)</Label>
              <Input
                id="review_facebook_url"
                name="review_facebook_url"
                type="url"
                defaultValue={settings?.review_facebook_url ?? ""}
                placeholder="https://facebook.com/yourpage/reviews"
              />
              <p className="text-xs text-steel">
                {gbpUrl ? (
                  <>
                    Your Google review link is set in{" "}
                    <Link href="/dashboard/setup" className="text-cyan hover:underline">
                      Setup
                    </Link>{" "}
                    and is used first. Facebook is the fallback.
                  </>
                ) : (
                  <>
                    No Google Business Profile link yet — add one in{" "}
                    <Link href="/dashboard/setup" className="text-cyan hover:underline">
                      Setup
                    </Link>{" "}
                    (preferred), or use Facebook here.
                  </>
                )}
              </p>
            </div>

            <Button type="submit" size="sm">
              Save settings
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ── Reviews list ── */}
      <Card className="mt-6 bg-card/60">
        <CardHeader>
          <CardTitle className="font-display text-base">Recent reviews</CardTitle>
        </CardHeader>
        <CardContent>
          {reviews.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No review requests yet. Turn on the setting above, then mark a job complete to send
              your first one.
            </p>
          ) : (
            <ul className="divide-y divide-border/60">
              {reviews.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-foreground">
                        {r.contacts?.name ?? "Customer"}
                      </span>
                      {r.rating != null && (
                        <span className="inline-flex items-center gap-0.5 font-mono text-xs text-cyan">
                          <Star className="size-3 fill-cyan" aria-hidden />
                          {r.rating}
                        </span>
                      )}
                    </div>
                    {r.feedback_redacted && (
                      <p className="mt-1 flex items-start gap-1.5 text-xs text-muted-foreground">
                        <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0 text-amber-500" aria-hidden />
                        {r.feedback_redacted}
                      </p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <div className="font-mono text-[10px] uppercase tracking-wider text-steel">
                      {STATUS_LABEL[r.status]}
                    </div>
                    <div className="mt-0.5 text-[11px] text-steel">
                      {new Date(r.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
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

function Header() {
  return (
    <div>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Star className="size-6 text-cyan" aria-hidden />
        Reputation
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        More 5-star reviews, fewer public 1-stars — unhappy customers come straight to you.
      </p>
    </div>
  );
}
