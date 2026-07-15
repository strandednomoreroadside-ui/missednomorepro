"use client";

import { useTransition } from "react";

import { toggleNotifyOnLead } from "./actions";

/** Auto-submitting checkbox for the "gets lead alerts" column. */
export function NotifyToggle({ id, defaultChecked }: { id: string; defaultChecked: boolean }) {
  const [pending, start] = useTransition();

  function onChange(next: boolean) {
    start(async () => {
      const fd = new FormData();
      fd.set("id", id);
      fd.set("notify_on_lead", String(next));
      await toggleNotifyOnLead(fd);
    });
  }

  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <input
        type="checkbox"
        defaultChecked={defaultChecked}
        disabled={pending}
        onChange={(e) => onChange(e.target.checked)}
        className="accent-cyan"
        aria-label="Gets new-lead alerts"
      />
      Alerts
    </label>
  );
}
