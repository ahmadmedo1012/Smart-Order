// Password hashing — PBKDF2-SHA512, 600k iterations, timing-safe comparison.
// Format: pbkdf2$iterations$salt_b64$hash_b64  (self-describing, upgradable)

import { pbkdf2Sync, randomBytes, timingSafeEqual } from "crypto";

const ITERATIONS = 600_000;
const KEYLEN = 64;
const DIGEST = "sha512";

export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(password, salt, ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  try {
    const [scheme, iterStr, saltB64, hashB64] = stored.split("$");
    if (scheme !== "pbkdf2") return false;
    const iterations = parseInt(iterStr, 10);
    const salt = Buffer.from(saltB64, "base64");
    const expected = Buffer.from(hashB64, "base64");
    const actual = pbkdf2Sync(password, salt, iterations, expected.length, DIGEST);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
