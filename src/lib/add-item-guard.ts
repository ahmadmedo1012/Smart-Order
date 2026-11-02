"use client";

// W2-ORD-3 (P42-W3، تدقيق 3c) — حارس السلة عبر المتاجر.
//
// الفجوة المسجلة: مخزن السلة أحادي-المتجر بالفعل (addItem يستبدل سلة
// المتجر الآخر) لكن الاستبدال كان صامتًا — زائر حمل أصنافًا من متجر «أ»
// ثم أضاف في متجر «ب» فتُمحى سلة «أ» بلا سؤال. القرار تدميري (فقدان
// اختيارات الزبون) فيستحق سؤالًا واحدًا صريحًا قبل الوقوع.
//
// الآلية: نفس عرف الأحداث المخصص الموجود في الواجهة («open-cart» يفتح
// درج السلة) — محاولة الإضافة عبر المتاجر تُبث كحدث «cross-store-add»
// يحمله المكوّن الوحيد CrossStoreAddGuard (مركّب في جذر الواجهة) فيعرض
// التأكيد؛ القبول ينفّذ addItem (يستبدل)، والرفض لا يمس شيئًا.
// المضافات داخل نفس المتجر تمر مباشرة كما كانت دائمًا.

import { useCart } from "@/hooks/use-cart";

export const CROSS_STORE_ADD_EVENT = "cross-store-add";

export interface CrossStoreAddDetail {
  slug: string;
  businessName: string;
  item: Omit<ReturnType<typeof useCart.getState>["items"][number], "key">;
}

/**
 * إضافة عنصر بحارس المتاجر: نفس المتجر (أو سلة فارغة) → إضافة فورية
 * وتُعيد true؛ متجر آخر بسلة غير فارغة → تُبث المطالبة للتأكيد وتُعيد
 * false (المكوّن الحارس هو من يُنفّذ عند القبول).
 */
export function addItemWithGuard(slug: string, businessName: string, item: CrossStoreAddDetail["item"]): boolean {
  const { businessSlug, items } = useCart.getState();
  if (businessSlug && businessSlug !== slug && items.length > 0) {
    window.dispatchEvent(
      new CustomEvent<CrossStoreAddDetail>(CROSS_STORE_ADD_EVENT, {
        detail: { slug, businessName, item },
      }),
    );
    return false;
  }
  useCart.getState().addItem(slug, businessName, item);
  return true;
}
