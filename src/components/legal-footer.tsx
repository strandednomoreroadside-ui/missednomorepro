import Link from "next/link";

import { SUPPORT_EMAIL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/**
 * Minimal legal footer so the required legal pages (Privacy, Terms, SMS Terms)
 * are reachable from every page. The marketing site and the legal pages have
 * their own footers; this covers the authenticated app + auth + admin shells.
 */
export function LegalFooter({ className }: { className?: string }) {
  return (
    <footer className={cn("border-t border-border/60", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-6 py-4 text-xs text-steel">
        <span>
          © 2026 Missed No More Pro ·{" "}
          <a
            className="transition-colors hover:text-foreground"
            href={`mailto:${SUPPORT_EMAIL}`}
          >
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
  );
}
