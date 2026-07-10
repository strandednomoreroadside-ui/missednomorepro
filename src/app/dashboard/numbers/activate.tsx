"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

import { activateNumber } from "./actions";

const ERRORS: Record<string, string> = {
  not_allowed: "Only an owner or admin can activate a number.",
  twilio_not_configured: "Phone service isn't available right now — contact support.",
  bad_number: "That number looked invalid.",
  not_yours: "That number isn't on your account.",
  not_owned: "We couldn't find that number on our phone provider — contact support.",
  activate_failed: "Activation didn't go through. Try again in a moment.",
};

/**
 * Per-number status + one-click Activate. When a number's Twilio webhooks
 * already point at us it shows "AI answering"; otherwise a button that points
 * them (so the owner never needs an engineer to turn a line on).
 */
export function ActivateNumber({ phone, connected }: { phone: string; connected: boolean }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(connected);
  const [pending, start] = useTransition();

  if (done) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-success/40 bg-success/5 px-2.5 py-1 text-xs font-medium text-success">
        <CheckCircle2 className="size-3.5" aria-hidden />
        AI answering
      </span>
    );
  }

  function onActivate() {
    setError(null);
    start(async () => {
      const r = await activateNumber(phone);
      if (!r.ok) {
        setError((r.error && ERRORS[r.error]) || "Something went wrong. Please try again.");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <Button type="button" size="sm" onClick={onActivate} disabled={pending}>
        {pending ? (
          <Loader2 className="size-4 animate-spin" aria-hidden />
        ) : (
          <Zap className="size-4" aria-hidden />
        )}
        {pending ? "Activating…" : "Activate"}
      </Button>
      {error && <span className="text-[11px] text-amber-500">{error}</span>}
    </span>
  );
}
