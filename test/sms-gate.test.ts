import { describe, it, expect, vi, beforeEach } from "vitest";

// Stub the raw Twilio transport so the gate never makes a network call and we
// can assert whether a send was even ATTEMPTED.
vi.mock("@/lib/twilio/sms", () => ({
  sendTwilioSms: vi.fn(async () => ({ ok: true, sid: "SM_test", error: null, code: null })),
}));

import { sendCustomerSms } from "@/lib/sms/outbound";
import { sendTwilioSms } from "@/lib/twilio/sms";
import { makeFakeAdmin } from "./helpers/fake-admin";

const TO = "+14155550123";
const TENANT = "tenant-1";

beforeEach(() => {
  vi.clearAllMocks();
});

/**
 * The §5.1/§9 "never text an opted-out contact" promise. STOP must always win,
 * and non-transactional sends require consent. The strongest case: a contact
 * with consent who is ALSO on the suppression list must still be blocked.
 */
describe("sendCustomerSms — compliance gate", () => {
  it("blocks a suppressed (STOP) number and never calls Twilio", async () => {
    const admin = makeFakeAdmin({
      sms_suppressions: { data: { id: "sup-1" } },
      contacts: { data: { consent_sms: true } },
      messages: { data: { id: "m1" } },
    });
    const res = await sendCustomerSms(admin, {
      tenantId: TENANT,
      toPhone: TO,
      body: "hi",
      kind: "manual",
    });
    expect(res.sent).toBe(false);
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe("suppressed");
    expect(sendTwilioSms).not.toHaveBeenCalled();
  });

  it("STOP overrides consent even for a transactional message", async () => {
    const admin = makeFakeAdmin({
      sms_suppressions: { data: { id: "sup-1" } },
      contacts: { data: { consent_sms: true } },
      messages: { data: { id: "m1" } },
    });
    const res = await sendCustomerSms(admin, {
      tenantId: TENANT,
      contactId: "c1",
      toPhone: TO,
      body: "your appointment is confirmed",
      kind: "confirmation",
      requireConsent: false,
    });
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe("suppressed");
    expect(sendTwilioSms).not.toHaveBeenCalled();
  });

  it("blocks a non-transactional send without consent", async () => {
    const admin = makeFakeAdmin({
      sms_suppressions: { data: null },
      contacts: { data: { consent_sms: false } },
      messages: { data: { id: "m1" } },
    });
    const res = await sendCustomerSms(admin, {
      tenantId: TENANT,
      contactId: "c1",
      toPhone: TO,
      body: "check out our offer",
      kind: "campaign",
    });
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe("no_consent");
    expect(sendTwilioSms).not.toHaveBeenCalled();
  });

  it("sends when not suppressed and consent is present", async () => {
    const admin = makeFakeAdmin({
      sms_suppressions: { data: null },
      contacts: { data: { consent_sms: true } },
      messages: { data: { id: "m1" } },
    });
    const res = await sendCustomerSms(admin, {
      tenantId: TENANT,
      contactId: "c1",
      toPhone: TO,
      body: "on our way",
      kind: "manual",
    });
    expect(res.sent).toBe(true);
    expect(res.blocked).toBe(false);
    expect(sendTwilioSms).toHaveBeenCalledTimes(1);
  });

  it("blocks an unparseable phone number before any send", async () => {
    const admin = makeFakeAdmin({ messages: { data: { id: "m1" } } });
    const res = await sendCustomerSms(admin, {
      tenantId: TENANT,
      toPhone: "not-a-phone",
      body: "hi",
      kind: "manual",
      requireConsent: false,
    });
    expect(res.blocked).toBe(true);
    expect(res.reason).toBe("invalid_number");
    expect(sendTwilioSms).not.toHaveBeenCalled();
  });
});
