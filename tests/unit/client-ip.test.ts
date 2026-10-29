// r137 — the unified client-IP trust model (src/lib/client-ip.ts):
// platform-trusted header resolution, IPv6/IPv4-mapped canonicalization,
// and the TRUST_PROXY_DEPTH=0 fail-closed contract. One client must
// never occupy two limiter buckets; garbage must never persist raw.
import { test } from "node:test";
import assert from "node:assert/strict";
import { getClientIp } from "../../src/lib/client-ip.ts";

function req(headers: Record<string, string>): { headers: Headers } {
  return { headers: new Headers(headers) };
}

/* ── the non-Vercel trust model (local dev / CI / standalone) ─────── */

test("depth 1 (default): x-real-ip wins; otherwise the LAST XFF entry", () => {
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY_DEPTH;
  assert.equal(getClientIp(req({ "x-real-ip": "1.2.3.4" })), "1.2.3.4");
  // a proxy appending the connecting IP puts the real client LAST:
  assert.equal(
    getClientIp(req({ "x-forwarded-for": "9.9.9.9, 5.6.7.8" })),
    "5.6.7.8",
  );
  assert.equal(getClientIp(req({})), "unknown");
});

test("depth 0 is fail-closed: NO client-supplied header is trusted", () => {
  delete process.env.VERCEL;
  process.env.TRUST_PROXY_DEPTH = "0";
  try {
    assert.equal(
      getClientIp(req({ "x-real-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9" })),
      "unknown",
    );
  } finally {
    delete process.env.TRUST_PROXY_DEPTH;
  }
});

test("the Vercel branch: x-real-ip, else the LAST XFF hop (platform-controlled)", () => {
  process.env.VERCEL = "1";
  try {
    assert.equal(getClientIp(req({ "x-real-ip": "4.3.2.1" })), "4.3.2.1");
    assert.equal(getClientIp(req({ "x-forwarded-for": "9.9.9.9, 8.8.8.8" })), "8.8.8.8");
    assert.equal(getClientIp(req({})), "unknown");
  } finally {
    delete process.env.VERCEL;
  }
});

/* ── canonicalization: one client, ONE bucket ─────────────────────── */

test("IPv6 brackets and ::ffff: mapped forms collapse to the IPv4 literal", () => {
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY_DEPTH;
  assert.equal(getClientIp(req({ "x-real-ip": "[2001:db8::1]" })), "2001:db8::1");
  assert.equal(getClientIp(req({ "x-real-ip": "::ffff:1.2.3.4" })), "1.2.3.4");
  assert.equal(
    getClientIp(req({ "x-real-ip": "0:0:0:0:0:ffff:1.2.3.4" })),
    "1.2.3.4",
  );
});

test("uppercase input canonicalizes to lowercase", () => {
  delete process.env.VERCEL;
  assert.equal(getClientIp(req({ "x-real-ip": "2001:DB8::ABCD" })), "2001:db8::abcd");
});

/* ── validation: garbage collapses to unknown — never persisted raw ── */

test("non-IP garbage collapses to unknown", () => {
  delete process.env.VERCEL;
  delete process.env.TRUST_PROXY_DEPTH;
  assert.equal(getClientIp(req({ "x-real-ip": "definitely-not-an-ip" })), "unknown");
  assert.equal(getClientIp(req({ "x-real-ip": "<script>alert(1)</script>" })), "unknown");
  assert.equal(getClientIp(req({ "x-real-ip": "1.2.3.999" })), "unknown");
  assert.equal(getClientIp(req({ "x-real-ip": "999.1.1.1" })), "unknown");
});

test("octets above 255 reject; valid-looking IPv4 with bad octets is unknown", () => {
  delete process.env.VERCEL;
  assert.equal(getClientIp(req({ "x-real-ip": "256.0.0.1" })), "unknown");
  assert.equal(getClientIp(req({ "x-real-ip": "1.2.3" })), "unknown");
});
