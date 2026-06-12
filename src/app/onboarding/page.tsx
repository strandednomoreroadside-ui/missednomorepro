import type { Metadata } from "next";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBanner } from "@/components/form-banner";
import { requireUser, getMemberships } from "@/lib/auth";
import { redirect } from "next/navigation";

import { createOrganization } from "./actions";

export const metadata: Metadata = { title: "Set up your business" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireUser();
  const memberships = await getMemberships();
  if (memberships.length > 0) redirect("/dashboard");

  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div className="glow-field relative flex min-h-dvh flex-col items-center justify-center px-6 py-12">
      <div className="grid-lines pointer-events-none absolute inset-0" aria-hidden />
      <div className="relative w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Link href="/" aria-label="Missed No More Pro — home">
            <Logo />
          </Link>
        </div>
        <div className="border-glow rounded-2xl p-8">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            Name your business
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            This creates your workspace. You&rsquo;ll add services, hours, and
            your phone setup in the wizard later.
          </p>
          <div className="mt-6">
            {error && <FormBanner kind="error">{error}</FormBanner>}
            <form action={createOrganization} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Business name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  maxLength={120}
                  placeholder={`e.g. "Summit Towing & Roadside"`}
                  required
                />
              </div>
              <Button type="submit" className="w-full" size="lg">
                Create my workspace
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
