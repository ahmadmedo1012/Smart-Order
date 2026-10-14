// P13-2d (T3) — pins for the plan-features numeral fold: live plan rows
// seeded pre-r133 carry Arabic-Indic digits («١٥ منتجاً و٣ أقسام») while the
// fleet policy is Western digits in UI. westernNumerals is the display-safe
// fold applied at the two plan-features read seams (api/plans
// safeParseFeatures + pricing/page.tsx safeParse) — only digit glyphs fold,
// meaning never changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { westernNumerals } from "../../src/lib/arabic.ts";

test("westernNumerals: folds the drifted plan-feature strings", () => {
  // the exact live rows the P13-1d audit saw on /api/plans
  assert.equal(westernNumerals("١٥ منتجاً و٣ أقسام"), "15 منتجاً و3 أقسام");
  assert.equal(westernNumerals("١٠٠ طلب شهرياً"), "100 طلب شهرياً");
  assert.equal(westernNumerals("١٠٠٠ طلب شهرياً"), "1000 طلب شهرياً");
  assert.equal(westernNumerals("١٠٠٠٠ طلب شهرياً"), "10000 طلب شهرياً");
  assert.equal(westernNumerals("١٠٠ منتج وأقسام غير محدودة"), "100 منتج وأقسام غير محدودة");
  assert.equal(westernNumerals("حسابات فريق (٣ أعضاء)"), "حسابات فريق (3 أعضاء)");
});

test("westernNumerals: display-safe — non-digit text is untouched", () => {
  // Western rows pass through byte-identical (idempotent on fixed data)
  assert.equal(westernNumerals("15 منتجاً و3 أقسام"), "15 منتجاً و3 أقسام");
  assert.equal(westernNumerals("كل ميزات الأساسي"), "كل ميزات الأساسي");
  // the ٫ decimal separator, ٪ percent sign and harakat are NOT digits
  assert.equal(westernNumerals("برتقال طبيعي ١٠٠٪"), "برتقال طبيعي 100٪");
  assert.equal(westernNumerals("مرفوض: ٣٫٥٠"), "مرفوض: 3٫50");
});
