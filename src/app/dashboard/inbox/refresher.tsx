"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** Light polling for the inbox (no websockets). Refreshes the route every few
 *  seconds so new customer/AI messages and staff replies appear. Pauses when
 *  the tab is hidden to save resources. */
export function InboxRefresher({ intervalMs = 6000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = setInterval(tick, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);
  return null;
}
