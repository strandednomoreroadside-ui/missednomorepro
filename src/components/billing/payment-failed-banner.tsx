import Link from "next/link";
import { CreditCard, TriangleAlert } from "lucide-react";

import { GRACE_DAYS } from "@/lib/billing/dunning";
import { getSubscription } from "@/lib/billing/subscription";

/**
 * App-wide dunning banner. Shows when the tenant's last renewal charge failed
 * (payment_failed_at stamped) or Stripe has the subscription in past_due, so a
 * declined card is impossible to miss. Server component — one cheap read per
 * dashboard load; renders nothing when billing is healthy.
 */
export async function PaymentFailedBanner({ tenantId }: { tenantId: string }) {
  let sub;
  try {
    sub = await getSubscription(tenantId);
  } catch {
    return null; // never let a billing read break the dashboard chrome
  }
  if (!sub) return null;

  const failing = Boolean(sub.payment_failed_at) || sub.status === "past_due";
  if (!failing) return null;

  let byWhen = "";
  if (sub.payment_failed_at) {
    const grace = new Date(new Date(sub.payment_failed_at).getTime() + GRACE_DAYS * 86_400_000);
    byWhen = ` by ${grace.toLocaleDateString("en-US", { month: "long", day: "numeric" })}`;
  }

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 px-5 py-3">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 text-sm">
        <TriangleAlert className="size-4 shrink-0 text-amber-500" aria-hidden />
        <span className="text-foreground">
          <strong>Your last payment didn&rsquo;t go through.</strong> Update your card
          {byWhen} to keep your AI receptionist running.
        </span>
        <Link
          href="/dashboard/billing"
          className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-blue px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-blue/90"
        >
          <CreditCard className="size-3.5" aria-hidden />
          Update payment
        </Link>
      </div>
    </div>
  );
}
