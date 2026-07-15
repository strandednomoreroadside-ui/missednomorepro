"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, PhoneOutgoing } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { startOutboundCall } from "./actions";

/** Click-to-call: we ring YOU first, then bridge you to the target number —
 *  the customer sees the business's own number, not your personal cell. */
export function CallNumber({ defaultRingPhone }: { defaultRingPhone?: string }) {
  const [target, setTarget] = useState("");
  const [ring, setRing] = useState(defaultRingPhone ?? "");
  const [error, setError] = useState<string | null>(null);
  const [calling, setCalling] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onCall() {
    setError(null);
    setCalling(null);
    start(async () => {
      const r = await startOutboundCall(target, ring);
      if (!r.ok) {
        setError(r.error ?? "Something went wrong. Please try again.");
        return;
      }
      setCalling(target);
    });
  }

  const ready =
    target.replace(/\D/g, "").length >= 10 && ring.replace(/\D/g, "").length >= 10;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Call this number</span>
          <Input
            type="tel"
            inputMode="tel"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="(440) 555-0199"
            className="mt-1 w-44 font-mono"
            aria-label="Number to call"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted-foreground">Ring me at</span>
          <Input
            type="tel"
            inputMode="tel"
            value={ring}
            onChange={(e) => setRing(e.target.value)}
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
          {pending ? "Calling…" : "Call"}
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-2.5 text-sm text-foreground">
          {error}
        </p>
      )}
      {calling && (
        <p className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/5 px-3.5 py-2.5 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            Ringing your phone now — answer it and we&rsquo;ll connect you to{" "}
            <span className="font-mono">{calling}</span> from your business number.
          </span>
        </p>
      )}
    </div>
  );
}
