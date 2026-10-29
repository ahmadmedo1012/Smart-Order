// r137 — the password seam (src/lib/password.ts): PBKDF2-SHA512, 600k
// iterations, timing-safe comparison, self-describing upgradable format.
// The 600k cost makes each hash ~300ms — the suite stays at THREE
// derivations total (CI budget honesty: slow by design).
import { test } from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "../../src/lib/password.ts";

test("hashPassword produces the self-describing pbkdf2 format", () => {
  const stored = hashPassword("E2e-Oasis-2026");
  const parts = stored.split("$");
  assert.equal(parts.length, 4);
  assert.equal(parts[0], "pbkdf2");
  assert.equal(parts[1], "600000"); // the audited iteration count
  // salt + hash are valid base64 (64-byte hash → 88 base64 chars):
  assert.equal(Buffer.from(parts[2], "base64").length, 16); // 16-byte salt
  assert.equal(Buffer.from(parts[3], "base64").length, 64); // 64-byte key
});

test("verifyPassword roundtrips the exact password", () => {
  const stored = hashPassword("S3cret-كلمة-مرور");
  assert.equal(verifyPassword("S3cret-كلمة-مرور", stored), true);
});

test("verifyPassword rejects wrong passwords and malformed stored values", () => {
  const stored = hashPassword("correct horse battery staple");
  assert.equal(verifyPassword("wrong", stored), false);
  assert.equal(verifyPassword("", stored), false);
  // malformed stored forms fail CLOSED, never throw:
  assert.equal(verifyPassword("x", "not-a-hash"), false);
  assert.equal(verifyPassword("x", "pbkdf2$notanumber$###$!!!"), false);
  assert.equal(verifyPassword("x", ""), false);
});

test("salts are unique per hash (same password, different stored values)", () => {
  const a = hashPassword("same-password");
  const b = hashPassword("same-password");
  assert.notEqual(a, b);
  assert.equal(verifyPassword("same-password", a), true);
  assert.equal(verifyPassword("same-password", b), true);
});
