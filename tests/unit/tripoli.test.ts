// r138 — Tripoli day/month boundary helpers (src/lib/arabic.ts, seam born r136).
//
// Why now: the dashboard 7-day series leaked the server timezone (stats
// route bucketed by the DB's UTC day and keyed via local getters) — the
// fix routes every key through tripoliDateParts, so the helpers get their
// first pinning tests. All assertions compare UTC instants (toISOString /
// getTime) — the helpers themselves use UTC-only getters, so the suite is
// green under any machine timezone (Vercel UTC included).
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  tripoliDayStart,
  tripoliMonthStart,
  tripoliDateParts,
} from "../../src/lib/arabic.ts";

const DAY_MS = 24 * 60 * 60 * 1000;

test("tripoliDayStart: 01:30 Tripoli belongs to TODAY, not yesterday (the r136 story)", () => {
  // 2026-10-10 01:30 طرابلس = 2026-10-09 23:30 UTC → يومها 10/10
  const now = new Date("2026-10-09T23:30:00.000Z");
  assert.equal(tripoliDayStart(now).toISOString(), "2026-10-09T22:00:00.000Z");
  // … وبعد ساعتين لا يتغير اليوم (لحظة انزلاق UTC تُحتمَل)
  assert.equal(tripoliDayStart(new Date(now.getTime() + 2 * 3600_000)).toISOString(), "2026-10-09T22:00:00.000Z");
});

test("tripoliDayStart: 23:59 Tripoli is still its own day; 00:00 rolls", () => {
  // 2026-10-09 23:59:59 طرابلس = 21:59:59 UTC → يوم 09/10
  assert.equal(tripoliDayStart(new Date("2026-10-09T21:59:59.000Z")).toISOString(), "2026-10-08T22:00:00.000Z");
  // 2026-10-10 00:00:01 طرابلس = 22:00:01 UTC → يوم 10/10
  assert.equal(tripoliDayStart(new Date("2026-10-09T22:00:01.000Z")).toISOString(), "2026-10-09T22:00:00.000Z");
});

test("tripoliMonthStart: month rolls at Tripoli midnight, not UTC midnight", () => {
  // 2026-10-01 00:30 طرابلس (2026-09-30 22:30 UTC) لا تزال… اليوم الأول من أكتوبر
  const monthStart = tripoliMonthStart(new Date("2026-09-30T22:30:00.000Z"));
  assert.equal(monthStart.toISOString(), "2026-09-30T22:00:00.000Z"); // 2026-10-01 00:00 طرابلس
  // 2026-09-30 23:00 طرابلس (21:00 UTC) لا تزال سبتمبر
  assert.equal(tripoliMonthStart(new Date("2026-09-30T21:00:00.000Z")).toISOString(), "2026-08-31T22:00:00.000Z");
});

test("tripoliDateParts: the r136 story — a 01:30 order carries TODAY's date", () => {
  // 2026-10-10 01:30 طرابلس = 2026-10-09 23:30 UTC
  const parts = tripoliDateParts(new Date("2026-10-09T23:30:00.000Z"));
  assert.deepEqual(parts, { y: 2026, m: 10, d: 10 });
  // الدقيقة الأخيرة من اليوم السابق
  assert.deepEqual(tripoliDateParts(new Date("2026-10-09T21:59:59.000Z")), { y: 2026, m: 10, d: 9 });
});

test("r138 weekSeries keys: dayStart − i·24h through tripoliDateParts (stats route seam)", () => {
  // نمط مفتاح السلسلة الأسبوعية في api/dashboard/stats — بعد إصلاح r138:
  // القصّ بتوقيت طرابلس (لا قراءات محلية لِـ Date على خادم UTC)
  const dayStart = new Date("2026-10-09T22:00:00.000Z"); // منتصف ليل 10/10 طرابلس
  const key = (i: number) => {
    const { y, m, d } = tripoliDateParts(new Date(dayStart.getTime() - i * DAY_MS));
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  };
  assert.equal(key(0), "2026-10-10"); // اليوم (طرابلس) — كان يُحسب 09/10 على خادم UTC
  assert.equal(key(6), "2026-10-04");
  // عبور الشهر: 31 يومًا قبل 10/10 يعبر إلى سبتمبر بسلام
  const key31 = (() => {
    const { y, m, d } = tripoliDateParts(new Date(dayStart.getTime() - 31 * DAY_MS));
    return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  })();
  assert.equal(key31, "2026-09-09");
});
