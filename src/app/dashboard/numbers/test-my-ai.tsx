"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, PhoneOutgoing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsPhone } from "@/lib/phone";

import { startDemoCall } from "./actions";

/**
 * "Test my AI" — rings the owner's phone and bridges them to their own AI
 * receptionist so they hear it before going live. A demo is a REAL call to
 * the real agent: anything it does (texts, bookings) really happens, so the
 * copy frames it as "pretend to be a customer."
 */
export function TestMyAi({ defaultPhone }: { defaultPhone?: string }) {
  const [phone, setPhone] = useState(defaultPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [calledTo, setCalledTo] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onCall() {
    setError(null);
    setCalledTo(null);
    start(async () => {
      const r = await startDemoCall(phone);
      if (!r.ok) {
        setError(r.error ?? "Something went wrong. Please try again.");
        return;
      }
      setCalledTo(r.to ?? phone);
    });
  }

  const ready = phone.replace(/\D/g, "").length >= 10;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Your phone</span>
          <Input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(440) 555-0199"
            className="mt-1 w-44 font-mono"
            aria-label="Your phone number"
            onKeyDown={(e) => {
              if (e.key === "Enter" && ready && !pending) {
                e.preventDefault();
                onCall();
              }
            }}
          />
        </label>
        <Button type="button" onClick={onCall} disabled={pending || !ready}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <PhoneOutgoing className="size-4" aria-hidden />
          )}
          {pending ? "Calling…" : "Call me now"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-2.5 text-sm text-foreground">
          {error}
        </p>
      )}

      {calledTo && (
        <p className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/5 px-3.5 py-2.5 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            Calling <span className="font-mono">{formatUsPhone(calledTo)}</span> now — pick up and
            talk to your AI like you&rsquo;re a customer. It&rsquo;s a real call, so anything it does
            (a text, a booking) really happens.
          </span>
        </p>
      )}
    </div>
  );
}
