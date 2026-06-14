import "server-only";

import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

import { env } from "@/lib/env";

/**
 * AES-256-GCM for raw call transcripts and (later) message bodies
 * (master plan §9: "Encrypted raw transcripts and message bodies").
 *
 * Key is TRANSCRIPT_ENCRYPTION_KEY — 32 bytes, base64. Ciphertext is
 * stored as "v1:<base64(iv | tag | ciphertext)>" so the format is
 * self-describing and rotatable later. If no key is configured we refuse
 * to store plaintext: encryptText returns null and the caller stores
 * nothing in the *_encrypted column (the redacted display copy still
 * persists).
 */
const ALGO = "aes-256-gcm";
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer | null {
  if (!env.TRANSCRIPT_ENCRYPTION_KEY) return null;
  const key = Buffer.from(env.TRANSCRIPT_ENCRYPTION_KEY, "base64");
  if (key.length !== 32) {
    console.error("[crypto] TRANSCRIPT_ENCRYPTION_KEY must decode to 32 bytes (base64).");
    return null;
  }
  return key;
}

export function hasEncryptionKey(): boolean {
  return getKey() !== null;
}

/** Encrypt UTF-8 text. Returns null when no key is configured. */
export function encryptText(plain: string): string | null {
  const key = getKey();
  if (!key) {
    console.warn("[crypto] no TRANSCRIPT_ENCRYPTION_KEY — raw transcript not stored.");
    return null;
  }
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGO, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

/** Decrypt a "v1:" payload. Returns null on any failure or missing key. */
export function decryptText(payload: string): string | null {
  const key = getKey();
  if (!key || !payload.startsWith("v1:")) return null;
  try {
    const buf = Buffer.from(payload.slice(3), "base64");
    const iv = buf.subarray(0, IV_BYTES);
    const tag = buf.subarray(IV_BYTES, IV_BYTES + TAG_BYTES);
    const ciphertext = buf.subarray(IV_BYTES + TAG_BYTES);
    const decipher = createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
  } catch (err) {
    console.error("[crypto] decrypt failed:", err);
    return null;
  }
}
