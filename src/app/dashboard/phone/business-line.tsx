"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  MessageSquare,
  PhoneCall,
  PhoneOutgoing,
  RotateCcw,
  Send,
  WifiOff,
} from "lucide-react";

import { startOutboundCall, sendManualText } from "@/app/dashboard/numbers/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatUsPhone, normalizeUsPhone } from "@/lib/phone";
import { cn } from "@/lib/utils";

export type BusinessLineRecentItem = {
  id: string;
  kind: "call" | "text";
  phone: string;
  name: string | null;
  status: string;
  at: string;
  when: string;
};

type Mode = "call" | "text";

export function BusinessLine({
  voiceNumber,
  smsNumber,
  smsStatus,
  callbackPhone,
  contacts,
  recents,
  canManage,
  providerReady,
  serviceReady,
}: {
  voiceNumber: string | null;
  smsNumber: string | null;
  smsStatus: string | null;
  callbackPhone: string;
  contacts: { id: string; name: string; phone: string }[];
  recents: BusinessLineRecentItem[];
  canManage: boolean;
  providerReady: boolean;
  serviceReady: boolean;
}) {
  const [mode, setMode] = useState<Mode>(voiceNumber ? "call" : "text");
  const [recipient, setRecipient] = useState("");
  const [ringPhone, setRingPhone] = useState(formatUsPhone(callbackPhone));
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [online, setOnline] = useState(true);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  const normalizedRecipient = normalizeUsPhone(recipient);
  const normalizedRing = normalizeUsPhone(ringPhone);
  const selectedContact = useMemo(
    () => contacts.find((contact) => contact.phone === normalizedRecipient) ?? null,
    [contacts, normalizedRecipient]
  );
  const actionAllowed = canManage && serviceReady && online;
  const canCall = actionAllowed && !!voiceNumber && !!normalizedRecipient && !!normalizedRing;
  const canText = actionAllowed && !!smsNumber && !!normalizedRecipient && message.trim().length > 0;

  function selectMode(next: Mode) {
    setMode(next);
    setResult(null);
  }

  function chooseRecent(item: BusinessLineRecentItem, next: Mode) {
    setRecipient(formatUsPhone(item.phone));
    selectMode(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function placeCall() {
    if (!canCall) return;
    setResult(null);
    startTransition(async () => {
      const response = await startOutboundCall(recipient, ringPhone);
      if (!response.ok) {
        setResult({ kind: "error", text: response.error ?? "We couldn't start the call. Try again." });
        return;
      }
      const customer = selectedContact?.name ?? formatUsPhone(normalizedRecipient);
      setResult({
        kind: "success",
        text: `Your phone is ringing. Answer to connect with ${customer}. They'll see ${formatUsPhone(voiceNumber)}.`,
      });
    });
  }

  function sendText() {
    if (!canText) return;
    setResult(null);
    startTransition(async () => {
      const response = await sendManualText(recipient, message);
      if (!response.ok) {
        setResult({ kind: "error", text: response.error ?? "We couldn't send the text. Try again." });
        return;
      }
      setMessage("");
      setResult({
        kind: "success",
        text: `Text sent from ${formatUsPhone(smsNumber)}.`,
      });
    });
  }

  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <Card className="overflow-hidden border-cyan/20 bg-card/70 shadow-[0_24px_80px_-50px_rgba(0,229,255,0.55)]">
        <div
          role="tablist"
          aria-label="Business Line action"
          className="grid grid-cols-2 border-b border-border/70 bg-night/35 p-2"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mode === "call"}
            onClick={() => selectMode("call")}
            disabled={!voiceNumber}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:cursor-not-allowed disabled:opacity-40",
              mode === "call" ? "bg-cyan/10 text-cyan" : "text-muted-foreground active:bg-accent/50"
            )}
          >
            <PhoneCall className="size-5" aria-hidden />
            Call
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === "text"}
            onClick={() => selectMode("text")}
            disabled={!smsNumber}
            className={cn(
              "flex min-h-12 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan disabled:cursor-not-allowed disabled:opacity-40",
              mode === "text" ? "bg-cyan/10 text-cyan" : "text-muted-foreground active:bg-accent/50"
            )}
          >
            <MessageSquare className="size-5" aria-hidden />
            Text
          </button>
        </div>

        <CardContent className="space-y-5 p-5 sm:p-6">
          {!online && (
            <div className="flex items-start gap-3 rounded-xl border border-alert/40 bg-alert/5 p-4 text-sm" role="status">
              <WifiOff className="mt-0.5 size-5 shrink-0 text-alert" aria-hidden />
              <div>
                <p className="font-medium">You’re offline</p>
                <p className="mt-1 text-muted-foreground">Reconnect before starting a call or sending a text.</p>
              </div>
            </div>
          )}

          {!canManage && (
            <div className="flex items-start gap-3 rounded-xl border border-alert/40 bg-alert/5 p-4 text-sm">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alert" aria-hidden />
              <div>
                <p className="font-medium">Manager access required</p>
                <p className="mt-1 text-muted-foreground">
                  An owner or admin can place billable calls and texts. Your regular dashboard access is unchanged.
                </p>
              </div>
            </div>
          )}

          {canManage && !providerReady && (
            <div className="flex items-start gap-3 rounded-xl border border-alert/40 bg-alert/5 p-4 text-sm" role="status">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alert" aria-hidden />
              <div>
                <p className="font-medium">Outbound service isn’t ready</p>
                <p className="mt-1 text-muted-foreground">
                  Contact support before trying to place a call or send a text.
                </p>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="business-line-recipient" className="text-sm font-medium">
              Who do you want to {mode === "call" ? "call" : "text"}?
            </Label>
            <Input
              id="business-line-recipient"
              list="business-line-contacts"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={recipient}
              onChange={(event) => {
                setRecipient(event.target.value);
                setResult(null);
              }}
              placeholder="Customer name or phone number"
              className="mt-2 h-12 text-base"
              aria-describedby="business-line-recipient-help"
            />
            <datalist id="business-line-contacts">
              {contacts.map((contact) => (
                <option key={contact.id} value={formatUsPhone(contact.phone)}>
                  {contact.name}
                </option>
              ))}
            </datalist>
            <p id="business-line-recipient-help" className="mt-2 text-xs text-muted-foreground">
              Choose a recent contact or enter a US phone number.
            </p>
          </div>

          {mode === "call" ? (
            <div role="tabpanel" className="space-y-4">
              <details className="group rounded-xl border border-border/60 bg-night/30 p-4">
                <summary className="flex min-h-6 cursor-pointer list-none items-center justify-between gap-3 text-sm font-medium">
                  <span>
                    Your callback phone
                    {normalizedRing && (
                      <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                        {formatUsPhone(normalizedRing)}
                      </span>
                    )}
                  </span>
                  <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <div className="mt-4">
                  <Label htmlFor="business-line-ring" className="text-sm text-muted-foreground">
                    Ring me at
                  </Label>
                  <Input
                    id="business-line-ring"
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    value={ringPhone}
                    onChange={(event) => setRingPhone(event.target.value)}
                    placeholder="(440) 555-0199"
                    className="mt-2 h-12 text-base"
                  />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    Your phone rings first. Answer it and we’ll connect the customer using your business number.
                  </p>
                </div>
              </details>

              <Button type="button" size="lg" onClick={placeCall} disabled={!canCall || pending} className="w-full">
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <PhoneOutgoing aria-hidden />}
                {pending ? "Starting call…" : "Call customer"}
              </Button>
              {voiceNumber && (
                <p className="text-center text-xs text-muted-foreground">
                  Customer sees <span className="font-mono text-foreground">{formatUsPhone(voiceNumber)}</span>
                </p>
              )}
            </div>
          ) : (
            <div role="tabpanel" className="space-y-4">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <Label htmlFor="business-line-message" className="text-sm font-medium">
                    Message
                  </Label>
                  <span className="font-mono text-[11px] text-muted-foreground">{message.length}/1000</span>
                </div>
                <Textarea
                  id="business-line-message"
                  value={message}
                  onChange={(event) => {
                    setMessage(event.target.value);
                    setResult(null);
                  }}
                  maxLength={1000}
                  rows={5}
                  placeholder="Type your message…"
                  className="mt-2 min-h-32 text-base leading-6"
                />
              </div>
              <Button type="button" size="lg" onClick={sendText} disabled={!canText || pending} className="w-full">
                {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
                {pending ? "Sending…" : "Send text"}
              </Button>
              {smsNumber && (
                <p className="text-center text-xs text-muted-foreground">
                  Sending from <span className="font-mono text-foreground">{formatUsPhone(smsNumber)}</span>
                  {smsStatus && smsStatus !== "approved" ? ` · Registration ${smsStatus}` : ""}
                </p>
              )}
            </div>
          )}

          {result && (
            <div
              role={result.kind === "error" ? "alert" : "status"}
              aria-live="polite"
              className={cn(
                "flex items-start gap-3 rounded-xl border p-4 text-sm",
                result.kind === "success"
                  ? "border-success/40 bg-success/5"
                  : "border-alert/40 bg-alert/5"
              )}
            >
              {result.kind === "success" ? (
                <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" aria-hidden />
              ) : (
                <AlertTriangle className="mt-0.5 size-5 shrink-0 text-alert" aria-hidden />
              )}
              <div className="min-w-0 flex-1">
                <p>{result.text}</p>
                {result.kind === "error" && (
                  <button
                    type="button"
                    onClick={() => setResult(null)}
                    className="mt-2 inline-flex min-h-8 items-center gap-1.5 font-medium text-cyan focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                  >
                    <RotateCcw className="size-3.5" aria-hidden />
                    Try again
                  </button>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <aside>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">Recent</h2>
          <Link href="/dashboard/inbox" className="inline-flex min-h-11 items-center text-xs font-medium text-cyan hover:underline">
            Open inbox
          </Link>
        </div>
        {recents.length === 0 ? (
          <div className="mt-3 rounded-2xl border border-dashed border-border/70 p-5 text-sm text-muted-foreground">
            Your recent calls and texts will appear here for quick follow-up.
          </div>
        ) : (
          <ul className="mt-3 space-y-2">
            {recents.map((item) => (
              <li key={item.id} className="rounded-2xl border border-border/60 bg-card/40 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-accent/50 text-cyan">
                    {item.kind === "call" ? <PhoneCall className="size-4" aria-hidden /> : <MessageSquare className="size-4" aria-hidden />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{item.name ?? formatUsPhone(item.phone)}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">{formatUsPhone(item.phone)}</p>
                    <p className="mt-1 text-[11px] text-steel">{item.when}</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => chooseRecent(item, "call")}
                    className="min-h-10 rounded-lg border border-border/60 text-xs font-medium text-foreground active:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                  >
                    Call
                  </button>
                  <button
                    type="button"
                    onClick={() => chooseRecent(item, "text")}
                    className="min-h-10 rounded-lg border border-border/60 text-xs font-medium text-foreground active:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                  >
                    Text
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </aside>
    </div>
  );
}
