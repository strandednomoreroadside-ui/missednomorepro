import Link from "next/link";
import { WifiOff } from "lucide-react";

import { Logo } from "@/components/brand/logo";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-md rounded-3xl border border-border/70 bg-card/70 p-8 text-center shadow-2xl">
        <div className="flex justify-center">
          <Logo />
        </div>
        <span className="mx-auto mt-8 flex size-14 items-center justify-center rounded-2xl border border-alert/30 bg-alert/10 text-alert">
          <WifiOff className="size-7" aria-hidden />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold">You’re offline</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Calls and texts need a secure connection. Reconnect, then try again—your information is still safe.
        </p>
        <Link
          href="/dashboard/phone"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
        >
          Try again
        </Link>
      </div>
    </main>
  );
}

