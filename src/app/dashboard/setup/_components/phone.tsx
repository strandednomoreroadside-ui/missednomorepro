import Link from "next/link";
import { Check, PhoneCall, PhoneForwarded, Sparkles } from "lucide-react";

import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatUsPhone } from "@/lib/phone";
import { isTwilioConfigured } from "@/lib/twilio/numbers";
import type { SetupData } from "@/lib/setup/queries";
import { provisionEligibility } from "@/app/dashboard/numbers/actions";
import { ProvisionNumber } from "@/app/dashboard/numbers/provision";

import { finishPhone } from "../actions";

/** Condensed cheat-sheet — the full carrier-code table + port option lives
 *  at /dashboard/numbers/guide so it stays in one place, not duplicated. */
const CARRIER_CODES: { mode: string; on: string }[] = [
  { mode: "Forward ALL calls", on: "*72 + number, press call" },
  { mode: "Forward when no answer", on: "*71 (or **61* + number + #)" },
];

/**
 * Getting a working phone number is part of the wizard itself now, not a
 * separate page a self-serve customer might never find (onboarding/page.tsx
 * already promised this: "you'll add ... your phone setup in the wizard").
 * Reuses dashboard/numbers' own ProvisionNumber picker + provisionEligibility
 * check directly rather than rebuilding number search/claim — same widget,
 * same server actions, just embedded here too.
 *
 * Claiming a number requires a card on file (guards the platform's Twilio
 * bill), which a customer may not have yet if they reach this step before
 * starting a plan. That's handled as a clear "start your trial first" message
 * rather than a dead end — see the ineligible branch below.
 */
export async function PhoneStep({ data }: { data: SetupData }) {
  const tenantId = data.business.tenant_id;
  const twilioReady = isTwilioConfigured();
  const eligibility = twilioReady ? await provisionEligibility(tenantId) : { ok: false as const };
  const staffPhone = data.staff.find((s) => s.notify_on_lead)?.phone ?? "";
  const defaultAreaCode = /^\+1(\d{3})/.exec(staffPhone)?.[1] ?? "";
  const numbers = data.phoneNumbers;

  return (
    <div className="space-y-6">
      <Card className="border-cyan/25 bg-card/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <PhoneCall className="size-4 text-cyan" aria-hidden />
            Your AI needs a phone number to answer
          </CardTitle>
          <CardDescription>
            One number is included on every plan, no extra charge. Pick whichever of these
            fits how customers reach you today — both take a couple of minutes.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-border/50 p-4">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="size-4 text-cyan" aria-hidden />
              Getting a new number
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-steel">
              Claim any number below and hand it out as your business line — your AI
              answers it right away. Simplest option for a new business or a dedicated
              after-hours line.
            </p>
          </div>
          <div className="rounded-lg border border-border/50 p-4">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <PhoneForwarded className="size-4 text-cyan" aria-hidden />
              Keeping the number you already give out
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-steel">
              Claim any number below too — it doesn&rsquo;t matter which one, since
              customers never see or dial it directly. Then forward your current number to
              it (instructions appear below once you claim one).
            </p>
          </div>
        </CardContent>
      </Card>

      {!twilioReady ? (
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3.5 py-3 text-sm text-foreground">
          Number setup isn&rsquo;t available right now — please contact support and
          we&rsquo;ll get you connected.
        </p>
      ) : numbers.length > 0 ? (
        <Card className="border-success/30 bg-success/5">
          <CardContent className="flex items-start gap-2.5 pt-6">
            <Check className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={3} aria-hidden />
            <div className="text-sm text-foreground">
              <p>
                <span className="font-mono text-cyan">{formatUsPhone(numbers[0].phone_number)}</span>{" "}
                is set up — your AI is already answering it.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Need to forward your own number to it, add another number, or want the full
                carrier dial-code list?{" "}
                <Link href="/dashboard/numbers/guide" className="text-cyan hover:underline">
                  Full instructions here
                </Link>
                .
              </p>
            </div>
          </CardContent>
        </Card>
      ) : eligibility.ok ? (
        <Card className="bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Claim your number</CardTitle>
          </CardHeader>
          <CardContent>
            <ProvisionNumber defaultAreaCode={defaultAreaCode} />
          </CardContent>
        </Card>
      ) : (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardContent className="pt-6">
            <p className="text-sm text-foreground">
              Start your free trial first — that puts a card on file so we can assign you a
              real phone number (it&rsquo;s covered by every plan, no extra charge).
            </p>
            <Link
              href="/dashboard/billing"
              className={buttonVariants({ size: "sm", className: "mt-3" })}
            >
              Start free trial
            </Link>
            <p className="mt-3 text-xs text-steel">
              You can keep going with the rest of setup in the meantime — just come back to
              this step once your trial is started to pick your number.
            </p>
          </CardContent>
        </Card>
      )}

      {numbers.length === 0 && eligibility.ok && (
        <Card className="bg-card/60">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-sm">
              <PhoneForwarded className="size-4 text-cyan" aria-hidden />
              Forwarding your current number (if that&rsquo;s your plan)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground">
            <p>
              Once you&rsquo;ve claimed a number above, open your phone carrier&rsquo;s app
              (Verizon / AT&amp;T / T-Mobile) → <strong>Call Forwarding</strong> and enter
              that number — no codes needed on most phones. Or dial one of these from your
              current phone:
            </p>
            <ul className="list-disc space-y-1 pl-5">
              {CARRIER_CODES.map((c) => (
                <li key={c.mode}>
                  <span className="text-foreground">{c.mode}:</span>{" "}
                  <span className="font-mono">{c.on}</span>
                </li>
              ))}
            </ul>
            <p>
              Then call your published number from another phone to test it — the AI should
              pick up.{" "}
              <Link href="/dashboard/numbers/guide" className="text-cyan hover:underline">
                Full guide, all carrier codes, and how to port your number to us instead
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      )}

      <form action={finishPhone}>
        <Button type="submit">Continue</Button>
      </form>
    </div>
  );
}
