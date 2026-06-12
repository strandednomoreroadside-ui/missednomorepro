import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBanner } from "@/components/form-banner";
import { signUp } from "../actions";

export const metadata: Metadata = { title: "Create your account" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const sent = sp.sent === "1";

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Your phones answered 24/7 — let&rsquo;s get you set up.
      </p>

      <div className="mt-6">
        {error && <FormBanner kind="error">{error}</FormBanner>}
        {sent && (
          <FormBanner kind="success">
            Check your email — we sent you a confirmation link. Click it to
            finish creating your account.
          </FormBanner>
        )}
        <form action={signUp} className="space-y-4">
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
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              minLength={8}
              placeholder="At least 8 characters"
              required
            />
          </div>
          <Button type="submit" className="w-full" size="lg">
            Create account
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="text-cyan underline-offset-4 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
