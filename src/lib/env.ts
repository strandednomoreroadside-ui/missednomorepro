import { z } from "zod";

/**
 * Environment variable validation.
 *
 * Every integration key is optional during early milestones so the app can
 * boot and deploy with nothing configured. Each milestone's features check
 * for the keys they need; this module reports what's missing without crashing.
 */
const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),

  // Supabase (Milestone M0/M2)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),

  // Stripe — test keys until Milestone M10 (sk_test_/pk_test_)
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),

  // Twilio (Milestone M1/M6)
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_PHONE_NUMBER: z.string().min(1).optional(),

  // OpenAI (Milestone M7)
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Voice provider decision made at Milestone M6
  VOICE_PROVIDER: z.enum(["openai", "retell", "vapi"]).optional(),
  RETELL_API_KEY: z.string().min(1).optional(),
  VAPI_API_KEY: z.string().min(1).optional(),

  // Google Calendar (Milestone M9)
  GOOGLE_CLIENT_ID: z.string().min(1).optional(),
  GOOGLE_CLIENT_SECRET: z.string().min(1).optional(),

  // Email + monitoring (Milestone M10)
  RESEND_API_KEY: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),

  // Shared secret for internal service-to-service calls (e.g. voice tools)
  INTERNAL_API_SECRET: z.string().min(16).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (parsed.success) return parsed.data;

  // Invalid values (bad URL, wrong enum) are configuration mistakes worth
  // surfacing loudly, but they must never take the site down.
  console.error(
    "[env] Some environment variables are invalid and will be ignored:",
    parsed.error.flatten().fieldErrors
  );
  const cleaned = { ...process.env } as Record<string, string | undefined>;
  for (const issue of parsed.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string") delete cleaned[key];
  }
  return envSchema.parse(cleaned);
}

export const env = loadEnv();

/** Keys grouped by the milestone that first needs them. */
const milestoneKeys: Record<string, (keyof Env)[]> = {
  "M2 (auth/database)": [
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "SUPABASE_SERVICE_ROLE_KEY",
  ],
  "M3 (billing)": [
    "STRIPE_SECRET_KEY",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY",
    "STRIPE_WEBHOOK_SECRET",
  ],
  "M6 (phone)": ["TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_PHONE_NUMBER"],
  "M7 (AI voice)": ["OPENAI_API_KEY"],
  "M9 (calendar)": ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
};

declare global {
  // eslint-disable-next-line no-var
  var __envReported: boolean | undefined;
}

/** Logs (once per process) which integrations are not configured yet. */
export function reportEnvStatus(): void {
  // Build workers each re-import this module; the report is only useful
  // when a real server boots (dev or production runtime).
  if (process.env.NEXT_PHASE === "phase-production-build") return;
  if (globalThis.__envReported) return;
  globalThis.__envReported = true;

  const lines: string[] = [];
  for (const [milestone, keys] of Object.entries(milestoneKeys)) {
    const missing = keys.filter((k) => !env[k]);
    if (missing.length > 0) {
      lines.push(`  ${milestone}: missing ${missing.join(", ")}`);
    }
  }
  if (lines.length > 0) {
    console.info(
      `[env] Integrations not configured yet (fine until that milestone):\n${lines.join("\n")}`
    );
  }
}
