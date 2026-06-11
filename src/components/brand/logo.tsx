import { Check, Phone } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Typographic logo lockup echoing the brand mark (gradient M + phone + check).
 * The exported PNG logos in brand/ are used for social/OG images; this keeps
 * the header crisp at every size.
 */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex size-9 items-center justify-center rounded-[10px] bg-gradient-to-br from-blue to-cyan shadow-[0_0_20px_-4px_rgba(0,229,255,0.6)]">
        <Phone className="size-4.5 text-white" strokeWidth={2.4} aria-hidden />
        <span className="absolute -right-1 -bottom-1 inline-flex size-4 items-center justify-center rounded-full border border-cyan/60 bg-night">
          <Check className="size-2.5 text-cyan" strokeWidth={3.5} aria-hidden />
        </span>
      </span>
      <span className="font-display text-lg font-bold leading-none tracking-tight">
        Missed No More <span className="text-cyan">Pro</span>
      </span>
    </span>
  );
}
