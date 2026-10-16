// P18-W2-d — the compact machine stamps (src/lib/arabic.ts) that render
// the tracking route map's per-station legs (W1-d priority #1 — UC
// «every leg of the journey»).
//
// Why pinned: these strings ride the MONO FACT voice under each station
// pill, mount-gated (clock-free SSR). The two-tier contract — clock-only
// within the order's own day, day + clock across midnight — is the whole
// UX; a regression to the full formatArabicDateTime sentence would blow
// the 84px horizontal slot, and a wrong same-day test would show a date
// where a bare clock belongs.
//
// Timezone note: the formatters use LOCAL getters by design (they format
// instants for a browsing customer), so the tests pin LOCAL-built
// Date objects (new Date(y, m, d, h, min) — no Z suffix) and stay green
// under any machine timezone.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  formatArabicClock,
  formatArabicDayShort,
  formatStationStampAr,
} from "../../src/lib/arabic.ts";

test("formatArabicClock: 12-hour Arabic clock with ص/م and zero-padded minutes", () => {
  assert.equal(formatArabicClock(new Date(2026, 9, 16, 14, 5)), "2:05 م");
  assert.equal(formatArabicClock(new Date(2026, 9, 16, 9, 0)), "9:00 ص");
  // 12:00 noon and 00:30 midnight both map to the 12 rung
  assert.equal(formatArabicClock(new Date(2026, 9, 16, 12, 0)), "12:00 م");
  assert.equal(formatArabicClock(new Date(2026, 9, 16, 0, 30)), "12:30 ص");
  // ISO strings are accepted (the history rows arrive as ISO)
  assert.equal(formatArabicClock(new Date(2026, 9, 16, 14, 5).toISOString()), "2:05 م");
});

test("formatArabicDayShort: day + Arabic month, no year (the compact leg date)", () => {
  assert.equal(formatArabicDayShort(new Date(2026, 9, 16, 14, 5)), "16 أكتوبر");
  assert.equal(formatArabicDayShort(new Date(2026, 0, 3, 1, 0)), "3 يناير");
});

test("formatStationStampAr: clock-only within the order's own day", () => {
  const placed = new Date(2026, 9, 16, 13, 2); // الطلب استُقبل 1:02 م
  const leg = new Date(2026, 9, 16, 14, 41); // المحطة الثانية 2:41 م — نفس اليوم
  assert.equal(formatStationStampAr(leg, placed), "2:41 م");
});

test("formatStationStampAr: day + clock when the leg crossed midnight", () => {
  const placed = new Date(2026, 9, 16, 22, 10); // طلب مسائي
  const leg = new Date(2026, 9, 17, 0, 55); // التسليم بعد منتصف الليل — يوم آخر
  assert.equal(formatStationStampAr(leg, placed), "17 أكتوبر · 12:55 ص");
});

test("formatStationStampAr: string inputs (the exact wire format) behave like Dates", () => {
  const placedIso = new Date(2026, 8, 30, 18, 30).toISOString();
  const legIso = new Date(2026, 8, 30, 19, 4).toISOString();
  assert.equal(formatStationStampAr(legIso, placedIso), "7:04 م");
  // يوم مختلف عبر حدود الشهر
  const nextDayIso = new Date(2026, 9, 1, 11, 15).toISOString();
  assert.equal(formatStationStampAr(nextDayIso, placedIso), "1 أكتوبر · 11:15 ص");
});
