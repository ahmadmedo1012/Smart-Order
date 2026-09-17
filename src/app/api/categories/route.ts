import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAuth, requireBusiness, requirePermission } from "@/lib/auth";
import { ok, handleError, readJson } from "@/lib/api";

export const runtime = "nodejs";

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

    const count = await db.category.count({ where: { businessId: member.businessId, isArchived: false } });
    if (count >= 50) return ok({ error_message: "وصلت للحد الأقصى من الأقسام (50)" }, { status: 422 });

    const category = await db.category.create({
      data: {
        businessId: member.businessId,
        name: input.name,
        description: input.description || null,
        imageUrl: input.imageUrl || null,
        sortOrder: count,
      },
    });
    return ok({ category }, { status: 201 });
  } catch (err) {
    return handleError(err);
  }
}
