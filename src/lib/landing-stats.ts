/* Relative imports on purpose (the unit-testable pure-seam convention —
 * tests/unit imports this module through plain node, where the @/ alias
 * does not resolve; see phone.ts / money.ts / the seed-secret pins). */
import { db } from "./db.ts";
import { notQaFixtureBusiness } from "./qa-fixtures.ts";

/* P30-B (§7 data truth): the landing counters left page.tsx for their
 * own seam so they can be behaviorally tested against a real database
 * (tests/unit/landing-stats.test.ts) — the counts are the SAME live
 * DB numbers with one honesty fix: QA-fixture businesses (the e2e
 * battery's own «مخبز الاختبار أ» registrations) no longer inflate
 * them. Family honesty policy: no invented numbers, and no fixture
 * numbers either. */
export async function getLandingStats(): Promise<{
  totalStores: number;
  totalOrders: number;
}> {
  try {
    const [totalStores, totalOrders] = await Promise.all([
      db.business.count({
        where: { isActive: true, isPublished: true, ...notQaFixtureBusiness },
      }),
      db.order.count({ where: { business: notQaFixtureBusiness } }),
    ]);
    return { totalStores, totalOrders };
  } catch {
    return { totalStores: 0, totalOrders: 0 };
  }
}
