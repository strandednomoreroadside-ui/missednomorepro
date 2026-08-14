import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormBanner } from "@/components/form-banner";
import { PLAN_META, PLAN_ORDER } from "@/lib/billing/plans";
import { signUp } from "../actions";

export const metadata: Metadata = {
  title: "Create your account",
  description:
    "Start your 7-day free trial of Missed No More Pro — the AI receptionist that answers calls, quotes exact prices, and books jobs for local service businesses.",
  alternates: { canonical: "/signup" },
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function SignupPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const error = typeof sp.error === "string" ? sp.error : undefined;
  const sent = sp.sent === "1";
  // Plan deep-linked from the landing pricing (?plan=growth) — only a known
  // self-serve plan is carried through to checkout.
  const plan =
    typeof sp.plan === "string" && (PLAN_ORDER as readonly string[]).includes(sp.plan)
      ? sp.plan
      : undefined;
  const planName = plan ? PLAN_META[plan as (typeof PLAN_ORDER)[number]].name : null;

  return (
    <div>
      <h1 className="font-display text-2xl font-bold tracking-tight">
        Create your account
      </h1>
      <p className="mt-1.5 text-sm text-muted-foreground">
        {planName ? (
          <>
            Starting your <span className="font-medium text-foreground">{planName}</span>{" "}
            free trial — let&rsquo;s create your account first.
          </>
        ) : (
          <>Your phones answered 24/7 — let&rsquo;s get you set up.</>
        )}
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
          {plan && <input type="hidden" name="plan" value={plan} />}
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
