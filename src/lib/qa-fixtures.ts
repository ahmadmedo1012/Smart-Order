/* QA-fixture name markers — P30-B (§4 route inventory / §7 data truth).
 *
 * WHAT HAPPENED: production's sitemap carried 7 QA-fixture stores
 * («مخبز الاختبار أ» + suffixed -2…-7) and the landing roadmark board
 * counted them («+9 متجر على الطريق» = 7 fixtures + demo + 1 real) —
 * e2e/api-e2e.js registers exactly these names through the PUBLIC
 * register API, and at some era a run was pointed at production,
 * leaving published residue in the real database.
 *
 * THE GATE (the Smart-Menu r96/P29-D1 doctrine, adapted): the fixtures
 * are DYNAMIC slugs (-2, -3… grow with every run) so a slug list can't
 * hold them — but their names are the battery's own self-declaring
 * literals («الاختبار» = "the test"). A business whose name starts
 * with one of these markers is QA residue, never a merchant: it stays
 * out of every public discovery/counting surface (sitemap, landing
 * counters) while its storefront route keeps working (exclusion = no
 * crawl budget, never a broken link).
 *
 * TRADE-OFF (documented, deliberate): a real merchant who deliberately
 * names their store «مخبز الاختبار…» would also be excluded from the
 * sitemap/counters. The name says "test" in it — the platform's
 * honesty surfaces may not present it as a store on the road. The
 * storefront itself is unaffected.
 *
 * The ROOT seam (future residue): tests/e2e/api-e2e.js now refuses
 * non-local BASE targets (P30-B) — the battery can never again be
 * pointed at production. */

export const QA_FIXTURE_NAME_MARKERS = [
  "مخبز الاختبار", // e2e registerBiz(A, "مخبز الاختبار أ")
  "متجر الاختبار", // e2e registerBiz(B, "متجر الاختبار ب")
];

/** True when a business name is the e2e battery's own fixture literal
 *  (incl. its suffixed re-runs, which keep the marker prefix). */
export function isQaFixtureBusinessName(
  name: string | null | undefined,
): boolean {
  if (!name) return false;
  return QA_FIXTURE_NAME_MARKERS.some((m) => name.startsWith(m));
}

/** Prisma where-fragment: excludes QA-fixture businesses from a
 *  Business query (or a relation-filtered query on another model —
 *  e.g. orders whose business is a fixture). Spread into `where`.
 *
 *  Logic note (fail-pre-fix by construction — the behavioral test in
 *  tests/unit/landing-stats.test.ts caught the first draft): the
 *  exclusion is NOT(OR startsWith markers) — an OR of negations
 *  excludes nothing (every name fails to start with at least one
 *  marker). */
export const notQaFixtureBusiness = {
  NOT: {
    OR: QA_FIXTURE_NAME_MARKERS.map((m) => ({ name: { startsWith: m } })),
  },
};
