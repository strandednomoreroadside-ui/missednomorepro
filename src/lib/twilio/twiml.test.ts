import assert from "node:assert/strict";
import test from "node:test";

import {
  handoffCallerTwiml,
  handoffFallbackTwiml,
  handoffRecipientBridgeTwiml,
  handoffRecipientTwiml,
} from "./handoff-twiml.ts";

test("normal handoff holds the caller and requires recipient acceptance", () => {
  const caller = handoffCallerTwiml({
    conferenceName: "handoff-test",
    holdUrl: "https://app.test/api/twilio/voice/handoff/hold?id=abc",
  });
  const recipient = handoffRecipientTwiml({
    mode: "normal",
    summary: "Taylor needs a lockout at Main Street.",
    decisionUrl: "https://app.test/api/twilio/voice/handoff/decision?id=abc",
  });

  assert.match(caller, /startConferenceOnEnter="false"/);
  assert.match(caller, /waitUrl=/);
  assert.match(recipient, /<Gather numDigits="1"/);
  assert.match(recipient, /Press 1 to accept and join the caller, or 2 to decline/);
  assert.match(handoffRecipientBridgeTwiml("handoff-test"), /startConferenceOnEnter="true"/);
});

test("emergency handoff does not expose the normal private summary", () => {
  const twiml = handoffRecipientTwiml({
    mode: "emergency",
    summary: "Sensitive detailed location should stay out of the emergency brief.",
    decisionUrl: "https://app.test/decision?id=abc",
  });
  assert.match(twiml, /Urgent customer request/);
  assert.doesNotMatch(twiml, /Sensitive detailed location/);
});

test("handoff TwiML XML-escapes untrusted text and provides a voicemail fallback", () => {
  const recipient = handoffRecipientTwiml({
    mode: "normal",
    summary: "<script>alert(1)</script>",
    decisionUrl: "https://app.test/decision?id=abc&next=<bad>",
  });
  assert.doesNotMatch(recipient, /<script>/);
  assert.match(recipient, /&lt;script&gt;/);

  const fallback = handoffFallbackTwiml({
    recordDoneUrl: "https://app.test/recording-done",
    recordingStatusUrl: "https://app.test/recording",
  });
  assert.match(fallback, /<Record maxLength="120"/);
  assert.match(fallback, /couldn't reach someone live/i);
});
