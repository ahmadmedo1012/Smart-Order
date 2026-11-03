// P43 SO-1 — order aging (عمر الطلب): how long has an active order been
// sitting in its lane? The live board's ONLY clock-derived signal, kept
// pure (millimes-style discipline: numbers in, bucket out) so node --test
// pins the thresholds without a browser.
//
// Thresholds (the mission's ops contract): <10m neutral («fresh»), 10–20m
// amber («warning»), >20m red («urgent»). A kitchen board that turns red
// after 20 minutes matches the Libyan food-ops reality — a «جديد» order
// still sitting after 20 minutes needs a human, not a prettier card.
//
// Clock law (the family's hydration-drift doctrine): ages are computed
// CLIENT-SIDE from the server's createdAt (an absolute instant) and the
// visitor's clock — SSR never paints clock text, the tick re-renders every
// 30s, and a hidden tab pays nothing (the board's poll gate already
// freezes on visibilitychange; the tick rides the same gate).

/** The tick cadence for client-side age re-computation (30s — coarse
 *  enough for minutes-precision aging, cheap enough for an always-open
 *  ops tab). */
export const AGING_TICK_MS = 30_000;

/** Bucket boundaries in whole minutes (inclusive-start semantics). */
export const AGING_THRESHOLDS = {
  /** Below this many minutes: neutral ink. */
  warning: 10,
  /** At/above this many minutes: red ink. */
  urgent: 20,
} as const;

export type AgingBucket = "fresh" | "warning" | "urgent";

/** Whole minutes elapsed between two instants (floor; negative inputs —
 *  a server clock slightly ahead — clamp to 0, never a negative age). */
export function agingMinutes(createdAt: number | Date | string, now: number | Date): number {
  const created = createdAt instanceof Date ? createdAt.getTime() : typeof createdAt === "string" ? Date.parse(createdAt) : createdAt;
  const current = now instanceof Date ? now.getTime() : now;
  return Math.max(0, Math.floor((current - created) / 60_000));
}

/** The bucket: <10 fresh · 10–19 warning · ≥20 urgent. */
export function agingBucket(minutes: number): AgingBucket {
  if (minutes >= AGING_THRESHOLDS.urgent) return "urgent";
  if (minutes >= AGING_THRESHOLDS.warning) return "warning";
  return "fresh";
}

/** bucket(minutes) in one step — the board's render helper. */
export function agingOf(createdAt: number | Date | string, now: number | Date): { minutes: number; bucket: AgingBucket } {
  const minutes = agingMinutes(createdAt, now);
  return { minutes, bucket: agingBucket(minutes) };
}
