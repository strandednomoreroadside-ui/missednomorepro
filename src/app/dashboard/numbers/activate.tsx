"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Trash2, Zap } from "lucide-react";

import { Button } from "@/components/ui/button";

import { activateNumber, releaseNumber } from "./actions";

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

const RELEASE_ERRORS: Record<string, string> = {
  not_allowed: "Only an owner or admin can release a number.",
  twilio_not_configured: "Phone service isn't available right now — contact support.",
  bad_number: "That number looked invalid.",
  not_yours: "That number isn't on your account.",
  release_failed: "We couldn't release it just now. Try again in a moment.",
  record_failed: "It was released but we hit a snag updating your account — contact support.",
};

/**
 * Guarded "Release" (give a number back) — e.g. to swap area codes. Releasing
 * is irreversible (the number is gone for good), so it takes an explicit
 * second tap to confirm. `isOnly` warns when it's the tenant's last number.
 */
export function ReleaseNumber({ phone, isOnly }: { phone: string; isOnly: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function onRelease() {
    setError(null);
    start(async () => {
      const r = await releaseNumber(phone);
      if (!r.ok) {
        setError((r.error && RELEASE_ERRORS[r.error]) || "Something went wrong. Please try again.");
        return;
      }
      setConfirming(false);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1 text-xs text-steel hover:text-amber-500"
      >
        <Trash2 className="size-3.5" aria-hidden />
        Release
      </button>
    );
  }

  return (
    <span className="inline-flex flex-col items-end gap-1">
      <span className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {isOnly ? "Release your only number?" : "Give this number back?"}
        </span>
        <Button type="button" size="sm" variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
          Keep
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-red-500/50 text-red-400 hover:border-red-500 hover:text-red-300"
          onClick={onRelease}
          disabled={pending}
        >
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : "Release"}
        </Button>
      </span>
      {error && <span className="text-[11px] text-amber-500">{error}</span>}
    </span>
  );
}
