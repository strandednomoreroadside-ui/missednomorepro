import path from "node:path";

import { defineConfig } from "vitest/config";

/**
 * Unit tests for the money/compliance-critical PURE logic (pricing engine,
 * timezone/availability, the SMS consent gate, cost controls, PII redaction).
 * These guard the master-plan §5.1 promises: 0% price hallucination, no
 * out-of-hours bookings, never text an opted-out contact.
 *
 * Node env. `@` resolves to src/ (mirrors tsconfig paths); `server-only` is
 * stubbed so server modules import cleanly under the test runner.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(process.cwd(), "test/stubs/server-only.ts"),
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
