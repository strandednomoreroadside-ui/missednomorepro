import { Lock } from "lucide-react";

/**
 * Read-only notice shown to plain members on business-wide config surfaces
 * (the interactive form is rendered only for owner/admin, matching the
 * server-side gate). Keeps members informed without letting them change
 * money/compliance/campaign settings.
 */
export function ManagerOnlyNote({ children }: { children?: React.ReactNode }) {
  return (
    <p className="flex items-center gap-2 rounded-lg border border-border/40 px-3.5 py-3 text-sm text-muted-foreground">
      <Lock className="size-3.5 shrink-0 text-steel" aria-hidden />
      {children ?? "Only an owner or admin can change this."}
    </p>
  );
}
