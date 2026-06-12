import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { isPlatformAdmin } from "@/lib/auth";

/**
 * Platform-admin area (you, the operator — not your customers).
 * Access: signed-in user whose email is listed in ADMIN_EMAILS.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const ok = await isPlatformAdmin();
  if (!ok) redirect("/dashboard");

  return (
    <div className="min-h-dvh">
      <header className="flex h-16 items-center justify-between border-b border-border/60 bg-night/75 px-6 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="inline-flex items-center gap-1.5 rounded-full border border-alert/40 bg-alert/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest text-alert">
            <ShieldCheck className="size-3" aria-hidden />
            Platform admin
          </span>
        </div>
        <nav className="flex items-center gap-4 text-sm">
          <Link
            href="/admin"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Tenants
          </Link>
          <Link
            href="/admin/billing-setup"
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            Billing setup
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Dashboard
          </Link>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-6 lg:p-8">{children}</main>
    </div>
  );
}
