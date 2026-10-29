// r137 — the UUID seam (src/lib/uuid.ts): crypto.randomUUID with a
// deterministic-format fallback. The v4 shape is the contract (the
// idempotency keys and public tokens consume it).
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "../../src/lib/uuid.ts";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test("every generated UUID matches the RFC 4122 v4 shape", () => {
  for (let i = 0; i < 200; i += 1) {
    const u = randomUUID();
    assert.match(u, V4);
  }
});

test("generation is non-deterministic (collision-free over a sample)", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 500; i += 1) seen.add(randomUUID());
  assert.equal(seen.size, 500);
});

test("version and variant nibbles are pinned by the shape", () => {
  const u = randomUUID();
  assert.equal(u[14], "4"); // version 4
  assert.ok(["8", "9", "a", "b"].includes(u[19])); // RFC variant
});
