import assert from "node:assert/strict";
import test from "node:test";

import { shouldCachePwaPath } from "./cache-policy.ts";

test("caches only immutable/static PWA assets", () => {
  assert.equal(shouldCachePwaPath("/_next/static/chunks/app.js"), true);
  assert.equal(shouldCachePwaPath("/app-icon.svg"), true);
  assert.equal(shouldCachePwaPath("/icons/icon-192.png"), true);
  assert.equal(shouldCachePwaPath("/offline"), true);
});

test("never caches authenticated, API, or tenant media paths", () => {
  const rejected = [
    "/dashboard",
    "/dashboard/phone",
    "/api/recordings/call-id",
    "/api/twilio/voice",
    "/monitoring",
    "/widget.js",
  ];
  for (const pathname of rejected) {
    assert.equal(shouldCachePwaPath(pathname), false, pathname);
  }
});
