import { describe, it, expect } from "vitest";

import { redactPii } from "@/lib/redact";

/**
 * The redacted copy is what renders in the dashboard; the raw text lives only
 * in the encrypted column (§9). These assert the display safeguard catches the
 * common PII shapes a caller might speak.
 */
describe("redactPii", () => {
  it("redacts email addresses", () => {
    const { redacted, redactedCount } = redactPii("Email me at joe@example.com please");
    expect(redacted).toContain("[email]");
    expect(redacted).not.toContain("joe@example.com");
    expect(redactedCount).toBe(1);
  });

  it("redacts US phone numbers with or without country code", () => {
    expect(redactPii("call 440-644-2423").redacted).toContain("[phone]");
    expect(redactPii("+1 (440) 644-2423").redacted).toContain("[phone]");
  });

  it("redacts card-length digit runs", () => {
    const { redacted } = redactPii("card 4242 4242 4242 4242");
    expect(redacted).toContain("[card]");
    expect(redacted).not.toContain("4242 4242 4242 4242");
  });

  it("redacts SSNs", () => {
    expect(redactPii("ssn 123-45-6789").redacted).toContain("[ssn]");
  });

  it("leaves clean text untouched", () => {
    const { redacted, redactedCount } = redactPii("My car broke down on Main Street");
    expect(redacted).toBe("My car broke down on Main Street");
    expect(redactedCount).toBe(0);
  });
});
