"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeCheck,
  BookOpen,
  Bot,
  CalendarCheck,
  CalendarRange,
  Contact,
  CreditCard,
  Hash,
  Home,
  Inbox,
  KanbanSquare,
  LineChart,
  Menu,
  MessageSquare,
  Phone,
  PhoneCall,
  Send,
  Settings,
  ShieldCheck,
  Star,
  UserPlus,
  Users,
  Wand2,
  Webhook,
  X,
  type LucideIcon,
} from "lucide-react";

import { signOut } from "@/app/(auth)/actions";
import { switchOrganization } from "@/app/dashboard/actions";
import { Button } from "@/components/ui/button";
import { InstallApp } from "@/components/pwa/install-app";
import { cn } from "@/lib/utils";

type MembershipOption = {
  organization_id: string;
  organizations: { name: string };
};

const PRIMARY: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/phone", label: "Phone", icon: Phone },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
];

// The full nav drawer opened by the hamburger button — every dashboard page,
// same order as the desktop sidebar, so mobile is never missing a page the
// desktop sidebar can reach. Includes the 4 PRIMARY shortcuts too (a user
// opening the menu shouldn't find some pages "only" on the bottom bar).
const ALL_PAGES: { href: string; label: string; icon: LucideIcon; exact?: boolean }[] = [
  { href: "/dashboard", label: "Home", icon: Home, exact: true },
  { href: "/dashboard/setup", label: "Setup wizard", icon: Wand2 },
  { href: "/dashboard/contacts", label: "Contacts", icon: Users },
  { href: "/dashboard/leads", label: "Pipeline", icon: KanbanSquare },
  { href: "/dashboard/phone", label: "Business Line", icon: Phone },
  { href: "/dashboard/calls", label: "Calls", icon: PhoneCall },
  { href: "/dashboard/messages", label: "Messages", icon: MessageSquare },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/automations", label: "Follow-ups", icon: Send },
  { href: "/dashboard/jobs", label: "Jobs", icon: CalendarCheck },
  { href: "/dashboard/dispatch", label: "Dispatch", icon: CalendarRange },
  { href: "/dashboard/assistant", label: "Assistant", icon: Bot },
  { href: "/dashboard/knowledge", label: "Knowledge Hub", icon: BookOpen },
  { href: "/dashboard/reputation", label: "Reputation", icon: Star },
  { href: "/dashboard/insights", label: "Insights", icon: LineChart },
  { href: "/dashboard/membership", label: "Membership", icon: BadgeCheck },
  { href: "/dashboard/team", label: "Team", icon: UserPlus },
  { href: "/dashboard/staff", label: "Staff", icon: Contact },
  { href: "/dashboard/numbers", label: "Numbers", icon: Hash },
  { href: "/dashboard/integrations", label: "Integrations", icon: Webhook },
  { href: "/dashboard/billing", label: "Billing", icon: CreditCard },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function matches(pathname: string, href: string, exact = false): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function MobileNavigation({
  memberships,
  activeOrganizationId,
  isPlatformAdmin,
}: {
  memberships: MembershipOption[];
  activeOrganizationId: string;
  isPlatformAdmin: boolean;
}) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const primaryActive = PRIMARY.some((item) => matches(pathname, item.href, item.exact));

  function close() {
    dialogRef.current?.close();
    setMoreOpen(false);
  }

  return (
    <>
      <nav
        aria-label="Primary mobile navigation"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-night/95 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur-xl md:hidden"
      >
        <div className="mx-auto grid max-w-lg grid-cols-5 gap-1">
          {PRIMARY.map((item) => {
            const active = matches(pathname, item.href, item.exact);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                  active ? "bg-cyan/10 text-cyan" : "text-muted-foreground active:bg-accent/60"
                )}
              >
                <Icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            );
          })}
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={moreOpen}
            aria-controls="mobile-more-sheet"
            aria-label="Open full navigation menu"
            onClick={() => {
              dialogRef.current?.showModal();
              setMoreOpen(true);
            }}
            className={cn(
              "flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[11px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
              primaryActive ? "text-muted-foreground active:bg-accent/60" : "bg-cyan/10 text-cyan"
            )}
          >
            <Menu className="size-5" aria-hidden />
            Menu
          </button>
        </div>
      </nav>

      <dialog
        id="mobile-more-sheet"
        ref={dialogRef}
        aria-labelledby="mobile-more-title"
        onClick={(event) => {
          if (event.target === dialogRef.current) close();
        }}
        onClose={() => setMoreOpen(false)}
        className="fixed inset-x-0 top-auto bottom-0 m-0 max-h-[88dvh] w-full max-w-none overflow-y-auto rounded-t-3xl border border-border/80 bg-night p-0 text-foreground shadow-2xl backdrop:bg-night/80 md:hidden"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/70 bg-night/95 px-5 py-4 backdrop-blur-xl">
          <div>
            <h2 id="mobile-more-title" className="font-display text-lg font-semibold">
              Menu
            </h2>
            <p className="text-xs text-muted-foreground">Every page, one tap away.</p>
          </div>
          <Button type="button" variant="ghost" size="icon" onClick={close} aria-label="Close menu">
            <X aria-hidden />
          </Button>
        </div>

        <div className="space-y-5 px-4 py-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <div className="space-y-1">
            {ALL_PAGES.map((item) => {
              const active = matches(pathname, item.href, item.exact);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={close}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan",
                    active
                      ? "bg-cyan/10 text-cyan"
                      : "text-foreground active:bg-accent/60"
                  )}
                >
                  <Icon className="size-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              );
            })}
            {isPlatformAdmin && (
              <Link
                href="/admin"
                onClick={close}
                className="flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium text-foreground active:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
              >
                <ShieldCheck className="size-4 shrink-0" aria-hidden />
                Platform admin
              </Link>
            )}
          </div>

          {memberships.length > 1 && (
            <form action={switchOrganization} className="rounded-xl border border-border/60 bg-card/40 p-4">
              <label htmlFor="mobile-organization" className="text-sm font-medium">
                Active business
              </label>
              <div className="mt-2 flex gap-2">
                <select
                  id="mobile-organization"
                  name="organizationId"
                  defaultValue={activeOrganizationId}
                  className="min-h-11 min-w-0 flex-1 rounded-lg border border-input bg-night px-3 text-base text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan"
                >
                  {memberships.map((membership) => (
                    <option key={membership.organization_id} value={membership.organization_id}>
                      {membership.organizations.name}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="outline" className="min-h-11">
                  Switch
                </Button>
              </div>
            </form>
          )}

          <InstallApp />

          <form action={signOut}>
            <Button type="submit" variant="outline" className="min-h-11 w-full">
              Sign out
            </Button>
          </form>
        </div>
      </dialog>
    </>
  );
}
