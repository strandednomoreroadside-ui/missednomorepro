import type { Metadata } from "next";
import Link from "next/link";
import { TriangleAlert } from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { acceptInvite } from "./actions";

export const metadata: Metadata = { title: "Join a team" };

export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;

  // Look up the invite by token with the admin client — the visitor isn't a
  // member yet, so RLS would hide it. The token is the bearer capability.
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from("invitations")
    .select("email, role, status, expires_at, organizations:tenant_id ( name )")
    .eq("token", token)
    .maybeSingle();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const org = invite?.organizations as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const orgName = Array.isArray(org) ? org[0]?.name : org?.name;

  const valid =
    invite &&
    invite.status === "pending" &&
    new Date(invite.expires_at as string).getTime() > Date.now();

  return (
    <div className="flex min-h-dvh items-center justify-center px-6">
      <div className="glow-field absolute inset-0 -z-10" aria-hidden />
      <div className="w-full max-w-md rounded-2xl border border-border bg-card/70 p-8 text-center shadow-xl">
        <div className="flex justify-center">
          <Logo />
        </div>

        {!valid ? (
          <div className="mt-6">
            <TriangleAlert className="mx-auto size-8 text-amber-500" aria-hidden />
            <h1 className="mt-3 font-display text-xl font-semibold">
              This invite isn&rsquo;t valid
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              It may have expired, been revoked, or already been used. Ask whoever invited you to
              send a fresh link.
            </p>
            <Link href="/login" className="mt-5 inline-block text-sm text-cyan hover:underline">
              Go to sign in
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <h1 className="font-display text-xl font-semibold">
              You&rsquo;re invited to join{orgName ? ` ${orgName}` : " a team"}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              as a{invite!.role === "admin" ? "n admin" : " member"} on Missed No More Pro.
            </p>

            {error && (
              <p className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-sm text-amber-500">
                We couldn&rsquo;t accept that invite — it may have just expired.
              </p>
            )}

            {user ? (
              <form action={acceptInvite} className="mt-6">
                <input type="hidden" name="token" value={token} />
                <Button type="submit" className="w-full">
                  Accept invite
                </Button>
                <p className="mt-2 text-xs text-steel">Joining as {user.email}</p>
              </form>
            ) : (
              <div className="mt-6 space-y-3">
                <p className="text-sm text-muted-foreground">
                  Sign in or create an account to join. Use this email if you have one:{" "}
                  <span className="font-medium text-foreground">{invite!.email}</span>
                </p>
                <div className="flex gap-2">
                  <Link
                    href={`/signup?next=${encodeURIComponent(`/invite/${token}`)}`}
                    className={cn(buttonVariants(), "flex-1")}
                  >
                    Create account
                  </Link>
                  <Link
                    href={`/login?next=${encodeURIComponent(`/invite/${token}`)}`}
                    className={cn(buttonVariants({ variant: "outline" }), "flex-1")}
                  >
                    Sign in
                  </Link>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
