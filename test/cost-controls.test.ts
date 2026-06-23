import { describe, it, expect, vi } from "vitest";

// cost-controls pulls in subscription.ts, which imports the Supabase server
// client (next/headers). voiceAllowed never calls it (it uses the passed-in
// admin), so stub the module to keep the import graph node-friendly.
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));

import { voiceAllowed } from "@/lib/billing/cost-controls";
import { makeFakeAdmin } from "./helpers/fake-admin";

const TENANT = "tenant-1";
const PERIOD_START = new Date(Date.UTC(2026, 5, 1)).toISOString();

function sub(over: Record<string, unknown> = {}) {
  return {
    data: {
      id: "sub-1",
      tenant_id: TENANT,
      plan: "starter",
      status: "active",
      overage_enabled: false,
      current_period_start: PERIOD_START,
      current_period_end: null,
      daily_spend_cap_cents: null,
      overage_cap_cents: null,
      ...over,
    },
  };
}

// Seed both the plan row and the 'none' fallback identically, so the test is
// robust to however effectivePlan resolves the plan id.
function limits(over: Record<string, unknown> = {}) {
  const row = {
    monthly_minutes: 250,
    overage_per_minute_cents: 20,
    daily_spend_cap_cents: 0,
    overage_cap_cents: 0,
    ...over,
  };
  return { data: [{ plan: "starter", ...row }, { plan: "none", ...row }] };
}

/**
 * Cost controls are the margin circuit-breaker (§15). They must STOP the AI
 * when limits are hit, but ERR OPEN on any read failure — a cost-control
 * hiccup must never silently drop a customer's calls.
 */
describe("voiceAllowed", () => {
  it("allows a call when comfortably under all limits", async () => {
    const admin = makeFakeAdmin({
      subscriptions: sub(),
      plan_limits: limits(),
      usage_events: { data: [] },
      calls: { data: [] },
    });
    const res = await voiceAllowed(admin, TENANT);
    expect(res.allowed).toBe(true);
  });

  it("blocks when monthly minutes are exhausted and overage is off", async () => {
    const admin = makeFakeAdmin({
      subscriptions: sub({ overage_enabled: false }),
      plan_limits: limits({ monthly_minutes: 250 }),
      usage_events: { data: [{ quantity: 250 }] },
      calls: { data: [] },
    });
    const res = await voiceAllowed(admin, TENANT);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("minutes_exhausted");
  });

  it("blocks when today's spend reaches the daily cap", async () => {
    const admin = makeFakeAdmin({
      subscriptions: sub(),
      plan_limits: limits({ daily_spend_cap_cents: 1000 }),
      usage_events: { data: [] },
      calls: { data: [{ cost_estimate: 12 }] }, // $12 = 1200c >= 1000c
    });
    const res = await voiceAllowed(admin, TENANT);
    expect(res.allowed).toBe(false);
    expect(res.reason).toBe("daily_spend_cap");
  });

  it("errs OPEN when a read throws", async () => {
    const admin = makeFakeAdmin({
      subscriptions: () => {
        throw new Error("db down");
      },
      plan_limits: limits(),
    });
    const res = await voiceAllowed(admin, TENANT);
    expect(res.allowed).toBe(true);
  });

  it("errs OPEN when plan_limits is not seeded", async () => {
    const admin = makeFakeAdmin({
      subscriptions: { data: null },
      plan_limits: { data: [] },
    });
    const res = await voiceAllowed(admin, TENANT);
    expect(res.allowed).toBe(true);
  });
});
