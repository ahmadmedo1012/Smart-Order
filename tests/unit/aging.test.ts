// P43 SO-1 — the aging seam (src/lib/aging.ts): the live board's
// minutes-elapsed buckets. Thresholds are the mission's ops contract
// (<10 neutral, 10–20 amber, >20 red); the pins prove the boundaries
// exactly (9/10, 19/20) plus the clock-clamp and the string/Date inputs.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  AGING_THRESHOLDS,
  AGING_TICK_MS,
  agingMinutes,
  agingBucket,
  agingOf,
} from "../../src/lib/aging.ts";

test("agingMinutes: floors to whole minutes and clamps server-clock skew to 0", () => {
  const now = Date.now();
  assert.equal(agingMinutes(now - 59_000, now), 0); // 59s → 0 دقيقة
  assert.equal(agingMinutes(now - 60_000, now), 1);
  assert.equal(agingMinutes(now - 90_000, now), 1); // floor, never round-up
  assert.equal(agingMinutes(now - 3_600_000, now), 60);
  // a createdAt slightly IN THE FUTURE (server clock ahead) must never
  // render a negative age — the board clamps to 0
  assert.equal(agingMinutes(now + 5_000, now), 0);
});

test("agingMinutes: accepts Date and ISO string inputs (the API's shapes)", () => {
  const now = new Date("2026-11-03T12:00:00Z");
  assert.equal(agingMinutes(new Date("2026-11-03T11:30:00Z"), now), 30);
  assert.equal(agingMinutes("2026-11-03T11:30:00.000Z", now.getTime()), 30);
});

test("agingBucket: the three thresholds at their exact boundaries", () => {
  assert.equal(agingBucket(0), "fresh");
  assert.equal(agingBucket(9), "fresh");
  assert.equal(agingBucket(AGING_THRESHOLDS.warning), "warning"); // 10 → amber
  assert.equal(agingBucket(19), "warning");
  assert.equal(agingBucket(AGING_THRESHOLDS.urgent), "urgent"); // 20 → red
  assert.equal(agingBucket(21), "urgent");
  assert.equal(agingBucket(600), "urgent");
});

test("agingOf: the one-step render helper pairs minutes with the bucket", () => {
  const created = Date.now() - 25 * 60_000;
  const a = agingOf(created, Date.now());
  assert.equal(a.minutes >= 24 && a.minutes <= 25, true); // tolerance for test runtime
  assert.equal(a.bucket, "urgent");
  const fresh = agingOf(new Date(), new Date());
  assert.deepEqual({ minutes: fresh.minutes, bucket: fresh.bucket }, { minutes: 0, bucket: "fresh" });
});

test("AGING_TICK_MS: the documented 30s cadence (coarse for minutes precision)", () => {
  assert.equal(AGING_TICK_MS, 30_000);
});
