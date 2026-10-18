// W6-B7 (W6-A5 priority #3 — the COD-confirmation loop): the customer's
// one-tap «أؤكد طلبي» on /track/[token]. Public order tracking was
// read-only apart from order creation; the entire MENA COD pattern
// (eGrow, Whapi/WhatFlow/EasySell — a whole Shopify app category) is a
// one-tap customer confirmation on the tracking surface, reporting
// RTO −30–40%. This is the token-scoped, once-only, rate-limited write
// that closes the loop.
//
// SEMANTICS (deliberate):
// · This is NOT a payment state and NOT a status transition — it writes
//   ONLY Order.customerConfirmedAt (a separate nullable timestamp). The
//   owner's «تأكيد الطلب» (NEW→CONFIRMED) stays a human decision; the
//   customer's tap is an intent signal, visible to the owner as the
//   «مؤكد من العميل» badge + a history row (the payment-confirmations
//   row shape: toStatus = current status, note carries the ink).
// · Once-only: the stamp is written via CAS updateMany WHERE
//   customerConfirmedAt IS NULL — exactly one concurrent tap can ever
//   win (the orders-PATCH CAS recipe). A repeat tap is IDEMPOTENT
//   success: it returns the SAME confirmedAt + already:true, never a
//   second stamp and never an error a customer could read as failure.
// · Terminal orders (DELIVERED/CANCELLED/REJECTED — canCustomerConfirm)
//   are blocked with the family's honest terminal grammar (409), not a
//   silent success that would fake intent.
//
// ABUSE SURFACE (mirrors the sibling route family):
// · dbRateLimit 10/10min per IP on the track-confirm key — the SAME
//   budget the track-lookup route uses (the family's public-auth
//   budget, DB-backed across instances — lib/rate-limit.ts).
// · Token shape is validated BEFORE the DB round trip (the GET route's
//   exact /^[0-9a-f-]{16,64}$/i gate — publicToken is a UUID, so this
//   is a cheap 400).
// · Honesty, no enumeration: an unknown token answers the SAME
//   «لا يوجد طلب بهذه البيانات» 404 the lookup route answers — no
//   field-level hints, no PII. The response carries ONLY
//   { confirmedAt, already } — no name, phone, or totals.
// · No body is read: the token IS the credential (unguessable, scoped
//   to one order); nothing else can be supplied or leaked.

import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { dbRateLimit, clientIp } from "@/lib/rate-limit";
import { canCustomerConfirm, CUSTOMER_CONFIRM_HISTORY_NOTE } from "@/lib/order-machine";
import type { OrderStatus } from "@/lib/constants";

export const runtime = "nodejs";

/* The GET route's token gate, verbatim — publicToken is a randomUUID, so
 * the shape test is a cheap rejection that keeps garbage out of the DB. */
const TOKEN_RE = /^[0-9a-f-]{16,64}$/i;

export async function POST(_req: NextRequest, ctx: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await ctx.params;
    if (!TOKEN_RE.test(token)) return fail("رابط التتبع غير صحيح", 400);

    /* Same budget as the lookup surface (10 per 10 min per IP, DB-backed
       so warm instances cannot multiply it). */
    const ip = clientIp(_req);
    const rl = await dbRateLimit(`track-confirm:${ip}`, 10, 10 * 60 * 1000);
    if (!rl.ok) {
      return fail("محاولات كثيرة جداً في وقت قصير، انتظر قليلاً", 429, undefined, {
        "retry-after": String(rl.retryAfterSec),
      });
    }

    /* ONCE-ONLY CAS (the orders-PATCH updateMany recipe): the write is
       conditional on the stamp being NULL and the order being
       non-terminal — whatever raced between the write and the read below,
       exactly one customer tap can ever own the timestamp. */
    const confirmedAt = new Date();
    const cas = await db.$transaction(async (tx) => {
      const won = await tx.order.updateMany({
        where: {
          publicToken: token,
          customerConfirmedAt: null,
          status: { notIn: ["DELIVERED", "CANCELLED", "REJECTED"] },
        },
        data: { customerConfirmedAt: confirmedAt },
      });
      if (won.count !== 1) return { won: false as const };

      /* The owner-visible trail: a non-transition history row (the
         payment-confirmation row shape — fromStatus null, toStatus = the
         CURRENT status) carrying the customer-confirmation ink. The public
         track GET never ships notes (privacy contract), so this row is
         owner-only. */
      const order = await tx.order.findUnique({
        where: { publicToken: token },
        select: { id: true, status: true },
      });
      if (!order) return { won: false as const }; // unreachable (CAS matched), kept honest
      await tx.orderStatusHistory.create({
        data: {
          orderId: order.id,
          fromStatus: null,
          toStatus: order.status,
          note: CUSTOMER_CONFIRM_HISTORY_NOTE,
          changedById: null,
          changedByName: "العميل",
        },
      });
      return { won: true as const };
    });

    if (cas.won) {
      return ok({ confirmedAt: confirmedAt.toISOString(), already: false });
    }

    /* CAS lost → exactly one of: unknown token, already confirmed, or
       terminal. Re-read (one indexed round trip) and answer honestly —
       without PII and without forked copies that could leak which. */
    const order = await db.order.findUnique({
      where: { publicToken: token },
      select: { status: true, customerConfirmedAt: true },
    });
    if (!order) return fail("لا يوجد طلب بهذه البيانات", 404, "NOT_FOUND");
    if (order.customerConfirmedAt) {
      /* idempotent repeat — the SAME stamp, already flagged (the UI never
         shows a second tap as an error). */
      return ok({ confirmedAt: order.customerConfirmedAt.toISOString(), already: true });
    }
    if (!canCustomerConfirm(order.status as OrderStatus)) {
      return fail("لا يمكن تأكيد طلب منتهٍ", 409, "INVALID_STATE");
    }
    /* Non-terminal, unconfirmed, CAS still lost: a concurrent writer holds
       the row — treat as the conflict it is, safe to retry. */
    return fail("تعذّر تأكيد الطلب الآن، حاول مرة أخرى", 409, "INVALID_STATE");
  } catch (err) {
    return handleError(err);
  }
}
