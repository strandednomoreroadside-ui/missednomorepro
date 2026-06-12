import type { Metadata } from "next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBanner } from "@/components/form-banner";
import { updatePassword } from "../actions";

export const metadata: Metadata = { title: "Choose a new password" };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Choose a new password
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        You&rsquo;re signed in through your reset link — set the new password
        below.
      </p>

      <div className="mt-6">
        {error && <FormBanner kind="error">{error}</FormBanner>}
        <form action={updatePassword} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password">New password</Label>
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
            Save new password
          </Button>
        </form>
      </div>
    </div>
  );
}
