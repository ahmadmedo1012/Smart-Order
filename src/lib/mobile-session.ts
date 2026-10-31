// P36 Phase C (C3) — native device-session credentials (the PURE core).
//
// The React-Native merchant app cannot rely on the web's httpOnly cookie,
// so it authenticates with a Bearer token minted by /api/mobile/auth/login.
// This module is deliberately import-free (node:crypto only, zero @/lib
// aliases) so the unit belt (`node --test`, no bundler alias resolution —
// the money/order-machine seam pattern) can pin the whole lifecycle
// contract. The DB-coupled lifecycle lives in src/lib/auth.ts — the SAME
// auth-resolution layer the cookie path uses: one identity system
// (User + PBKDF2 + permissionsFor), two transports (cookie | Bearer).
//
// Semantics (the web Session pattern, device-appropriate windows):
//   - token: "som_" + base64url(32 random bytes) — the same 256-bit
//     entropy class as the web session cookie, with a visible prefix so a
//     cookie value can never be confused with a device token in logs or
//     client storage.
//   - at rest: SHA-256 hex of the full token string (unique tokenHash) —
//     the exact Session-at-rest pattern (src/lib/auth.ts).
//   - sliding TTL 30 days, renewed when under half (15d) remains — the
//     web's half-remaining renewal rule, scaled for a device app.
//   - hard absolute cap 90 days from login: enforced on EVERY read (not
//     just at renewal — stricter than the web's renewal cutoff), and a
//     renewal never writes an expiresAt past createdAt + 90d.

import { createHash, randomBytes } from "crypto";

export const MOBILE_TOKEN_PREFIX = "som_";
export const MOBILE_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const MOBILE_SESSION_ABSOLUTE_MS = 90 * 24 * 60 * 60 * 1000;
/** Renew when less than this remains — the web Session's half-remaining rule. */
export const MOBILE_SESSION_RENEW_BELOW_MS = MOBILE_SESSION_TTL_MS / 2;
/** Max ACTIVE (non-revoked) device sessions per user — the web trim's 10. */
export const MOBILE_SESSION_MAX_PER_USER = 10;
/** lastUsedAt write throttle — at most one device-metadata write per minute. */
export const MOBILE_LAST_USED_WRITE_MS = 60 * 1000;

/** Mint a fresh device credential. The raw token is shown to the client
 *  EXACTLY ONCE (the login response); only its SHA-256 is persisted. */
export function mintMobileToken(): string {
  return MOBILE_TOKEN_PREFIX + randomBytes(32).toString("base64url");
}

/** The at-rest form — identical recipe to the web Session tokenHash. */
export function hashMobileToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type MobileSessionVerdict = "valid" | "renew" | "expired" | "revoked";

/** The ONE validity decision for a device-session row, pure on timestamps.
 *  Order matters and is pinned by tests: revoked beats expired (a
 *  tombstone is kept for the audit trail, never swept as "expired"), the
 *  absolute cap beats a still-future expiresAt (legacy/malformed rows
 *  cannot outlive the cap), and renewal is only proposed for rows that
 *  are otherwise valid. */
export function sessionVerdict(input: {
  createdAt: Date | number;
  expiresAt: Date | number;
  revokedAt: Date | number | null;
  now: number;
}): MobileSessionVerdict {
  const created = new Date(input.createdAt).getTime();
  const expires = new Date(input.expiresAt).getTime();
  if (input.revokedAt !== null) return "revoked";
  if (input.now >= created + MOBILE_SESSION_ABSOLUTE_MS) return "expired";
  if (input.now >= expires) return "expired";
  if (expires - input.now < MOBILE_SESSION_RENEW_BELOW_MS) return "renew";
  return "valid";
}

/** A renewal's new expiresAt — the sliding TTL, clamped to the absolute
 *  cap so no renewal can ever extend a session past login + 90d. */
export function renewalExpiry(createdAt: Date | number, now: number): Date {
  const created = new Date(createdAt).getTime();
  const sliding = now + MOBILE_SESSION_TTL_MS;
  const capped = created + MOBILE_SESSION_ABSOLUTE_MS;
  return new Date(Math.min(sliding, capped));
}
