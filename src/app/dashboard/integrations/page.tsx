import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Send, TriangleAlert, Webhook } from "lucide-react";

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
import { getEntitlements } from "@/lib/billing/entitlements";
import { createClient } from "@/lib/supabase/server";
import { EVENT_META, WEBHOOK_EVENTS } from "@/lib/webhooks/events";

import { addWebhook, deleteWebhook, sendTestWebhook, toggleWebhook } from "./actions";

export const metadata: Metadata = { title: "Integrations" };

type EndpointRow = {
  id: string;
  label: string | null;
  url: string;
  secret: string;
  events: string[];
  active: boolean;
  failure_count: number;
  last_success_at: string | null;
  last_error: string | null;
};

type DeliveryRow = {
  id: string;
  endpoint_id: string;
  event: string;
  status: string;
  response_status: number | null;
  attempts: number;
  created_at: string;
};

const STATUS_STYLE: Record<string, string> = {
  success: "border-success/40 text-success",
  failed: "border-red-500/40 text-red-400",
  pending: "border-amber-500/40 text-amber-400",
};

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default async function IntegrationsPage() {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const canManage = active.role === "owner" || active.role === "admin";
  const entitled = (await getEntitlements(tenantId)).has("zapier");

  const supabase = await createClient();
  const [{ data: endpointRows }, { data: deliveryRows }] = entitled
    ? await Promise.all([
        supabase
          .from("webhook_endpoints")
          .select("id, label, url, secret, events, active, failure_count, last_success_at, last_error")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: true }),
        supabase
          .from("webhook_deliveries")
          .select("id, endpoint_id, event, status, response_status, attempts, created_at")
          .eq("tenant_id", tenantId)
          .order("created_at", { ascending: false })
          .limit(20),
      ])
    : [{ data: [] }, { data: [] }];

  const endpoints = (endpointRows ?? []) as EndpointRow[];
  const deliveries = (deliveryRows ?? []) as DeliveryRow[];
  const endpointLabel = new Map(endpoints.map((e) => [e.id, e.label || e.url]));

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <Webhook className="size-6 text-cyan" aria-hidden />
        Integrations
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Send your business events to Zapier, Make, or any tool — connect your CRM,
        spreadsheets, email marketing, and more.
      </p>

      {!entitled ? (
        <Card className="mt-6 bg-card/60">
          <CardContent className="flex items-start gap-3 py-5">
            <TriangleAlert className="mt-0.5 size-5 shrink-0 text-amber-500" aria-hidden />
            <div className="text-sm text-muted-foreground">
              Webhooks &amp; Zapier are part of the{" "}
              <span className="text-foreground">Professional</span> plan and up. Upgrade
              to connect your other tools.{" "}
              <Link href="/dashboard/billing" className="text-cyan hover:underline">
                See plans →
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="mt-6 bg-card/60">
            <CardHeader>
              <CardTitle className="font-display text-base">How it works</CardTitle>
              <CardDescription>
                In Zapier, create a Zap with a <strong>Webhooks by Zapier → Catch Hook</strong>{" "}
                trigger, copy its URL, and add it below. We&rsquo;ll POST a JSON payload the
                moment each event happens. Every request is signed with your endpoint secret
                in the <code className="text-cyan">X-MNM-Signature</code> header so you can
                verify it&rsquo;s really us.
              </CardDescription>
            </CardHeader>
          </Card>

          {/* Existing endpoints */}
          {endpoints.length > 0 && (
            <div className="mt-4 space-y-3">
              {endpoints.map((e) => (
                <Card key={e.id} className="bg-card/60">
                  <CardContent className="space-y-3 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          e.active ? "border-success/40 text-success" : "border-border/70 text-steel"
                        }`}
                      >
                        {e.active ? "active" : "paused"}
                      </span>
                      {e.label && <span className="text-sm font-medium text-foreground">{e.label}</span>}
                      <span className="truncate font-mono text-xs text-muted-foreground">{e.url}</span>
                    </div>

                    <div className="flex flex-wrap gap-1.5">
                      {(e.events.length === 0 ? ["all events"] : e.events).map((ev) => (
                        <span
                          key={ev}
                          className="rounded-full border border-border/60 px-2 py-0.5 font-mono text-[10px] text-steel"
                        >
                          {ev}
                        </span>
                      ))}
                    </div>

                    <p className="font-mono text-[11px] text-steel">
                      Secret: <span className="select-all text-muted-foreground">{e.secret}</span>
                    </p>

                    {!e.active && e.last_error && (
                      <p className="text-xs text-amber-400">
                        Auto-paused after repeated failures (last error: {e.last_error}). Fix the
                        URL and re-enable.
                      </p>
                    )}

                    {canManage && (
                      <div className="flex flex-wrap gap-2 pt-1">
                        <form action={sendTestWebhook}>
                          <input type="hidden" name="id" value={e.id} />
                          <Button type="submit" size="sm" variant="outline">
                            <Send className="size-3.5" aria-hidden />
                            Send test
                          </Button>
                        </form>
                        <form action={toggleWebhook}>
                          <input type="hidden" name="id" value={e.id} />
                          <input type="hidden" name="active" value={e.active ? "false" : "true"} />
                          <Button type="submit" size="sm" variant="outline">
                            {e.active ? "Pause" : "Enable"}
                          </Button>
                        </form>
                        <form action={deleteWebhook}>
                          <input type="hidden" name="id" value={e.id} />
                          <Button type="submit" size="sm" variant="ghost" className="text-red-400 hover:text-red-300">
                            Delete
                          </Button>
                        </form>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Add endpoint */}
          {canManage && (
            <Card className="mt-4 bg-card/60">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-display text-base">
                  <Plus className="size-4 text-cyan" aria-hidden />
                  Add an endpoint
                </CardTitle>
                <CardDescription>
                  Paste your Zapier Catch Hook URL (or any HTTPS endpoint) and choose which
                  events to send. Leave all unchecked to receive everything.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form action={addWebhook} className="space-y-4">
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Endpoint URL</span>
                    <Input
                      type="url"
                      name="url"
                      required
                      placeholder="https://hooks.zapier.com/hooks/catch/..."
                      className="mt-1 font-mono"
                      aria-label="Endpoint URL"
                    />
                  </label>
                  <label className="block text-sm">
                    <span className="text-muted-foreground">Label (optional)</span>
                    <Input
                      type="text"
                      name="label"
                      placeholder="Zapier → Google Sheets"
                      className="mt-1 w-72"
                      aria-label="Label"
                    />
                  </label>
                  <fieldset className="space-y-2">
                    <legend className="text-sm text-muted-foreground">Events</legend>
                    {WEBHOOK_EVENTS.map((ev) => (
                      <label key={ev} className="flex items-start gap-2.5 text-sm">
                        <input type="checkbox" name={`event_${ev}`} className="mt-1 accent-cyan" />
                        <span>
                          <span className="font-mono text-xs text-foreground">{ev}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {EVENT_META[ev].description}
                          </span>
                        </span>
                      </label>
                    ))}
                  </fieldset>
                  <Button type="submit">Add endpoint</Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Recent deliveries */}
          <Card className="mt-4 bg-card/60">
            <CardHeader>
              <CardTitle className="font-display text-base">Recent deliveries</CardTitle>
              <CardDescription>The last 20 webhook attempts.</CardDescription>
            </CardHeader>
            <CardContent>
              {deliveries.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No deliveries yet. Add an endpoint and hit “Send test” to try it.
                </p>
              ) : (
                <ul className="divide-y divide-border/40">
                  {deliveries.map((d) => (
                    <li key={d.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                      <span
                        className={`rounded-full border px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                          STATUS_STYLE[d.status] ?? "border-border/70 text-steel"
                        }`}
                      >
                        {d.status}
                      </span>
                      <span className="font-mono text-xs text-foreground">{d.event}</span>
                      <span className="truncate text-xs text-muted-foreground">
                        {endpointLabel.get(d.endpoint_id) ?? "—"}
                      </span>
                      <span className="ml-auto flex items-center gap-3 font-mono text-[11px] text-steel">
                        {d.response_status != null && <span>HTTP {d.response_status}</span>}
                        {d.attempts > 1 && <span>×{d.attempts}</span>}
                        <span>{timeAgo(d.created_at)}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {entitled && !canManage && (
        <p className="mt-4 text-xs text-steel">Only an owner or admin can manage integrations.</p>
      )}
    </div>
  );
}
