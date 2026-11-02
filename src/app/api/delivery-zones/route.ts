import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError, readJson, ApiFailError } from "@/lib/api";
import { zoneCapFor, zoneCapMessage } from "@/lib/plan-resource-caps";
import { parseLyd } from "@/lib/money";

export const runtime = "nodejs";

/* ── P42 (plan-truth §1) — the business's CURRENT plan ──
 *
 * The staff/products routes' currentPlan twin, verbatim (see the
 * categories route's copy for the full contract): a paid plan past its
 * window falls back to Free, and a null planId resolves to the Free
 * plan ROW — the enforced plan is the ONLY plan the cap map reads. */
type PlanCaps = { name: string; nameAr: string; maxProducts: number; maxOrders: number };

async function currentPlan(tx: Prisma.TransactionClient, businessId: string): Promise<PlanCaps> {
  const biz = await tx.business.findUnique({
    where: { id: businessId },
    select: {
      subscriptionEnds: true,
      plan: { select: { name: true, nameAr: true, maxProducts: true, maxOrders: true } },
    },
  });
  const expired = !!biz?.subscriptionEnds && biz.subscriptionEnds.getTime() <= Date.now();
  if (biz?.plan && !expired) return biz.plan;
  const free = await tx.plan.findFirst({
    where: { name: "Free" },
    select: { name: true, nameAr: true, maxProducts: true, maxOrders: true },
  });
  return free ?? { name: "Free", nameAr: "مجاني", maxProducts: 15, maxOrders: 100 };
}

const createSchema = z.object({
  businessId: z.string().optional(),
  name: z.string().trim().min(1, "أدخل اسم المنطقة").max(60),
  fee: z.union([z.string(), z.number()]).transform((v) => {
    const m = parseLyd(v);
    if (m < 0 || m > 500_000) throw new Error("رسوم التوصيل غير صحيحة");
    return m;
  }),
  minOrder: z.union([z.string(), z.number()]).optional().transform((v) => {
    if (v === undefined || v === null || v === "") return 0;
    const m = parseLyd(v);
    if (m < 0 || m > 999_999_000) throw new Error("الحد الأدنى غير صحيح");
    return m;
  }),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "delivery.manage");
    const zones = await db.deliveryZone.findMany({
      where: { businessId: member.businessId },
      orderBy: { sortOrder: "asc" },
    });
    /* W2-ORD-5 (P42-W3): سقف المناطق مع القائمة — نفس مصدر الحقيقة الذي
     * يرفض الـPOST (currentPlan + zoneCapFor، ونفس أساس العدّ: كل صفوف
     * المنطقة) يُقرأ هنا أيضًا، فترى الواجهة العداد الصادق (الحالي/
     * الأقصى) ودعوة الترقية قبل نموذج تُرفض إضافته عند الإرسال — عائلة
     * عدّاد مقاعد الفريق (W2-ORD-4)، البوابة لم تتغيّر. */
    const plan = await currentPlan(db, member.businessId);
    const cap = zoneCapFor(plan.name);
    return ok({
      zones,
      caps: {
        current: zones.length,
        max: cap,
        planNameAr: plan.nameAr,
        /** false = بلغت الباقة حدّها — نفس مقارنة بوابة الـPOST معكوسة. */
        canCreate: zones.length < cap,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "delivery.manage");

    /* P42 (plan-truth §1): the Free card sells «منطقة توصيل واحدة» and
     * Basic sells «مناطق توصيل متعددة» — the gate that lived here was a
     * GLOBAL 40 no card ever promised (a Free business could stack 39
     * zones past its promise). The cap is now the plan's OWN
     * (lib/plan-resource-caps — Free 1 / paid 200, the staff route's
     * TEAM_SEATS_BY_PLAN pattern, NO schema change), and the count runs
     * INSIDE the create transaction behind the business-row lock (the
     * W3-F portable guard — the categories/products/staff gate
     * doctrine). Rejections answer 409 PLAN_LIMIT with the family's cap
     * copy (the products-route wording, the plan's own number). */
    const zone = await db.$transaction(async (tx) => {
      await tx.business.update({ where: { id: member.businessId }, data: { updatedAt: new Date() } });
      const plan = await currentPlan(tx, member.businessId);
      const cap = zoneCapFor(plan.name);
      const count = await tx.deliveryZone.count({ where: { businessId: member.businessId } });
      if (count >= cap) {
        throw new ApiFailError(zoneCapMessage(cap), 409, "PLAN_LIMIT");
      }
      return tx.deliveryZone.create({
        data: {
          businessId: member.businessId,
          name: input.name,
          fee: input.fee,
          minOrder: input.minOrder,
          sortOrder: count,
        },
      });
    });
    return ok({ zone }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
