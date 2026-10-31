/**
 * P38 (Phase F) — Server-originated push notifications (Expo push service).
 *
 * Architecture (the documented-credential path the P38 directive
 * authorizes): the full pipeline — token registry, permission-scoped
 * fan-out, safe payloads, invalid-token cleanup, QA isolation — is
 * credential-independent and testable (the pure halves live in
 * push-core.ts, pinned by tests/unit/push.test.ts). DELIVERY
 * additionally requires FCM v1 (Android) + APNs (iOS) credentials
 * configured on the EAS project (expo.dev → project → Credentials →
 * Push Notifications): those are the exact external blockers; until
 * they exist the Expo push service answers with per-ticket errors
 * which we count + log, never failing the caller.
 *
 * Fail-safe law: a push failure must NEVER break or delay the business
 * operation that produced the event (order creation). Every entry
 * point is fire-and-forget with an internal try/catch.
 */
import { db } from "./db";
import {
  buildPushMessage,
  chunkTokens,
  reduceTickets,
  EXPO_PUSH_ENDPOINT,
  type PushEvent,
} from "./push-core";

export { buildPushMessage } from "./push-core";
export type { PushEvent } from "./push-core";

/** Members whose devices may hear about a business's orders — the
 * server-authoritative permission check (orders.read), same gate the
 * order inbox uses. Hiding a button is not security; this is. */
export async function businessPushTokens(businessId: string): Promise<string[]> {
  const members = await db.businessMember.findMany({
    where: { businessId, user: { pushTokens: { some: { revokedAt: null } } } },
    select: {
      role: true,
      extraPerms: true,
      user: { select: { pushTokens: { where: { revokedAt: null }, select: { token: true } } } },
    },
  });
  const tokens: string[] = [];
  for (const m of members) {
    const perms = memberPerms(m.role, m.extraPerms);
    if (!perms.includes("orders.read")) continue;
    for (const t of m.user.pushTokens) tokens.push(t.token);
  }
  return [...new Set(tokens)];
}

function memberPerms(role: string, extraPerms: string): string[] {
  const ROLE: Record<string, string[]> = {
    OWNER: ["orders.read", "orders.update", "orders.cancel"],
    ADMIN: ["orders.read", "orders.update", "orders.cancel", "products.read", "products.manage"],
    STAFF: ["orders.read"],
  };
  return [...(ROLE[role] ?? []), ...extraPerms.split(",").map((p) => p.trim()).filter(Boolean)];
}

/** Send to the Expo push service in batches. Returns per-ticket results.
 * Never throws — delivery problems are reported, not raised. */
export async function deliverPush(
  tokens: string[],
  message: { title: string; body: string; data: Record<string, string> },
): Promise<{ sent: number; failed: number; revoked: number }> {
  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];
  for (const batch of chunkTokens(tokens)) {
    try {
      const res = await fetch(EXPO_PUSH_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(batch.map((to) => ({ to, title: message.title, body: message.body, data: message.data, sound: "default" }))),
      });
      const body = (await res.json().catch(() => null)) as { data?: import("./push-core").ExpoPushTicket[] } | null;
      const tickets = body?.data ?? [];
      const r = reduceTickets(batch, tickets);
      sent += r.sent;
      failed += r.failed;
      deadTokens.push(...r.deadTokens);
    } catch {
      // Network/transport failure — count the batch as failed; tokens
      // stay (they may be perfectly valid).
      failed += batch.length;
    }
  }
  if (deadTokens.length > 0) {
    try {
      await db.pushToken.updateMany({ where: { token: { in: deadTokens } }, data: { revokedAt: new Date() } });
    } catch {
      /* cleanup is best-effort */
    }
  }
  return { sent, failed, revoked: deadTokens.length };
}

/** Fire-and-forget: notify a business's order-visible members. The
 * event-producing call NEVER awaits or sees errors from here. */
export function notifyBusinessOrderEvent(event: PushEvent): void {
  void (async () => {
    try {
      const tokens = await businessPushTokens(event.businessId);
      if (tokens.length === 0) return;
      const message = buildPushMessage(event);
      const result = await deliverPush(tokens, message);
      if (result.failed > 0) {
        console.warn(
          `[push] ${event.kind} → ${tokens.length} token(s): sent=${result.sent} failed=${result.failed} revoked=${result.revoked}` +
            ` — delivery requires FCM v1 (Android) + APNs (iOS) credentials on the EAS project (documented P38 blocker)`,
        );
      }
    } catch {
      /* never surface */
    }
  })();
}
