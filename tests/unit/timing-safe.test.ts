// r137 — the length-insensitive constant-time string compare
// (src/lib/timing-safe.ts): BOTH sides are SHA-256 digested first, so
// unequal lengths never throw and never leak length equality.
import { test } from "node:test";
import assert from "node:assert/strict";
import { timingSafeEqualStr } from "../../src/lib/timing-safe.ts";

test("equal strings compare true (ASCII + Arabic)", () => {
  assert.equal(timingSafeEqualStr("seed-secret", "seed-secret"), true);
  assert.equal(timingSafeEqualStr("السر-الليبي", "السر-الليبي"), true);
});

test("unequal strings compare false — INCLUDING different lengths", () => {
  // the naive `a.length === b.length && timingSafeEqual()` guard leaks
  // length equality through timing; the digest form must not throw and
  // must simply answer false:
  assert.equal(timingSafeEqualStr("abc", "abcd"), false);
  assert.equal(timingSafeEqualStr("x".repeat(10_000), "y".repeat(1)), false);
  assert.equal(timingSafeEqualStr("a", "b"), false);
  assert.equal(timingSafeEqualStr("", "x"), false);
});

test("empty vs empty is true; empty vs anything is false", () => {
  assert.equal(timingSafeEqualStr("", ""), true);
  assert.equal(timingSafeEqualStr("", "nonempty"), false);
});
