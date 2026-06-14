/**
 * Call disposition labels + badge styling, shared by the call log and the
 * call detail page. Dispositions are set by the AI's tools during a call
 * (spam/escalated/lead) or derived at finalize (out_of_area/abandoned/
 * no_action). "booked" arrives with scheduling at M9.
 */
export const DISPOSITION_META: Record<string, { label: string; className: string }> = {
  lead: { label: "Lead", className: "border-success/40 bg-success/10 text-success" },
  booked: { label: "Booked", className: "border-cyan/40 bg-cyan/10 text-cyan" },
  escalated: {
    label: "Escalated",
    className: "border-destructive/40 bg-destructive/10 text-[#ffb3bb]",
  },
  out_of_area: {
    label: "Out of area",
    className: "border-alert/40 bg-alert/10 text-alert",
  },
  spam: { label: "Spam", className: "border-border/70 bg-muted/30 text-steel" },
  abandoned: { label: "Abandoned", className: "border-border/70 text-steel" },
  no_action: { label: "No action", className: "border-border/70 text-steel" },
};

export function dispositionLabel(disposition: string | null): string {
  if (!disposition) return "—";
  return DISPOSITION_META[disposition]?.label ?? disposition;
}
