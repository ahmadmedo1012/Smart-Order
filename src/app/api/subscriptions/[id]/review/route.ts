import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { ok, fail, handleError, readJson, ApiFailError } from "@/lib/api";
import { requireAuth } from "@/lib/auth";
import { isRetryableTxError } from "@/lib/prisma-errors";

export const runtime = "nodejs";

const schema = z.object({
  action: z.enum(["APPROVE", "REJECT"]),
  note: z.string().max(300).optional(),
});

/**
 * POST /api/subscriptions/[id]/review — platform-admin approval flow
 * (family twin of the Smart Menu admin subscription approvals). On APPROVE:
 * the business is upgraded to the plan with subscriptionEnds = now + period.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (!user.isPlatformAdmin) return fail("غير مصرح — أدمن المنصة فقط", 403);

    const input = schema.parse(await readJson(req));
    const payment = await db.subscriptionPayment.findUnique({ where: { id } });
    if (!payment) return fail("طلب الدفع غير موجود", 404);
    if (payment.status !== "PENDING") return fail("تمت مراجعة هذا الطلب مسبقاً", 409);

    /* W4-E1 (P21-W4-E): the CAS below closed the double-apply, but the e2e
       raced-approval battery (three reviews in flight on one PENDING
       payment) caught a residual convoy failure on the SQLite twin:
       3+ interleaved read→write transactions make the rollback journal
       starve one contender past the socket timeout — it escaped as a
       raw 500 (P1008 "Socket timeout" / the collateral P2028) after a
       ~5s stall, exactly the failure family this route was closing.
       The money path's own recipe (r134 W2-#6): ONE retry of the whole
       idempotent-by-CAS operation; a second conflict surfaces the
       family retry copy. Retrying is safe because the attempt either
       committed nothing (atomic abort) or lost the CAS race (→ 409).
       W5-C4 (W5-A4 P3): the retry now waits a small RANDOMIZED delay
       (25–75ms) first — the one observed battery flake (statuses
       [503,503,503]: zero winners) was three contenders re-colliding
       in lockstep the instant their rollback journals released; the
       jitter de-synchronizes the convoy so a fresh SQLite attempt
       actually wins the lock. Semantics unchanged: still ONE retry,
       same error copy, the CAS still pins one application. */
    const withTxRetry = async <T,>(op: () => Promise<T>): Promise<T> => {
      try {
        return await op();
      } catch (err) {
        if (!isRetryableTxError(err)) throw err;
        await new Promise((resolve) => setTimeout(resolve, 25 + Math.random() * 50));
        try {
          return await op();
        } catch (retryErr) {
          if (isRetryableTxError(retryErr)) {
            throw new ApiFailError("تعذّر تنفيذ المراجعة، حاول مرة أخرى", 503, "WRITE_CONFLICT");
          }
          throw retryErr;
        }
      }
    };

    if (input.action === "APPROVE") {
      const plan = await db.plan.findUnique({ where: { id: payment.planId } });
      const ends =
        plan && plan.periodDays > 0 ? new Date(Date.now() + plan.periodDays * 24 * 60 * 60 * 1000) : null;

      /* W3-F (P21-W3-F): the PENDING pre-check above is a read-then-write
         window — two platform admins reviewing the same payment
         concurrently both passed it and both approvals applied (the
         business row written twice, one payment silently double-applied).
         The write is now CONDITIONAL on the snapshot still holding
         (status: "PENDING" in the updateMany where clause — the orders
         PATCH CAS recipe), and the business upgrade rides the SAME
         transaction so the plan change and the approval stamp commit
         atomically. The loser gets the same "already reviewed" copy the
         pre-check serves. */
      const result = await withTxRetry(() =>
        db.$transaction(async (tx) => {
          const cas = await tx.subscriptionPayment.updateMany({
            where: { id, status: "PENDING" },
            data: {
              status: "APPROVED",
              reviewedById: user.id,
              reviewNote: input.note || null,
              reviewedAt: new Date(),
            },
          });
          if (cas.count !== 1) {
            throw new ApiFailError("تمت مراجعة هذا الطلب مسبقاً", 409, "ALREADY_REVIEWED");
          }
          if (payment.businessId) {
            await tx.business.update({
              where: { id: payment.businessId },
              data: { planId: payment.planId, subscriptionEnds: ends },
            });
          }
          return { status: "APPROVED" as const };
        }),
      );

      return ok(result);
    }

    /* W3-F: same CAS for the reject branch — the plain update could
       overwrite a concurrent APPROVE (a rejection stamping over an
       approved payment that already upgraded the business).
       W4-E1: the same one-retry guard (a lone conditional update can hit
       the identical convoy casualty under a raced rejection). */
    const casReject = await withTxRetry(() =>
      db.subscriptionPayment.updateMany({
        where: { id, status: "PENDING" },
        data: {
          status: "REJECTED",
          reviewedById: user.id,
          reviewNote: input.note || null,
          reviewedAt: new Date(),
        },
      }),
    );
    if (casReject.count !== 1) {
      return fail("تمت مراجعة هذا الطلب مسبقاً", 409, "ALREADY_REVIEWED");
    }
    return ok({ status: "REJECTED" });
  } catch (err) {
    return handleError(err);
  }
}
