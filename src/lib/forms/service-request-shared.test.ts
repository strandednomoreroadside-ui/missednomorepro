import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCustomerConfirmation,
  buildStaffAlert,
  formatServiceRequestMessage,
  hashFormToken,
  serviceRequestPayloadSchema,
} from "./service-request-shared.ts";

const payload = {
  submission_id: "550e8400-e29b-41d4-a716-446655440000",
  source_url: "https://strandednomoreroadside.com/contact",
  name: "Jane Driver",
  phone: "(440) 555-1212",
  email: "jane@example.com",
  service: "Jump start",
  location: "123 Main St, Mentor, OH",
  vehicle: "2018 Ford Escape",
  details: "Car is in the north lot.",
  sms_consent: true,
};

test("accepts the roadside service request payload shape", () => {
  const parsed = serviceRequestPayloadSchema.safeParse(payload);
  assert.equal(parsed.success, true);
});

test("rejects missing SMS consent", () => {
  const parsed = serviceRequestPayloadSchema.safeParse({
    ...payload,
    sms_consent: undefined,
  });
  assert.equal(parsed.success, false);
});

test("hashes form tokens as a stable sha256 digest", () => {
  assert.equal(hashFormToken("secret-token").length, 64);
  assert.equal(hashFormToken("secret-token"), hashFormToken("secret-token"));
  assert.notEqual(hashFormToken("secret-token"), hashFormToken("other-token"));
});

test("formats inbox and staff messages with the request details", () => {
  const parsed = serviceRequestPayloadSchema.parse(payload);
  const inbox = formatServiceRequestMessage(parsed);
  assert.match(inbox, /Website service request/);
  assert.match(inbox, /Jane Driver/);
  assert.match(inbox, /Jump start/);
  assert.match(inbox, /123 Main St/);

  const staff = buildStaffAlert(parsed);
  assert.match(staff, /New website roadside request/);
  assert.match(staff, /2018 Ford Escape/);
});

test("customer confirmation is transactional and includes opt-out language", () => {
  const message = buildCustomerConfirmation();
  assert.match(message, /received your roadside service request/i);
  assert.match(message, /STOP/i);
});
