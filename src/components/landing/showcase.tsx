import {
  ArrowUpRight,
  Bot,
  CalendarCheck,
  Check,
  DollarSign,
  Inbox,
  Phone,
} from "lucide-react";

import { Reveal } from "./reveal";

/**
 * Product showcase — stylized CSS/SVG mock UIs of real surfaces we shipped.
 * No screenshots: each tile is built from brand tokens so it stays crisp,
 * themeable, and fast. Purely decorative (aria-hidden on the chrome).
 */
export function ProductShowcase() {
  return (
    <div className="mt-12 grid auto-rows-[minmax(0,1fr)] gap-5 lg:grid-cols-6">
      {/* Analytics — wide */}
      <Reveal className="lg:col-span-4">
        <Tile
          title="Revenue dashboard"
          icon={DollarSign}
          sub="Every call scored. Every dollar tracked."
          badge="Sample data"
          badgeTone="muted"
        >
          <AnalyticsMock />
        </Tile>
      </Reveal>

      {/* Smart quote — tall-ish */}
      <Reveal className="lg:col-span-2" delay={80}>
        <Tile title="Deterministic quotes" icon={DollarSign} sub="Real prices, computed — never guessed.">
          <QuoteMock />
        </Tile>
      </Reveal>

      {/* Unified inbox — teases Phase 10 */}
      <Reveal className="lg:col-span-3" delay={40}>
        <Tile title="Unified inbox" icon={Inbox} sub="Calls, texts & web chat — one AI brain." badge="New">
          <InboxMock />
        </Tile>
      </Reveal>

      {/* Pipeline kanban */}
      <Reveal className="lg:col-span-3" delay={120}>
        <Tile title="Lead pipeline" icon={ArrowUpRight} sub="Auto-advanced as the AI quotes & books.">
          <PipelineMock />
        </Tile>
      </Reveal>
    </div>
  );
}

function Tile({
  title,
  sub,
  icon: Icon,
  badge,
  badgeTone = "cyan",
  children,
}: {
  title: string;
  sub: string;
  icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  badge?: string;
  badgeTone?: "cyan" | "muted";
  children: React.ReactNode;
}) {
  return (
    <div className="group h-full overflow-hidden rounded-2xl border border-border bg-card/50 transition-colors hover:border-cyan/40">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-9 items-center justify-center rounded-lg border border-cyan/25 bg-cyan/10">
            <Icon className="size-4.5 text-cyan" aria-hidden />
          </span>
          <div>
            <h3 className="font-display text-base font-semibold leading-tight">{title}</h3>
            <p className="text-xs text-muted-foreground">{sub}</p>
          </div>
        </div>
        {badge && (
          <span
            className={
              badgeTone === "muted"
                ? "shrink-0 rounded-full border border-border bg-secondary/50 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-steel"
                : "shrink-0 rounded-full border border-cyan/40 bg-cyan/10 px-2 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-widest text-cyan"
            }
          >
            {badge}
          </span>
        )}
      </div>
      <div className="p-5" aria-hidden>
        {children}
      </div>
    </div>
  );
}

/* ── Mock UIs (decorative) ─────────────────────────────────────── */

function AnalyticsMock() {
  const kpis = [
    ["Calls", "128"],
    ["Answer rate", "100%"],
    ["Booked", "41"],
    ["Recovered", "$18.4k"],
  ];
  const bars = [38, 52, 44, 61, 70, 58, 82, 74, 90, 68, 96, 88];
  return (
    <div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {kpis.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-border/70 bg-night/40 px-3 py-2.5">
            <div className="font-mono text-[10px] uppercase tracking-wider text-steel">{label}</div>
            <div className="mt-1 font-mono text-lg font-semibold text-foreground">{value}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t bg-gradient-to-t from-blue/50 to-cyan/80"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
    </div>
  );
}

function QuoteMock() {
  const lines = [
    ["Dispatch (Zone 2)", "$65"],
    ["Battery jump", "$50"],
    ["Late-night window", "$20"],
  ];
  return (
    <div className="space-y-2.5">
      {lines.map(([label, amt]) => (
        <div key={label} className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-mono text-foreground">{amt}</span>
        </div>
      ))}
      <div className="flex items-center justify-between border-t border-border/70 pt-3">
        <span className="text-sm font-medium">Total</span>
        <span className="font-mono text-xl font-bold text-success">$135</span>
      </div>
      <p className="pt-1 text-[11px] leading-relaxed text-steel">
        Computed server-side from owner-approved rules + driving distance.
      </p>
    </div>
  );
}

function InboxMock() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[11px]">
        <span className="inline-flex items-center gap-1 rounded-full border border-cyan/30 bg-cyan/10 px-2 py-0.5 font-mono uppercase tracking-wider text-cyan">
          <Phone className="size-2.5" aria-hidden /> SMS
        </span>
        <span className="text-steel">Returning customer · 2m ago</span>
      </div>
      <div className="max-w-[80%] rounded-2xl rounded-bl-sm bg-secondary/70 px-3 py-2 text-sm">
        Do you guys do lockouts? Locked my keys in the car downtown.
      </div>
      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-sm border border-cyan/25 bg-cyan/10 px-3 py-2 text-sm">
        <span className="mb-0.5 block font-mono text-[9px] uppercase tracking-widest text-cyan">
          <Bot className="mr-1 inline size-2.5" aria-hidden />
          AI
        </span>
        Yes — you&rsquo;re 4 miles in. A lockout downtown is $50. Want me to send someone now?
      </div>
    </div>
  );
}

function PipelineMock() {
  const cols = [
    { name: "New", count: 6, tone: "text-steel" },
    { name: "Quoted", count: 4, tone: "text-cyan" },
    { name: "Scheduled", count: 3, tone: "text-blue" },
    { name: "Done", count: 9, tone: "text-success" },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {cols.map((c) => (
        <div key={c.name} className="rounded-lg border border-border/70 bg-night/40 p-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[9px] uppercase tracking-wider text-steel">{c.name}</span>
            <span className={`font-mono text-[10px] font-semibold ${c.tone}`}>{c.count}</span>
          </div>
          <div className="mt-2 space-y-1.5">
            <div className="h-5 rounded bg-secondary/60" />
            <div className="h-5 rounded bg-secondary/40" />
          </div>
        </div>
      ))}
    </div>
  );
}

/* Re-export so the page can show small "what you get" check rows consistently. */
export function CheckRow({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-muted-foreground">
      <Check className="mt-0.5 size-4 shrink-0 text-cyan" strokeWidth={3} aria-hidden />
      <span>{children}</span>
    </li>
  );
}
