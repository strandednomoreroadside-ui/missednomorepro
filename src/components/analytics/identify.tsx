"use client";

import { useEffect } from "react";
import { analytics } from "@heycatch/sdk";

/**
 * HeyCatch identity — mounted once in the dashboard layout, which every
 * signed-in route renders through. Fires setIdentity whenever the signed-in
 * user (or their plan) changes; a no-op re-run on the same values is cheap
 * and expected (this is a normal effect dependency, not an "init" guard).
 */
export function Identify({
  userId,
  email,
  plan,
  signupDate,
}: {
  userId: string;
  email?: string;
  plan?: string;
  signupDate?: string;
}) {
  useEffect(() => {
    analytics.setIdentity(
      userId,
      { email, plan },
      signupDate ? { signup_date: signupDate } : undefined
    );
  }, [userId, email, plan, signupDate]);

  return null;
}
