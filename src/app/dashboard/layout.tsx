import Link from "next/link";
import {
  CalendarCheck,
  CreditCard,
  LayoutDashboard,
  PhoneCall,
  Settings,
  ShieldCheck,
  Users,
  Wand2,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { isPlatformAdmin, requireActiveOrg } from "@/lib/auth";
import { signOut } from "@/app/(auth)/actions";

import { switchOrganization } from "./actions";

const UPCOMING = [
  { label: "Setup wizard", icon: Wand2, milestone: "M4" },
  { label: "Contacts", icon: Users, milestone: "M5" },
  { label: "Calls", icon: PhoneCall, milestone: "M7" },
  { label: "Jobs", icon: CalendarCheck, milestone: "M9" },
  { label: "Settings", icon: Settings, milestone: "M4" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { user, memberships, active } = await requireActiveOrg();
  const admin = await isPlatformAdmin();

  return (
    <div className="flex min-h-dvh">
      {/* ── Sidebar ── */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border/60 bg-navy/20 md:flex">
        <div className="flex h-16 items-center border-b border-border/60 px-5">
          <Link href="/dashboard" aria-label="Dashboard home">
            <Logo />
          </Link>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 rounded-lg bg-accent/60 px-3 py-2 text-sm font-medium text-foreground"
          >
            <LayoutDashboard className="size-4 text-cyan" aria-hidden />
            Dashboard
          </Link>
          <Link
            href="/dashboard/billing"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/40 hover:text-foreground"
          >
            <CreditCard className="size-4" aria-hidden />
            Billing
          </Link>
          <p className="px-3 pb-1 pt-4 font-mono text-[10px] uppercase tracking-widest text-steel">
            Coming as we build
          </p>
          {UPCOMING.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground/60"
            >
              <item.icon className="size-4" aria-hidden />
              {item.label}
              <span className="ml-auto rounded-full border border-border/70 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-steel">
                {item.milestone}
              </span>
            </div>
          ))}
        </nav>
        <div className="border-t border-border/60 p-4 text-xs text-steel">
          {active.organizations.name}
          <span className="ml-1.5 rounded-full border border-cyan/30 bg-cyan/5 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan">
            {active.role}
          </span>
        </div>
      </aside>

      {/* ── Main column ── */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 items-center justify-between gap-4 border-b border-border/60 bg-night/75 px-5 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <span className="font-display text-base font-semibold md:hidden">
              {active.organizations.name}
            </span>
            <span className="hidden text-sm text-muted-foreground md:block">
              {active.organizations.name}
            </span>
            {memberships.length > 1 && (
              <form action={switchOrganization} className="flex items-center gap-2">
                <select
                  name="organizationId"
                  defaultValue={active.organization_id}
                  className="h-8 rounded-md border border-input bg-night/60 px-2 text-xs text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label="Switch organization"
                >
                  {memberships.map((m) => (
                    <option key={m.organization_id} value={m.organization_id}>
                      {m.organizations.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" size="sm">
                  Switch
                </Button>
              </form>
            )}
          </div>
          <div className="flex items-center gap-3">
            {admin && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:border-cyan/50 hover:text-cyan"
              >
                <ShieldCheck className="size-3.5" aria-hidden />
                Admin
              </Link>
            )}
            <span className="hidden text-xs text-steel sm:block">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sign out
              </Button>
            </form>
          </div>
        </header>
        <main className="flex-1 p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
