import Image from "next/image";

import { cn } from "@/lib/utils";

/** Official brand lockup shared by marketing, auth, onboarding, admin, and legal surfaces. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        className="brand-logo-image h-auto w-[225px] max-w-full"
        src="/images/mnm-official-logo-2026.png"
        alt="Missed No More Pro — Every call answered. Every lead captured."
        width={695}
        height={160}
        priority
      />
    </span>
  );
}
