import Link from "next/link";

import { Logo } from "@/components/brand/logo";

import { ButtonLink } from "./primitives";

/**
 * Lightweight header/footer for standalone marketing pages that live off the
 * homepage (e.g. /pricing, /about). The homepage's own SiteHeader uses
 * in-page anchors (#pricing, #faq) that only resolve on "/", so these pages
 * get a simpler header instead of a broken nav.
 */
export function MarketingShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-50 border-b border-border/60 bg-night/75 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" aria-label="Missed No More Pro — home">
            <Logo />
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="hidden text-sm text-muted-foreground transition-colors hover:text-foreground sm:inline"
            >
              ← Back to home
            </Link>
            <ButtonLink href="/login" variant="outline" className="hidden sm:inline-flex">
              Sign in
            </ButtonLink>
            <ButtonLink href="/signup">Start free trial</ButtonLink>
          </div>
        </div>
      </header>
      <main>{children}</main>
      <footer className="border-t border-border/60 bg-night">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-10 text-xs text-steel">
          <span className="flex items-center gap-2">
            <Logo className="scale-90" />
          </span>
          <span className="flex flex-wrap gap-x-6 gap-y-2">
            <Link className="transition-colors hover:text-foreground" href="/pricing">
              Pricing
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/about">
              About
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/vs/hexnut">
              vs. Hexnut
            </Link>
            <Link className="transition-colors hover:text-foreground" href="/vs/answering-service">
              vs. Answering Service
            </Link>
            <Link
              className="transition-colors hover:text-foreground"
              href="/ai-receptionist-for-towing"
            >
              For Towing
            </Link>
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
        <p className="border-t border-border/60 px-6 py-6 text-center text-xs text-steel">
          © 2026 Missed No More Pro. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
