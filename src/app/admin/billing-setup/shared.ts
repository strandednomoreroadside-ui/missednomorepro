/** Flash cookie carrying the result of a Stripe setup run (10-min TTL). */
export const SETUP_RESULT_COOKIE = "mnm-stripe-setup-result";

export type SetupResult = {
  log: string[];
  /** Present only when the run created the webhook endpoint (shown once). */
  webhookSecret: string | null;
};
