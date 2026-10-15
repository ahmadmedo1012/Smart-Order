// P14 (2-d/3-d) — pins for the plan-features limit fold: the plan card's
// limits block (المنتجات/الطلبات الشهرية) is the single visual carrier of
// maxProducts/maxOrders. Feature bullets that merely restate those two
// numbers fold OUT at display time (foldRestatedLimits in
// src/lib/plan-types.ts) — "one number, one visual block". Mixed bullets
// keep their unique entitlement fragment; every other bullet passes
// through byte-identical. Old DB rows (seeded pre-fold, Arabic-Indic or
// Western) heal at read — the P13-2d T3 westernNumerals precedent.
import { test } from "node:test";
import assert from "node:assert/strict";
import { foldRestatedLimits } from "../../src/lib/plan-types.ts";

const FREE_OLD = [
  "متجر رقمي يعمل فوراً",
  "15 منتجاً و3 أقسام",
  "100 طلب شهرياً",
  "منطقة توصيل واحدة",
  "طرق دفع محلية",
];

test("Free (old pre-P14 row): the 15/100 restatements fold; «3 أقسام» survives", () => {
  assert.deepEqual(foldRestatedLimits(FREE_OLD, 15, 100), [
    "متجر رقمي يعمل فوراً",
    "3 أقسام",
    "منطقة توصيل واحدة",
    "طرق دفع محلية",
  ]);
});

test("Basic (old pre-P14 row): 100/1000 fold; «أقسام غير محدودة» survives", () => {
  const basicOld = [
    "كل ميزات المجانية",
    "100 منتج وأقسام غير محدودة",
    "1000 طلب شهرياً",
    "مناطق توصيل متعددة",
    "تتبع مباشر للعميل",
    "دعم فني عبر واتساب",
  ];
  assert.deepEqual(foldRestatedLimits(basicOld, 100, 1000), [
    "كل ميزات المجانية",
    "أقسام غير محدودة",
    "مناطق توصيل متعددة",
    "تتبع مباشر للعميل",
    "دعم فني عبر واتساب",
  ]);
});

test("Premium (old pre-P14 row): unlimited-products + 10000 restatements fold; team seats survive", () => {
  const premiumOld = [
    "كل ميزات الأساسي",
    "منتجات غير محدودة",
    "10000 طلب شهرياً",
    "حسابات فريق (3 أعضاء)",
    "إشعارات واتساب فورية",
    "تقارير أداء أسبوعية",
    "دعم أولوية",
  ];
  assert.deepEqual(foldRestatedLimits(premiumOld, 9999, 10000), [
    "كل ميزات الأساسي",
    "حسابات فريق (3 أعضاء)",
    "إشعارات واتساب فورية",
    "تقارير أداء أسبوعية",
    "دعم أولوية",
  ]);
});

test("Pro (old pre-P14 row): unlimited-orders restatement folds; «فريق غير محدود» survives", () => {
  const proOld = [
    "كل ميزات بريميوم",
    "طلبات غير محدودة",
    "فريق غير محدود",
    "متاجر متعددة من حساب واحد",
    "إحصاءات متقدمة",
    "مدير حساب مخصص",
  ];
  // maxProducts 9999 → the products side is unlimited too, but Pro's only
  // products restatement would be «منتجات غير محدودة» — it isn't in the row;
  // «فريق غير محدود» is NOT a limits restatement (different entitlement).
  assert.deepEqual(foldRestatedLimits(proOld, 9999, 99999), [
    "كل ميزات بريميوم",
    "فريق غير محدود",
    "متاجر متعددة من حساب واحد",
    "إحصاءات متقدمة",
    "مدير حساب مخصص",
  ]);
});

test("Arabic-Indic pre-r133 rows heal through the same fold", () => {
  assert.deepEqual(
    foldRestatedLimits(["١٥ منتجاً و٣ أقسام", "١٠٠ طلب شهرياً", "طرق دفع محلية"], 15, 100),
    ["3 أقسام", "طرق دفع محلية"],
  );
});

test("display-safe — bullets that are not the card's own limits pass through untouched", () => {
  // «حسابات فريق (3 أعضاء)» carries a 3, but the card's limits are 100/1000
  assert.deepEqual(
    foldRestatedLimits(["حسابات فريق (3 أعضاء)", "150 منتجاً وملحقات"], 100, 1000),
    ["حسابات فريق (3 أعضاء)", "150 منتجاً وملحقات"],
  );
  // «طلبات غير محدودة» on a LIMITED plan is a real claim, not a restatement
  assert.deepEqual(foldRestatedLimits(["طلبات غير محدودة"], 15, 100), ["طلبات غير محدودة"]);
  // empty bullets drop quietly
  assert.deepEqual(foldRestatedLimits(["", "   "], 15, 100), []);
});

test("new P14 seed rows are already clean — the fold is a no-op on them", () => {
  const freeNew = ["متجر رقمي يعمل فوراً", "3 أقسام", "منطقة توصيل واحدة", "طرق دفع محلية"];
  assert.deepEqual(foldRestatedLimits(freeNew, 15, 100), freeNew);
});
