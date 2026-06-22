import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { SUPPORT_EMAIL } from "@/lib/constants";

export function LegalShell({
  title,
  effectiveDate,
  children,
}: {
  title: string;
  effectiveDate: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border/60 bg-night/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link href="/" aria-label="Missed No More Pro — home">
            <Logo />
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to home
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <h1 className="font-display text-4xl font-bold tracking-tight">{title}</h1>
        <p className="mt-3 font-mono text-xs uppercase tracking-widest text-steel">
          Effective date: {effectiveDate}
        </p>
        <div className="mt-10 space-y-8 text-[15px] leading-relaxed text-muted-foreground [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-foreground">
          {children}
        </div>
      </main>
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-6 py-8 text-xs text-steel">
          <span>
            © 2026 Missed No More Pro. All rights reserved. ·{" "}
            <a className="transition-colors hover:text-foreground" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </span>
          <span className="flex gap-4">
            <Link className="transition-colors hover:text-foreground" href="/privacy">
              Privacy
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/terms">
              Terms
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/sms-terms">
              SMS Terms
            </Link>
          </span>
        </div>
      </footer>
    </div>
  );
}
