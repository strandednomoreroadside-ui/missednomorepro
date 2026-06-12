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
        <p className="mt-6 text-center text-xs text-steel">
          © 2026 Missed No More Pro
        </p>
      </div>
    </div>
  );
}
