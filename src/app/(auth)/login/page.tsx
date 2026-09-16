import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBanner } from "@/components/form-banner";
import { signIn } from "../actions";
import { pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: "Sign In | Missed No More Pro",
  description:
    "Sign in to your Missed No More Pro dashboard to review calls, leads, bookings, messages, and your AI receptionist settings.",
  path: "/login",
});

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const next = typeof sp.next === "string" ? sp.next : "/dashboard";

  return (
    <div className="login-panel">
      <p className="login-eyebrow">SECURE OPERATOR ACCESS</p>
      <h1 className="font-display text-4xl font-bold tracking-tight">Welcome back.</h1>
      <p className="mt-2 text-sm text-muted-foreground">Sign in to your revenue command center.</p>

      <div className="mt-6">
        {error && <FormBanner kind="error">{error}</FormBanner>}
        <form action={signIn} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@yourbusiness.com"
              required
            />
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Link
                href="/forgot-password"
                className="text-xs text-cyan underline-offset-4 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Enter command center
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          New here?{" "}
          <Link href="/signup" className="text-cyan underline-offset-4 hover:underline">
            Create your account
          </Link>
        </p>
      </div>
    </div>
  );
}
