"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Monthly/annual switch for the billing plan picker, mirroring the landing
 * toggle. URL-state driven (`?interval=year`) so the billing page stays a
 * server component — the price + checkout lookup_key are rendered server-side
 * from the chosen interval.
 */
export function IntervalToggle({ interval }: { interval: "month" | "year" }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const annual = interval === "year";

  function setInterval(next: "month" | "year") {
    const p = new URLSearchParams(params.toString());
    if (next === "year") p.set("interval", "year");
    else p.delete("interval");
    const qs = p.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }

  return (
    <div className="flex items-center gap-3">
      <span className={cn("text-sm", !annual ? "text-foreground" : "text-muted-foreground")}>
        Monthly
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={annual}
        aria-label="Toggle annual billing"
        onClick={() => setInterval(annual ? "month" : "year")}
        className="relative inline-flex h-7 w-12 cursor-pointer items-center rounded-full border border-border bg-night/60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <span
          className={cn(
            "inline-block size-5 transform rounded-full bg-cyan shadow transition-transform duration-200",
            annual ? "translate-x-6" : "translate-x-1"
          )}
        />
      </button>
      <span className={cn("text-sm", annual ? "text-foreground" : "text-muted-foreground")}>
        Annual
        <span className="ml-1.5 rounded-full bg-success/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-success">
          −20%
        </span>
      </span>
    </div>
  );
}
