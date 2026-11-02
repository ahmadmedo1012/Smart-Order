// P42 — GUARD: حدود الباقات تُرسم حرفياً — لا عدّ تصاعدي على أرقام العقد.
//
// THE STORY (B9 retirement, Smart-Order side): /pricing's two limit rows
// («المنتجات» / «الطلبات الشهرية») rode <CountUp> — the animation ramped
// 0→N over ~1.1s, so the first frame after hydration rendered «0» and
// «حتى 0» and the ramp frames showed false intermediate entitlements. The
// SSR HTML was always correct; the flash lived in the post-hydration
// animation (exactly the Smart-Menu Wave-1 root cause — CountUp's own
// contract scopes it to marketing/hero use, never contractual numbers).
//
// This is the cheapest permanent guard: a source scan (same pattern as
// client-only-display.test.ts) asserting that NO component under the
// pricing surfaces imports or renders CountUp. The hero roadmarks
// (marketing stats, not entitlements) keep their CountUp by design.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const SURFACES = [
  join(ROOT, "src", "components", "pricing"),
  join(ROOT, "src", "app", "pricing"),
  join(ROOT, "src", "components", "register"),
];

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(entry)) out.push(p);
  }
  return out;
}

test("أسطح التسعير والتسجيل خالية من CountUp — أرقام العقد تُرسم فوراً", () => {
  const offenders: string[] = [];
  for (const surface of SURFACES) {
    for (const file of walk(surface)) {
      const text = readFileSync(file, "utf8");
      if (/<CountUp\b/.test(text) || /import\s*\{[^}]*CountUp[^}]*\}/.test(text)) {
        offenders.push(file);
      }
    }
  }
  assert.deepEqual(
    offenders,
    [],
    `ملفات التسعير تستخدم CountUp — أرقام حدود الباقات تُرسم حرفياً وفوراً (وميح «حتى 0» على الإطار الأول خرق عقدي):\n${offenders.join("\n")}`,
  );
});
