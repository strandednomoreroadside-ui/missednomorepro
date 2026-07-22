import assert from "node:assert/strict";
import test from "node:test";

import { isTrustedTwilioRecordingUrl } from "./provider-url.ts";

test("accepts Twilio API recording hosts over HTTPS", () => {
  assert.equal(
    isTrustedTwilioRecordingUrl(
      "https://api.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE123.mp3"
    ),
    true
  );
  assert.equal(
    isTrustedTwilioRecordingUrl(
      "https://api.sydney.au1.twilio.com/2010-04-01/Accounts/AC123/Recordings/RE123"
    ),
    true
  );
});

test("rejects substring, transport, and credential-confusion attacks", () => {
  const rejected = [
    "https://evil.example/recording?next=twilio.com",
    "https://api.twilio.com.evil.example/recording",
    "http://api.twilio.com/recording",
    "https://user:pass@api.twilio.com/recording",
    "not a URL",
  ];
  for (const value of rejected) {
    assert.equal(isTrustedTwilioRecordingUrl(value), false, value);
  }
});

