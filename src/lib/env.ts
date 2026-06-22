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
  // Optional A2P Messaging Service SID (MG…) — best deliverability for
  // 10DLC. Used for staff alert texts (M7); falls back to the number.
  TWILIO_MESSAGING_SERVICE_SID: z.string().min(1).optional(),

  // OpenAI (Milestone M7)
  OPENAI_API_KEY: z.string().min(1).optional(),

  // Voice provider decision made at Milestone M6
  VOICE_PROVIDER: z.enum(["openai", "retell", "vapi"]).optional(),
  RETELL_API_KEY: z.string().min(1).optional(),
  VAPI_API_KEY: z.string().min(1).optional(),

  // Google Calendar (Milestone M9) — base64-encoded OAuth credentials file
  // (contains client_id, client_secret, auth_uri, token_uri, etc.)
  GOOGLE_OAUTH_CREDENTIALS: z.string().min(1).optional(),

  // Google Maps Platform (pricing engine) — API key for Geocoding +
  // Distance Matrix, used to turn a caller's address into driving miles
  // from the business's home base for zone/tow pricing.
  GOOGLE_MAPS_API_KEY: z.string().min(1).optional(),

  // Email + monitoring (Milestone M10)
  RESEND_API_KEY: z.string().min(1).optional(),
  // From address for transactional email (usage alerts, receipts). Must be
  // on a Resend-verified sending domain. e.g. "Missed No More Pro <alerts@missednomorepro.com>"
  RESEND_FROM: z.string().min(1).optional(),
  SENTRY_DSN: z.string().min(1).optional(),

  // Platform admin (M2): comma-separated emails allowed into /admin
  ADMIN_EMAILS: z.string().optional(),
  // Used by the Supabase CLI for migrations, never by the app itself
  SUPABASE_DB_PASSWORD: z.string().min(1).optional(),

  // Shared secret for internal service-to-service calls (e.g. voice tools)
  INTERNAL_API_SECRET: z.string().min(16).optional(),
  // AES-256-GCM key (32 bytes, base64) for encrypting raw transcripts (§9, M7)
  TRANSCRIPT_ENCRYPTION_KEY: z.string().min(1).optional(),

  // Secret guarding cron endpoints (appointment reminders). Vercel Cron
  // sends it as `Authorization: Bearer <CRON_SECRET>` when this env is set.
  CRON_SECRET: z.string().min(1).optional(),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  // Treat empty strings as "not set" — .env.local templates keep blank
  // placeholders for keys that arrive at later milestones.
  const raw: Record<string, string | undefined> = {};
  for (const [key, value] of Object.entries(process.env)) {
    raw[key] = value === "" ? undefined : value;
  }
  const parsed = envSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Invalid values (bad URL, wrong enum) are configuration mistakes worth
  // surfacing loudly, but they must never take the site down.
  console.error(
    "[env] Some environment variables are invalid and will be ignored:",
    parsed.error.flatten().fieldErrors
  );
  const cleaned = { ...raw };
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
  "M7 (AI voice)": [
    "RETELL_API_KEY",
    "INTERNAL_API_SECRET",
    "TRANSCRIPT_ENCRYPTION_KEY",
  ],
  "M9 (calendar)": ["GOOGLE_OAUTH_CREDENTIALS"],
  "Pricing (maps)": ["GOOGLE_MAPS_API_KEY"],
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
