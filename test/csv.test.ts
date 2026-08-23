import { describe, expect, it } from "vitest";

import { parseTags } from "@/lib/contacts";
import { parseCsv } from "@/lib/csv";

describe("parseCsv", () => {
  it("handles Excel-style BOMs, quoted commas, newlines, and escaped quotes", () => {
    expect(
      parseCsv('\uFEFFName,Notes\r\n"Ada, Lovelace","First line\nSaid ""hello"""\r\n')
    ).toEqual([
      ["Name", "Notes"],
      ["Ada, Lovelace", 'First line\nSaid "hello"'],
    ]);
  });
});

describe("parseTags", () => {
  it("normalizes, deduplicates, and caps imported tags", () => {
    expect(parseTags(" VIP, repeat customer, vip, , ")).toEqual(["vip", "repeat customer"]);
  });
});
