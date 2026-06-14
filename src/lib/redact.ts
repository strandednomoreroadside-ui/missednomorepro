/**
 * Lightweight PII redaction for the transcript text shown in the
 * dashboard (master plan §9: "Redacted dashboard display fields"). The
 * full, unredacted text lives only in the encrypted column. This is a
 * display safeguard, not a guarantee — keep the raw copy encrypted.
 */
const PATTERNS: { re: RegExp; label: string }[] = [
  { re: /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, label: "[email]" },
  { re: /\b\d{3}-\d{2}-\d{4}\b/g, label: "[ssn]" },
  // Card-like long digit runs (13–19), allowing spaces/dashes between groups.
  { re: /\b(?:\d[ -]?){13,19}\b/g, label: "[card]" },
  // US phone numbers, with or without +1 and common separators.
  { re: /(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, label: "[phone]" },
];

export function redactPii(text: string): { redacted: string; redactedCount: number } {
  let redacted = text;
  let redactedCount = 0;
  for (const { re, label } of PATTERNS) {
    redacted = redacted.replace(re, () => {
      redactedCount += 1;
      return label;
    });
  }
  return { redacted, redactedCount };
}
