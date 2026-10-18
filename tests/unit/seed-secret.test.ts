// W6-B4 (audit P3-a) — the seed secret compare pins.
//
// WHAT HAPPENED: api/seed/route.ts:35 compared the secret with `===` —
// a fast-exit string compare whose timing leaks matched characters, and
// whose length guard would leak length equality. The fix routes the
// comparison through timingSafeEqualStr (src/lib/timing-safe.ts): BOTH
// sides are hashed to fixed-length SHA-256 digests first, then compared
// with timingSafeEqual — 32 bytes always, constant time, never throws,
// no length signal at all.
//
// WHY SOURCE-CONTRACT FOR THE ROUTE: the route imports next/server +
// Prisma + session cookies, so a dependency-free node --test cannot
// invoke the handler (the tx-contract.test.ts precedent — behavioral
// pins for the pure seam, wiring pins for the route, HTTP-level behavior
// in the CI e2e battery). The pure seam IS behavioral here:
//   · right secret → true (the route's `authorized` turns on);
//   · wrong secret → false (falls to the platform-admin branch, then
//     the single 403 «غير مصرح»);
//   · "never leaks which" → the digest compare is length-insensitive and
//     the route answers ONE 403 copy for wrong/missing/mismatched-length
//     secrets — pinned below so the branch can't fork its answer.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { timingSafeEqualStr } from "../../src/lib/timing-safe.ts";

const read = (p: string): string =>
  readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const routeSrc = read("../../src/app/api/seed/route.ts");

/* Comments stripped — the contract is about statements, not narration
   (tx-contract.test.ts convention). */
const stripped = (src: string): string =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/^[ \t]*\/\/.*$/gm, " ");
const route = stripped(routeSrc);

const SECRET = "seed-secret-أسرار-البيئة-2441";

test("behavior: the right secret compares equal (the route's authorized turns on)", () => {
  assert.equal(timingSafeEqualStr(SECRET, SECRET), true);
  assert.equal(timingSafeEqualStr("", ""), true);
});

test("behavior: a wrong secret compares unequal (403 unless platform-admin)", () => {
  assert.equal(timingSafeEqualStr(SECRET, `${SECRET}!`), false);
  assert.equal(timingSafeEqualStr(SECRET, "wrong"), false);
  assert.equal(timingSafeEqualStr(SECRET, ""), false);
  assert.equal(timingSafeEqualStr("", SECRET), false);
});

test("behavior: length differences never throw and never match — no length signal to leak", () => {
  // the naive guard form would throw on unequal lengths; the digest form
  // absorbs them entirely
  assert.doesNotThrow(() => timingSafeEqualStr("a", "aa"));
  assert.equal(timingSafeEqualStr("a", "aa"), false);
  assert.equal(timingSafeEqualStr("x".repeat(10_000), "x"), false);
  // prefix relationships must not partially match
  assert.equal(timingSafeEqualStr(SECRET.slice(0, 4), SECRET), false);
  assert.equal(timingSafeEqualStr(SECRET, SECRET.slice(0, 4)), false);
});

test("behavior: Arabic/unicode secrets round-trip byte-safely", () => {
  const s = "بذرة-٢٤٤١-سرية";
  assert.equal(timingSafeEqualStr(s, s), true);
  assert.equal(timingSafeEqualStr(s, "بذرة-٢٤٤٢-سرية"), false);
});

test("wiring: the route computes authorization with the constant-time compare — the `===` fast-exit is gone", () => {
  assert.ok(
    route.includes("timingSafeEqualStr(secret, envSecret)"),
    "the authorized expression must call timingSafeEqualStr(secret, envSecret)",
  );
  for (const banned of [
    "secret === envSecret",
    "envSecret === secret",
    "== envSecret",
    "!= envSecret",
  ]) {
    assert.ok(!route.includes(banned), `route must not contain \`${banned}\``);
  }
});

test("wiring: one 403 answer for every unauthorized shape — wrong, missing, and length-mismatched secrets read identically", () => {
  // the single gate return — no forked copy that could tell the caller
  // WHICH side failed
  const gateCount = (route.match(/fail\("غير مصرح", 403\)/g) ?? []).length;
  assert.equal(gateCount, 1, "exactly one unauthorized 403 response copy");
  // and the gate fires after BOTH the secret path and the admin fallback
  // fail — ordering pinned so a refactor can't 403 before the admin
  // branch runs
  const gateIdx = route.indexOf('fail("غير مصرح", 403)');
  const adminIdx = route.indexOf("user?.isPlatformAdmin");
  assert.ok(adminIdx !== -1 && adminIdx < gateIdx, "platform-admin fallback precedes the 403 gate");
});
