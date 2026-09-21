import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";

// Account entry pages are conversion flows, not search landing pages. Keeping
// them out of the sitemap and explicitly noindexing them prevents thin auth
// URLs from competing with the public product pages.
export const metadata: Metadata = { robots: { index: false, follow: true } };

export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="auth-shell min-h-dvh">
      <section className="auth-story" aria-label="Missed No More Pro">
        <Link href="/" aria-label="Missed No More Pro — home">
          <Image className="auth-logo" src="/images/mnm-official-logo-2026.png" alt="Missed No More Pro" width={695} height={160} priority />
        </Link>
        <div className="auth-story-copy">
          <p className="auth-kicker">YOUR REVENUE COMMAND CENTER</p>
          <h2>THE NEXT JOB<br />DOESN&rsquo;T HAVE<br />TO <span>WAIT.</span></h2>
          <p>Every call answered. Exact quotes from your rules. Jobs booked while you keep working.</p>
        </div>
        <div className="auth-status"><i /> SYSTEM READY <span>24 / 7</span></div>
      </section>
      <section className="auth-entry">
        <div className="auth-entry-inner">
          <Link className="auth-mobile-brand" href="/" aria-label="Missed No More Pro — home">
            <Image src="/images/mnm-official-logo-2026.png" alt="Missed No More Pro" width={695} height={160} priority />
          </Link>
          <div className="auth-card">{children}</div>
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
      </section>
    </div>
  );
}
