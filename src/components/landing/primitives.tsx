import { cn } from "@/lib/utils";

/** TODO(M1): point this at the real support inbox once the domain is purchased. */
export const EARLY_ACCESS_MAILTO =
  "mailto:hello@missednomorepro.com?subject=Early%20access%20request%20%E2%80%94%20Missed%20No%20More%20Pro";

/**
 * The header/section CTA is an anchor styled as a button. Kept local to the
 * landing surface so the shadcn Button stays standard for the app.
 */
export function ButtonLink({
  href,
  children,
  variant = "primary",
  large = false,
  className,
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "outline";
  large?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
  const size = large ? "h-12 rounded-xl px-7 text-base" : "h-10 px-4 text-sm";
  const look =
    variant === "primary"
      ? "bg-primary text-primary-foreground shadow-[0_0_24px_-6px_var(--color-cyan)] hover:shadow-[0_0_36px_-4px_var(--color-cyan)] hover:brightness-110"
      : "border border-border bg-transparent text-foreground hover:border-cyan/50 hover:text-cyan";
  return (
    <a href={href} className={cn(base, size, look, className)}>
      {children}
    </a>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  sub,
  align = "center",
}: {
  eyebrow: string;
  title: React.ReactNode;
  sub?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("max-w-2xl", align === "center" ? "mx-auto text-center" : "text-left")}>
      <p className="font-mono text-xs font-semibold uppercase tracking-[0.25em] text-cyan">
        {eyebrow}
      </p>
      <h2 className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">{title}</h2>
      {sub && <p className="mt-4 text-base leading-relaxed text-muted-foreground">{sub}</p>}
    </div>
  );
}
