/** Parses "vip, repeat customer" → ['vip', 'repeat customer'] (≤ 10). */
export function parseTags(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(",")
        .map((t) => t.trim().toLowerCase())
        .filter((t) => t.length > 0 && t.length <= 40)
    ),
  ].slice(0, 10);
}
