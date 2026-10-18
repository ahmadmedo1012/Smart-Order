// Constant-time string comparison — the length-hash guard pattern.
//
// timingSafeEqual throws on unequal buffer lengths, and the naive guard
// (`a.length === b.length && timingSafeEqual(...)`) leaks length equality
// through timing. Hashing BOTH sides to fixed-length SHA-256 digests first
// absorbs the length difference entirely (32 bytes, always) and never
// throws — the compare then runs in constant time regardless of how
// different the inputs are.
//
// Sibling precedent: lib/password.ts verifyPassword compares two
// key-derivations of equal length by construction; the seed secret
// compares two arbitrary env/user strings, so the digest form is the safe
// one. Server-side only (node:crypto) — nodejs-runtime routes.

import { createHash, timingSafeEqual } from "crypto";

/** Digest-based constant-time string equality (length-insensitive). */
export function timingSafeEqualStr(a: string, b: string): boolean {
  const da = createHash("sha256").update(a).digest();
  const db = createHash("sha256").update(b).digest();
  return timingSafeEqual(da, db);
}
