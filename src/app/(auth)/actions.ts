"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

import { PLAN_ORDER } from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/server";
import { env } from "@/lib/env";

/** Origin of the current request (works locally and on Vercel). */
async function getOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto =
    h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return host ? `${proto}://${host}` : env.NEXT_PUBLIC_APP_URL;
}

/** Only allow same-site relative redirect targets (no open redirects). */
function safeNext(raw: FormDataEntryValue | null): string {
  const value = typeof raw === "string" ? raw : "";
  return value.startsWith("/") && !value.startsWith("//") ? value : "/dashboard";
}

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNext(formData.get("next"));

  if (!email || !password) {
    redirect(`/login?error=${encodeURIComponent("Enter your email and password.")}`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    redirect(
      `/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`
    );
  }
  redirect(next);
}

export async function signUp(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || password.length < 8) {
    redirect(
      `/signup?error=${encodeURIComponent(
        "Use a valid email and a password with at least 8 characters."
      )}`
    );
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${origin}/auth/callback?next=/onboarding` },
  });

  if (error) redirect(`/signup?error=${encodeURIComponent(error.message)}`);

  // Carry a plan deep-linked from the landing (/signup?plan=growth) across the
  // email-confirm + onboarding hops in a short-lived cookie, so the billing
  // page can pre-highlight it. Only known self-serve plans are honored.
  const plan = String(formData.get("plan") ?? "");
  if ((PLAN_ORDER as readonly string[]).includes(plan)) {
    const cookieStore = await cookies();
    cookieStore.set("signup_plan", plan, {
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1h — enough to finish onboarding + land on billing
    });
  }

  // Email confirmation off → session exists, go straight to onboarding.
  if (data.session) redirect("/onboarding");
  // Email confirmation on → tell them to check their inbox.
  redirect("/signup?sent=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function requestPasswordReset(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) {
    redirect(`/forgot-password?error=${encodeURIComponent("Enter your account email.")}`);
  }

  const supabase = await createClient();
  const origin = await getOrigin();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });
  // Always report success — never reveal whether an email is registered.
  redirect("/forgot-password?sent=1");
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) {
    redirect(
      `/reset-password?error=${encodeURIComponent("Password must be at least 8 characters.")}`
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) redirect(`/reset-password?error=${encodeURIComponent(error.message)}`);
  redirect("/dashboard");
}
