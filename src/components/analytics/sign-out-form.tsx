"use client";

import { analytics } from "@heycatch/sdk";

/**
 * Wraps the existing sign-out <form action={signOut}> so the browser resets
 * HeyCatch identity right as sign-out fires — the next visitor on this
 * device starts anonymous. The server action itself is untouched; this only
 * adds a client-side onSubmit alongside the existing form submission.
 */
export function SignOutForm({
  action,
  className,
  children,
}: {
  action: () => void | Promise<void>;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <form action={action} className={className} onSubmit={() => analytics.resetIdentity()}>
      {children}
    </form>
  );
}
