"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, PhoneCall, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatUsPhone } from "@/lib/phone";
import type { AvailableNumber } from "@/lib/twilio/numbers";

import { claimNumber, searchNumbers } from "./actions";

const ERRORS: Record<string, string> = {
  no_subscription: "Start a plan or free trial first — that puts a card on file so we can claim a number for you.",
  limit_reached: "Your plan includes one number. Upgrade to Elite for additional numbers or locations.",
  twilio_not_configured: "Number provisioning isn't available right now. Please contact support.",
  bad_area_code: "Enter a 3-digit US area code (e.g. 440).",
  none_found: "No numbers available in that area code — try a nearby one.",
  not_allowed: "Only an owner or admin can claim a number.",
  bad_number: "That number looked invalid — pick another.",
  purchase_failed: "We couldn't claim that number (it may have just been taken). Try another.",
  record_failed: "The number was reserved but we hit a snag saving it — please contact support.",
};

function msg(code?: string): string {
  return (code && ERRORS[code]) || "Something went wrong. Please try again.";
}

export function ProvisionNumber({ defaultAreaCode = "" }: { defaultAreaCode?: string }) {
  const router = useRouter();
  const [areaCode, setAreaCode] = useState(defaultAreaCode);
  const [results, setResults] = useState<AvailableNumber[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);
  // Which number the owner tapped and is being asked to confirm. Claiming
  // provisions a real, tenant-specific phone line, so we ask for an explicit
  // second tap rather than buying on the first click (guards mis-clicks).
  const [confirming, setConfirming] = useState<string | null>(null);
  const [claimed, setClaimed] = useState<string | null>(null);
  const [searching, startSearch] = useTransition();

  function onSearch() {
    setError(null);
    setClaimed(null);
    setConfirming(null);
    startSearch(async () => {
      const r = await searchNumbers(areaCode);
      if (!r.ok) {
        setResults(null);
        setError(msg(r.error));
        return;
      }
      if (r.numbers.length === 0) {
        setResults([]);
        setError(msg("none_found"));
        return;
      }
      setResults(r.numbers);
    });
  }

  function onClaim(phone: string) {
    setError(null);
    setClaiming(phone);
    setConfirming(null);
    startSearch(async () => {
      const r = await claimNumber(phone);
      setClaiming(null);
      if (!r.ok) {
        setError(msg(r.error));
        return;
      }
      // The new number now renders in the list above; clear the picker and
      // confirm success so the owner knows their AI is answering it.
      setResults(null);
      setAreaCode("");
      setClaimed(r.phone ?? phone);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm">
          <span className="text-muted-foreground">Area code</span>
          <Input
            inputMode="numeric"
            maxLength={3}
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
            placeholder="440"
            className="mt-1 w-28 font-mono"
            aria-label="Area code"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                onSearch();
              }
            }}
          />
        </label>
        <Button type="button" onClick={onSearch} disabled={searching || areaCode.length !== 3}>
          {searching && !claiming ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Search className="size-4" aria-hidden />
          )}
          Search
        </Button>
      </div>

      {error && (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-2.5 text-sm text-foreground">
          {error}
        </p>
      )}

      {claimed && (
        <p className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/5 px-3.5 py-2.5 text-sm text-foreground">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
          <span>
            <span className="font-mono">{formatUsPhone(claimed)}</span> is yours — your AI answers it
            and texts from it right away. It&rsquo;s listed above.
          </span>
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="space-y-2">
          {results.map((n) => {
            const isConfirming = confirming === n.phoneNumber;
            return (
              <li
                key={n.phoneNumber}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 px-3.5 py-3"
              >
                <PhoneCall className="size-4 text-cyan" aria-hidden />
                <span className="font-mono text-base text-foreground">
                  {formatUsPhone(n.phoneNumber)}
                </span>
                {(n.locality || n.region) && (
                  <span className="text-xs text-muted-foreground">
                    {[n.locality, n.region].filter(Boolean).join(", ")}
                  </span>
                )}
                <span className="ml-auto flex items-center gap-2">
                  {claiming === n.phoneNumber ? (
                    <Button type="button" size="sm" disabled>
                      <Loader2 className="size-4 animate-spin" aria-hidden />
                      Claiming…
                    </Button>
                  ) : isConfirming ? (
                    <>
                      <span className="text-xs text-muted-foreground">Use this number?</span>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => setConfirming(null)}
                        disabled={claiming !== null}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => onClaim(n.phoneNumber)}
                        disabled={claiming !== null}
                      >
                        Confirm
                      </Button>
                    </>
                  ) : (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setConfirming(n.phoneNumber)}
                      disabled={claiming !== null}
                    >
                      Claim this number
                    </Button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
