// P36 Phase C (C3) — unit belt for the native device-session core
// (src/lib/mobile-session.ts). The module is deliberately import-free
// (node:crypto only) so this file runs under plain `node --test` with
// no alias resolution — the money/order-machine seam pattern. It pins
// the WHOLE lifecycle contract the Bearer transport (src/lib/auth.ts
// resolveMobileSession) enforces on every read: token shape, at-rest
// hashing, and the sliding+absolute expiry verdict table.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MOBILE_TOKEN_PREFIX,
  MOBILE_SESSION_TTL_MS,
  MOBILE_SESSION_ABSOLUTE_MS,
  MOBILE_SESSION_RENEW_BELOW_MS,
  MOBILE_SESSION_MAX_PER_USER,
  mintMobileToken,
  hashMobileToken,
  sessionVerdict,
  renewalExpiry,
} from "../../src/lib/mobile-session.ts";

const MIN = 60 * 1000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

test("mintMobileToken: som_ prefix + 43 base64url chars (256-bit entropy class, the web session's)", () => {
  for (let i = 0; i < 20; i++) {
    const t = mintMobileToken();
    assert.ok(t.startsWith(MOBILE_TOKEN_PREFIX), `prefix missing: ${t.slice(0, 8)}`);
    assert.match(t.slice(MOBILE_TOKEN_PREFIX.length), /^[A-Za-z0-9_-]{43}$/);
  }
});

test("mintMobileToken: 200 mints, zero collisions", () => {
  const set = new Set(Array.from({ length: 200 }, () => mintMobileToken()));
  assert.equal(set.size, 200);
});

test("hashMobileToken: deterministic 64-hex sha256, distinct per token (the Session-at-rest pattern)", () => {
  const t = mintMobileToken();
  const h = hashMobileToken(t);
  assert.match(h, /^[0-9a-f]{64}$/);
  assert.equal(hashMobileToken(t), h); // stable — the DB lookup key
  assert.notEqual(hashMobileToken(mintMobileToken()), h);
});

test("sessionVerdict: a fresh session is valid (no renewal write, no sweep)", () => {
  const created = Date.now();
  const v = sessionVerdict({
    createdAt: created,
    expiresAt: created + MOBILE_SESSION_TTL_MS,
    revokedAt: null,
    now: created + HOUR,
  });
  assert.equal(v, "valid");
});

test("sessionVerdict: under half the TTL remaining → renew (the web's half-remaining rule)", () => {
  const created = Date.now() - 20 * DAY; // 10d remain of the 30d TTL
  assert.equal(
    sessionVerdict({
      createdAt: created,
      expiresAt: created + MOBILE_SESSION_TTL_MS,
      revokedAt: null,
      now: Date.now(),
    }),
    "renew",
  );
});

test("sessionVerdict: the renewal threshold is exactly half the TTL (strictly below renews)", () => {
  const created = 0;
  const expires = MOBILE_SESSION_TTL_MS;
  // 1ms UNDER the threshold → renew
  assert.equal(
    sessionVerdict({ createdAt: created, expiresAt: expires, revokedAt: null, now: expires - MOBILE_SESSION_RENEW_BELOW_MS + 1 }),
    "renew",
  );
  // exactly half remaining → still valid (renewal is proposed strictly below)
  assert.equal(
    sessionVerdict({ createdAt: created, expiresAt: expires, revokedAt: null, now: expires - MOBILE_SESSION_RENEW_BELOW_MS }),
    "valid",
  );
});

test("sessionVerdict: slid out past expiresAt → expired (the row is swept on read)", () => {
  const created = Date.now() - 31 * DAY;
  assert.equal(
    sessionVerdict({ createdAt: created, expiresAt: created + MOBILE_SESSION_TTL_MS, revokedAt: null, now: Date.now() }),
    "expired",
  );
});

test("sessionVerdict: revoked beats everything — logout is immediate and final", () => {
  const created = Date.now() - HOUR;
  assert.equal(
    sessionVerdict({
      createdAt: created,
      expiresAt: created + MOBILE_SESSION_TTL_MS,
      revokedAt: created + MIN,
      now: Date.now(),
    }),
    "revoked",
  );
  // revoked wins even when the row is ALSO slid-out (tombstone, never swept as expired)
  const old = Date.now() - 40 * DAY;
  assert.equal(
    sessionVerdict({ createdAt: old, expiresAt: old + MOBILE_SESSION_TTL_MS, revokedAt: old + DAY, now: Date.now() }),
    "revoked",
  );
});

test("sessionVerdict: the 90d absolute cap is enforced on READ, not just at renewal", () => {
  // a malformed/legacy row whose expiresAt was never clamped: past 90d
  // from login the session is dead even though expiresAt says otherwise
  const created = Date.now() - (MOBILE_SESSION_ABSOLUTE_MS + MIN);
  assert.equal(
    sessionVerdict({ createdAt: created, expiresAt: Date.now() + DAY, revokedAt: null, now: Date.now() }),
    "expired",
  );
});

test("sessionVerdict: device windows — 30d TTL inside a 90d cap, 10 devices max (the documented contract)", () => {
  assert.equal(MOBILE_SESSION_TTL_MS, 30 * DAY);
  assert.equal(MOBILE_SESSION_ABSOLUTE_MS, 90 * DAY);
  assert.equal(MOBILE_SESSION_RENEW_BELOW_MS, 15 * DAY);
  assert.equal(MOBILE_SESSION_MAX_PER_USER, 10);
});

test("renewalExpiry: slides the full TTL when the cap is far", () => {
  const created = Date.now() - 20 * DAY;
  const now = Date.now();
  assert.equal(renewalExpiry(created, now).getTime(), now + MOBILE_SESSION_TTL_MS);
});

test("renewalExpiry: NEVER past createdAt + 90d — the renewal is clamped (hard cap)", () => {
  const created = Date.now() - 89 * DAY;
  const now = Date.now();
  const e = renewalExpiry(created, now).getTime();
  assert.equal(e, created + MOBILE_SESSION_ABSOLUTE_MS);
  assert.ok(e < now + MOBILE_SESSION_TTL_MS, "the clamp must have bitten");
});
