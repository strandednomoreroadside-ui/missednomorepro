import { Check, X } from "lucide-react";

export type ComparisonRow = { label: string; values: (boolean | string)[] };

/**
 * Shared capability-comparison table — used on the homepage (vs. voicemail /
 * answering service / in-house hire) and the /vs and category pages. Column
 * 0 is always "us" and gets the highlighted styling.
 */
export function ComparisonTable({ cols, rows }: { cols: string[]; rows: ComparisonRow[] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card/40">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-5 py-4 text-left font-medium text-muted-foreground">Capability</th>
            {cols.map((c, i) => (
              <th
                key={c}
                className={`px-4 py-4 text-center font-display font-semibold ${
                  i === 0 ? "text-cyan" : "text-muted-foreground"
                }`}
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label} className="border-b border-border/40 last:border-0">
              <td className="px-5 py-3.5 text-left font-medium text-foreground">{row.label}</td>
              {row.values.map((v, i) => (
                <td key={i} className={`px-4 py-3.5 text-center ${i === 0 ? "bg-cyan/5" : ""}`}>
                  {typeof v === "boolean" ? (
                    v ? (
                      <Check className="mx-auto size-4 text-success" strokeWidth={3} aria-label="Yes" />
                    ) : (
                      <X className="mx-auto size-4 text-steel/50" aria-label="No" />
                    )
                  ) : (
                    <span
                      className={`font-mono text-xs ${i === 0 ? "font-semibold text-cyan" : "text-muted-foreground"}`}
                    >
                      {v}
                    </span>
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
