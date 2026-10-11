"use client";

import { useEffect } from "react";
import { useCart } from "@/hooks/use-cart";

/**
 * CartHydrator — r140 (P2-2), توأم Smart-Menu CartHydrator.
 *
 * سلة SO زوالية الالتقاط (skipHydration: true في use-cart.ts) فلا
 * تُقرأ من localStorage إلا هنا، بعد أول طلاء — قبل r140 كانت القراءة
 * تجري تزامنيًا عند إنشاء المخزن قبل أول رسم عميل، فزائر عائد بسلة
 * محفوظة كان يسبب انعدام تطابق ترطيب React 19 على كل ما يعتمد على
 * count (شارة السلة، aria-label، الشريط اللاصق، فرع «سلتك فارغة»
 * في checkout). يُركَّب مرة واحدة في جذر Providers (فوق كل مسارات
 * المتجر وال checkout).
 */
export function CartHydrator() {
  useEffect(() => {
    // لا ندفن إضافات سريعة حدثت أثناء الطلاء (نمط SM): لا نعيد
    // الترطيب إلا إذا كانت السلة في الذاكرة فارغة.
    const current = useCart.getState();
    if (current.items.length === 0) {
      useCart.persist.rehydrate();
    }
    // مزامنة النوافذ: تبويب آخر يعدّل السلة يعيد ترطيب هذا التبويب.
    const onStorage = (e: StorageEvent) => {
      if (e.key === "smart-order-cart" && e.newValue) {
        useCart.persist.rehydrate();
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);
  return null;
}
