import { cn } from "@/lib/utils";

/**
 * Lightweight section wrapper. Content renders immediately so below-fold
 * marketing sections do not each require client state and observers.
 */
export function Reveal({
  children,
  className,
  delay: _delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return <div className={cn(className)}>{children}</div>;
}
