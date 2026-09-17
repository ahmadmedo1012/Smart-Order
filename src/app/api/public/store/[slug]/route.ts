import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { ok, fail, handleError } from "@/lib/api";
import { normalizeArabic } from "@/lib/arabic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface StorefrontData {
  business: {
    id: string;
    slug: string;
    name: string;
    description: string | null;
    logoUrl: string | null;
    coverUrl: string | null;
    city: string | null;
    phone: string | null;
    whatsappNumber: string | null;
    address: string | null;
    receiptFooter: string | null;
  };
  categories: Array<{ id: string; name: string; description: string | null; imageUrl: string | null; sortOrder: number }>;
  products: Array<{
    id: string;
    categoryId: string | null;
    name: string;
    description: string | null;
    imageUrl: string | null;
    price: number;
    isAvailable: boolean;
    isFeatured: boolean;
    variants: Array<{ id: string; name: string; priceDelta: number }>;
    optionGroups: Array<{
      id: string;
      name: string;
      minSelect: number;
      maxSelect: number;
      required: boolean;
      options: Array<{ id: string; name: string; priceDelta: number }>;
    }>;
  }>;
  deliveryZones: Array<{ id: string; name: string; fee: number; minOrder: number }>;
  paymentMethods: Array<{
    id: string;
    type: string;
    name: string;
    instructions: string | null;
    config: string | null;
  }>;
}

export async function GET(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await ctx.params;
    const business = await db.business.findUnique({
      where: { slug },
      select: {
        id: true, slug: true, name: true, description: true, logoUrl: true, coverUrl: true,
        city: true, phone: true, whatsappNumber: true, address: true, receiptFooter: true,
        isActive: true, isPublished: true,
      },
    });
    if (!business || !business.isActive) return fail("المتجر غير موجود", 404, "NOT_FOUND");
    if (!business.isPublished) return fail("هذا المتجر لم يُنشر بعد", 403, "UNPUBLISHED");

    const { isActive: _a, isPublished: _p, ...publicBusiness } = business;

    const [categories, products, deliveryZones, paymentMethods] = await Promise.all([
      db.category.findMany({
        where: { businessId: business.id, isActive: true, isArchived: false },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, description: true, imageUrl: true, sortOrder: true },
      }),
      db.product.findMany({
        where: { businessId: business.id, isArchived: false },
        orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
        select: {
          id: true, categoryId: true, name: true, description: true, imageUrl: true,
          price: true, isAvailable: true, isFeatured: true,
          variants: {
            where: { isActive: true },
            orderBy: { sortOrder: "asc" },
            select: { id: true, name: true, priceDelta: true },
          },
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            select: {
              id: true, name: true, minSelect: true, maxSelect: true, required: true,
              options: {
                where: { isActive: true },
                orderBy: { sortOrder: "asc" },
                select: { id: true, name: true, priceDelta: true },
              },
            },
          },
        },
      }),
      db.deliveryZone.findMany({
        where: { businessId: business.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, name: true, fee: true, minOrder: true },
      }),
      db.paymentMethod.findMany({
        where: { businessId: business.id, isActive: true },
        orderBy: { sortOrder: "asc" },
        select: { id: true, type: true, name: true, instructions: true, config: true },
      }),
    ]);

    const data: StorefrontData = {
      business: publicBusiness,
      categories,
      products,
      deliveryZones,
      paymentMethods,
    };
    return ok(data, {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    return handleError(err);
  }
}

export async function HEAD(_req: NextRequest, ctx: { params: Promise<{ slug: string }> }) {
  const { slug } = await ctx.params;
  const business = await db.business.findUnique({ where: { slug }, select: { id: true } });
  return new Response(null, { status: business ? 200 : 404 });
}
