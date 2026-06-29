import type { Metadata } from "next";
import Link from "next/link";
import { Bot, Globe, Inbox as InboxIcon, Mail, MessageSquare, Phone, TriangleAlert, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireActiveOrg } from "@/lib/auth";
import { getEntitlements } from "@/lib/billing/entitlements";
import { decryptText } from "@/lib/crypto";
import { formatUsPhone } from "@/lib/phone";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { InboxRefresher } from "./refresher";
import { sendStaffReply, setConversationStatus, toggleConversationAi } from "./actions";

export const metadata: Metadata = { title: "Inbox" };

type Convo = {
  id: string;
  channel: "web" | "sms" | "email";
  status: "open" | "closed";
  ai_enabled: boolean;
  customer_name: string | null;
  customer_phone: string | null;
  customer_email: string | null;
  subject: string | null;
  contact_id: string | null;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
};

function rel(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function who(c: Convo): string {
  if (c.customer_name) return c.customer_name;
  if (c.channel === "email") return c.customer_email ?? "Email";
  if (c.customer_phone) return formatUsPhone(c.customer_phone);
  return "Website visitor";
}

function channelLabel(channel: Convo["channel"]): string {
  return channel === "web" ? "Website chat" : channel === "email" ? "Email" : "SMS";
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { active } = await requireActiveOrg();
  const tenantId = active.organization_id;
  const ent = await getEntitlements(tenantId);

  if (!ent.has("omnichannel_chat")) {
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
            <strong>Omnichannel AI Chat</strong> is a +$29/mo add-on (also in the Growth Suite
            bundle). It adds a website chat widget and two-way AI texting, all in this shared inbox.
            Turn it on from the{" "}
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
  const { data: convoRows } = await supabase
    .from("conversations")
    .select(
      "id, channel, status, ai_enabled, customer_name, customer_phone, customer_email, subject, contact_id, last_message_preview, last_message_at, unread_count"
    )
    .eq("tenant_id", tenantId)
    .order("last_message_at", { ascending: false })
    .limit(60);
  const conversations = (convoRows ?? []) as Convo[];

  const params = await searchParams;
  const selectedId = params.c ?? conversations[0]?.id ?? null;
  const selected = conversations.find((c) => c.id === selectedId) ?? null;

  // Load + mark-read the open thread (admin: reset the unread badge).
  let messages: { id: string; role: string; body: string; at: string }[] = [];
  if (selected) {
    const admin = createAdminClient();
    const { data: msgRows } = await admin
      .from("conversation_messages")
      .select("id, role, body_encrypted, body_redacted, created_at")
      .eq("conversation_id", selected.id)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true })
      .limit(200);
    messages = (msgRows ?? []).map((r) => ({
      id: r.id as string,
      role: r.role as string,
      body: (r.body_encrypted ? decryptText(r.body_encrypted) : null) ?? (r.body_redacted as string) ?? "",
      at: r.created_at as string,
    }));
    if (selected.unread_count > 0) {
      await admin
        .from("conversations")
        .update({ unread_count: 0 })
        .eq("id", selected.id)
        .eq("tenant_id", tenantId);
    }
  }

  return (
    <div className="mx-auto max-w-6xl">
      <InboxRefresher />
      <Header />

      {conversations.length === 0 ? (
        <Card className="mt-6 bg-card/60">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No conversations yet. Add the website chat widget or turn on two-way AI texting from{" "}
            <Link href="/dashboard/settings" className="text-cyan hover:underline">
              Settings
            </Link>
            , and threads will land here.
          </CardContent>
        </Card>
      ) : (
        <div className="mt-6 grid gap-4 lg:grid-cols-[320px_1fr]">
          {/* Conversation list */}
          <div className="space-y-1.5">
            {conversations.map((c) => {
              const isSel = c.id === selectedId;
              return (
                <Link
                  key={c.id}
                  href={`/dashboard/inbox?c=${c.id}`}
                  className={`block rounded-xl border px-3.5 py-3 transition-colors ${
                    isSel
                      ? "border-cyan/50 bg-cyan/5"
                      : "border-border/60 bg-card/40 hover:border-cyan/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                      <ChannelIcon channel={c.channel} />
                      {who(c)}
                    </span>
                    {c.unread_count > 0 && (
                      <span className="shrink-0 rounded-full bg-cyan px-1.5 py-0.5 font-mono text-[10px] font-bold text-primary-foreground">
                        {c.unread_count}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {c.last_message_preview ?? "—"}
                  </p>
                  <div className="mt-1.5 flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-steel">
                    <span>{rel(c.last_message_at)}</span>
                    {!c.ai_enabled && <span className="text-amber-500">· human</span>}
                    {c.status === "closed" && <span>· closed</span>}
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Thread */}
          {selected ? (
            <Card className="flex min-h-[60vh] flex-col bg-card/60">
              <CardHeader className="flex-row items-center justify-between gap-3 border-b border-border/60">
                <div className="min-w-0">
                  <CardTitle className="flex items-center gap-2 font-display text-base">
                    <ChannelIcon channel={selected.channel} />
                    <span className="truncate">{who(selected)}</span>
                  </CardTitle>
                  {selected.channel === "email" && selected.subject && (
                    <p className="mt-0.5 truncate text-xs font-medium text-foreground">
                      {selected.subject}
                    </p>
                  )}
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {channelLabel(selected.channel)} ·{" "}
                    {selected.ai_enabled ? "AI answering" : "You've taken over"}
                    {selected.contact_id && (
                      <>
                        {" · "}
                        <Link
                          href={`/dashboard/contacts/${selected.contact_id}`}
                          className="text-cyan hover:underline"
                        >
                          View contact
                        </Link>
                      </>
                    )}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <form action={toggleConversationAi}>
                    <input type="hidden" name="conversationId" value={selected.id} />
                    <input type="hidden" name="ai_enabled" value={selected.ai_enabled ? "" : "on"} />
                    <Button type="submit" variant="outline" size="sm">
                      {selected.ai_enabled ? "Take over" : "Resume AI"}
                    </Button>
                  </form>
                  <form action={setConversationStatus}>
                    <input type="hidden" name="conversationId" value={selected.id} />
                    <input
                      type="hidden"
                      name="status"
                      value={selected.status === "open" ? "closed" : "open"}
                    />
                    <Button type="submit" variant="ghost" size="sm">
                      {selected.status === "open" ? "Close" : "Reopen"}
                    </Button>
                  </form>
                </div>
              </CardHeader>

              <CardContent className="flex flex-1 flex-col gap-3 overflow-y-auto py-4">
                {messages.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : (
                  messages.map((m) => <Bubble key={m.id} role={m.role} body={m.body} at={m.at} />)
                )}
              </CardContent>

              <div className="border-t border-border/60 p-3">
                <form action={sendStaffReply} className="flex items-center gap-2">
                  <input type="hidden" name="conversationId" value={selected.id} />
                  <input
                    name="body"
                    required
                    maxLength={1000}
                    placeholder={
                      selected.ai_enabled
                        ? "Reply (this takes over from the AI for this message)…"
                        : "Type your reply…"
                    }
                    className="h-10 flex-1 rounded-lg border border-input bg-night/60 px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label="Reply message"
                  />
                  <Button type="submit">Send</Button>
                </form>
                {selected.channel === "sms" && (
                  <p className="mt-1.5 px-1 text-[11px] text-steel">
                    Sent as a text · STOP always honored
                  </p>
                )}
                {selected.channel === "email" && (
                  <p className="mt-1.5 px-1 text-[11px] text-steel">
                    Sent as an email from your business name
                  </p>
                )}
              </div>
            </Card>
          ) : (
            <Card className="bg-card/60">
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Select a conversation.
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <>
      <h1 className="flex items-center gap-2 font-display text-2xl font-bold tracking-tight">
        <InboxIcon className="size-6 text-cyan" aria-hidden />
        Inbox
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Website chat, two-way texts, and email in one place. The AI answers; you can take over anytime.
      </p>
    </>
  );
}

function ChannelIcon({ channel }: { channel: "web" | "sms" | "email" }) {
  if (channel === "web")
    return <Globe className="size-4 shrink-0 text-cyan" aria-label="Website chat" />;
  if (channel === "email")
    return <Mail className="size-4 shrink-0 text-cyan" aria-label="Email" />;
  return <Phone className="size-4 shrink-0 text-cyan" aria-label="SMS" />;
}

function Bubble({ role, body, at }: { role: string; body: string; at: string }) {
  const mine = role === "ai" || role === "staff";
  const label = role === "ai" ? "AI" : role === "staff" ? "You" : role === "system" ? "System" : "Customer";
  const Icon = role === "ai" ? Bot : role === "customer" ? User : MessageSquare;
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed ${
          mine
            ? "rounded-br-sm border border-cyan/25 bg-cyan/10"
            : "rounded-bl-sm bg-secondary/70"
        }`}
      >
        <span className="mb-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-widest text-steel">
          <Icon className="size-2.5" aria-hidden />
          {label} · {rel(at)}
        </span>
        <span className="whitespace-pre-wrap text-foreground">{body}</span>
      </div>
    </div>
  );
}
