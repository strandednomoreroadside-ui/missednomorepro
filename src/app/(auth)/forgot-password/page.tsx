import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBanner } from "@/components/form-banner";
import { requestPasswordReset } from "../actions";

export const metadata: Metadata = { title: "Reset your password" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ForgotPasswordPage({
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
        Reset your password
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        We&rsquo;ll email you a secure reset link.
      </p>

      <div className="mt-6">
        {error && <FormBanner kind="error">{error}</FormBanner>}
        {sent && (
          <FormBanner kind="success">
            If that email has an account, a reset link is on its way. Check
            your inbox.
          </FormBanner>
        )}
        <form action={requestPasswordReset} className="space-y-4">
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
          <Button type="submit" className="w-full" size="lg">
            Send reset link
          </Button>
        </form>
        <p className="mt-5 text-center text-sm text-muted-foreground">
          Remembered it?{" "}
          <Link href="/login" className="text-cyan underline-offset-4 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
