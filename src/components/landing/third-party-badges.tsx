/**
 * Dated third-party validation strip (D3.5 — "as seen on" / ratings /
 * press). NOT mounted anywhere yet: as of this writing there is no real
 * Product Hunt launch, G2/Trustpilot rating, or press mention to show, and
 * this project's own rule is "no fabricated logos" — an empty or fake strip
 * would look worse than no strip at all.
 *
 * When you have ONE real, dated signal (a Product Hunt badge with its
 * launch date, a G2/Trustpilot rating with its date, a press mention with
 * its publication date), fill in BADGES below and mount <ThirdPartyBadges />
 * on the homepage (e.g. right after <Integrations /> in src/app/page.tsx,
 * per the audit's suggested placement) and/or on /pricing.
 */

export type ThirdPartyBadge = {
  label: string; // e.g. "Featured on Product Hunt"
  date: string; // e.g. "Aug 2026" — always show the date, never a bare logo
  href: string; // link to the real listing/review/article
};

// Empty on purpose — see the header comment. Add real entries here.
const BADGES: ThirdPartyBadge[] = [];

export function ThirdPartyBadges() {
  if (BADGES.length === 0) return null;

  return (
    <section className="border-y border-border/60 bg-navy/30 py-8">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-6 px-6">
        {BADGES.map((b) => (
          <a
            key={b.href}
            href={b.href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/40 px-4 py-2 text-sm text-muted-foreground transition-colors hover:border-cyan/40 hover:text-foreground"
          >
            <span className="font-medium text-foreground">{b.label}</span>
            <span className="text-steel">· {b.date}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
