"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { sendManualText } from "./actions";

/** Compose an ad-hoc text to any number, sent from the tenant's own
 *  business line. For quick one-off outreach — not tied to an existing
 *  conversation thread (that's the Inbox's job). */
export function SendText() {
  const [phone, setPhone] = useState("");
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [pending, start] = useTransition();

  function onSend() {
    setError(null);
    setSent(false);
    start(async () => {
      const r = await sendManualText(phone, body);
      if (!r.ok) {
        setError(r.error ?? "Something went wrong. Please try again.");
        return;
      }
      setSent(true);
      setBody("");
    });
  }

  const ready = phone.replace(/\D/g, "").length >= 10 && body.trim().length > 0;

  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="text-muted-foreground">To</span>
        <Input
          type="tel"
          inputMode="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(440) 555-0199"
          className="mt-1 w-44 font-mono"
          aria-label="Recipient phone number"
        />
      </label>
      <label className="block text-sm">
        <span className="text-muted-foreground">Message</span>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Type your message…"
          rows={3}
          maxLength={1000}
          className="mt-1 w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:border-cyan/60"
          aria-label="Message"
        />
      </label>
      <Button type="button" onClick={onSend} disabled={pending || !ready}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Send className="size-4" aria-hidden />
        )}
        {pending ? "Sending…" : "Send text"}
      </Button>

      {error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-2.5 text-sm text-foreground">
          {error}
        </p>
      )}
      {sent && (
        <p className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/5 px-3.5 py-2.5 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>Sent from your business number.</span>
        </p>
      )}
    </div>
  );
}
