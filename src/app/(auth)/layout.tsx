import Link from "next/link";

import { Logo } from "@/components/brand/logo";

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="glow-field relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Missed No More Pro — home">
            <Logo />
          </Link>
        </div>
        <div className="border-glow rounded-2xl p-8">{children}</div>
        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-steel">
          <span>© 2026 Missed No More Pro</span>
          <span aria-hidden>·</span>
          <Link className="transition-colors hover:text-foreground" href="/privacy">
            Privacy
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/terms">
            Terms
          </Link>
          <Link className="transition-colors hover:text-foreground" href="/sms-terms">
            SMS Terms
          </Link>
        </p>
      </div>
    </div>
  );
}
