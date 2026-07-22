import assert from "node:assert/strict";
import test from "node:test";

import { scrubEvent } from "./scrub.ts";

test("removes headers, cookies, and sensitive query values", () => {
  const event = {
    request: {
      url: "https://missednomorepro.com/api/twilio/voice/bridge?tid=tenant&key=super-secret&t=%2B14405550199",
      headers: { authorization: "Bearer secret" },
      cookies: { session: "secret" },
    },
  };

  const scrubbed = scrubEvent(event);
  assert.equal(scrubbed.request.headers, undefined);
  assert.equal(scrubbed.request.cookies, undefined);
  assert.match(scrubbed.request.url, /key=%5Bredacted%5D/);
  assert.doesNotMatch(scrubbed.request.url, /super-secret/);
  assert.doesNotMatch(scrubbed.request.url, /14405550199/);
});

test("redacts sensitive parameters in nested URL strings", () => {
  const event = {
    extra: {
      callback: "/api/provider?token=abc123&state=oauth-state&safe=value",
    },
  };
  const scrubbed = scrubEvent(event);
  assert.equal(
    scrubbed.extra.callback,
    "/api/provider?token=%5Bredacted%5D&state=%5Bredacted%5D&safe=%5Bredacted%5D"
  );
});
