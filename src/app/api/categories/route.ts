import { NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError, readJson, ApiFailError } from "@/lib/api";
import { categoryCapFor, categoryCapMessage } from "@/lib/plan-resource-caps";

export const runtime = "nodejs";

/* ── P42 (plan-truth §1) — the business's CURRENT plan ──
 *
 * The staff/products routes' currentPlan twin, verbatim: `business.planId`
 * is written by the platform-admin subscription approval
 * (/api/subscriptions/[id]/review), `subscriptionEnds` is that approval's
 * expiry — a paid plan past its window falls back to Free («يظل متجرك
 * نشطاً حتى نهاية الفترة المدفوعة»), and a null planId (the register
 * flow writes none) resolves to the Free plan ROW. The literal tail only
 * covers a cold, never-seeded plans table — it fails closed. */
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
  name: z.string().trim().min(1, "أدخل اسم القسم").max(60),
  description: z.string().trim().max(200).optional().default(""),
  imageUrl: z.string().trim().max(300).optional().default(""),
});

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const member = await requireBusiness(user, url.searchParams.get("businessId"));
    requirePermission(member, "products.read");
    const categories = await db.category.findMany({
      where: { businessId: member.businessId, isArchived: false },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: { _count: { select: { products: { where: { isArchived: false } } } } },
    });
    return ok({ categories });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const input = createSchema.parse(await readJson(req));
    const member = await requireBusiness(user, input.businessId);
    requirePermission(member, "categories.manage");

    /* P42 (plan-truth §1): the Free card sells «3 أقسام» and Basic sells
     * «أقسام غير محدودة» — the gate that lived here was a GLOBAL 50 no card
     * ever promised (a Free business could stack 47 past its promise).
     * The cap is now the plan's OWN (lib/plan-resource-caps — the staff
     * route's TEAM_SEATS_BY_PLAN pattern: name-keyed map + currentPlan
     * resolution, NO schema change), and the count runs INSIDE the create
     * transaction behind the business-row lock — the W3-F portable guard
     * every count gate in this repo rides (products/staff doctrine): the
     * X lock held to commit makes the twin re-count after the first
     * commits and the gate fires. Rejections answer 409 PLAN_LIMIT with
     * the family's cap copy (the products-route wording, the plan's own
     * number in the message). */
    const category = await db.$transaction(async (tx) => {
      await tx.business.update({ where: { id: member.businessId }, data: { updatedAt: new Date() } });
      const plan = await currentPlan(tx, member.businessId);
      const cap = categoryCapFor(plan.name);
      const count = await tx.category.count({ where: { businessId: member.businessId, isArchived: false } });
      if (count >= cap) {
        throw new ApiFailError(categoryCapMessage(cap), 409, "PLAN_LIMIT");
      }
      return tx.category.create({
        data: {
          businessId: member.businessId,
          name: input.name,
          description: input.description || null,
          imageUrl: input.imageUrl || null,
          sortOrder: count,
        },
      });
    });
    return ok({ category }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
