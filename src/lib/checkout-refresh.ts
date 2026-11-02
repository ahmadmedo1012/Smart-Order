// W2-ORD-2 (P42-W3، تدقيق 3c) — تقييم السلة ضد أسعار المتجر الحيّة.
//
// الفجوة المسجلة: صفحة إتمام الطلب كانت تعرض تقديرات السلة من لحظة
// الإضافة (unitPrice المخزّنة في localStorage — قد تعود لأيام)، بينما
// الخادم يعيد التسعير بالكامل عند POST (أمان المال سليم — عائلة P38).
// النتيجة: الزبون يقرّ إجماليًا على الشاشة ثم يهبط الطلب بإجمالي آخر.
//
// الحل: نقطة النهاية /api/public/store/[slug] تُعيد المنتجات بأسعارها
// الحالية أصلًا في نفس الاستجابة (كانت الصفحة تهدرها) — هذا التقييم
// النقي يحسب السعر الحالي لكل سطر (نفس منطق إعادة التسعير الخادمي:
// الأساس + فارق الصيغة + فوارق الإضافات)، فيعرض الإجمالي الحقيقي عند
// لحظة التأكيد، مع وسم السطور التي تغيّر سعرها وتلك التي صارت غير
// متاحة (منتج حُذف/أُخفي/صيغة أُوقفت) — والأخيرة تمنع الإرسال.
//
// نقي عمدًا (عائلة plan-resource-caps): بلا استيراد أي شيء — node --test
// يقرأه حرفيًا، ومكوّنات العميل لا تسحب قاعدة البيانات إلى حزمتها.

export interface RefreshProduct {
  id: string;
  price: number;
  isAvailable: boolean;
  variants: Array<{ id: string; priceDelta: number }>;
  optionGroups: Array<{ options: Array<{ id: string; priceDelta: number }> }>;
}

export interface RefreshCartItem {
  key: string;
  productId: string;
  variantId: string | null;
  /** ids فقط — المطابقة بالهوية لا بالاسم (الأسماء تُعرض وتُترجم). */
  optionIds: string[];
  quantity: number;
  /** التقدير المخزّن لحظة الإضافة — يُقارن لا يُستخدم للتسعير. */
  staleUnitPrice: number;
}

export interface RefreshLine {
  key: string;
  unavailable: boolean;
  priceChanged: boolean;
  /** السعر الحالي من بيانات المتجر (0 للسطر غير المتاح — لا يُعرض). */
  currentUnitPrice: number;
}

export interface CartEvaluation {
  lines: RefreshLine[];
  /** إجمالي الأسطر المتاحة بالأسعار الحالية (الصادق عند التأكيد). */
  currentSubtotal: number;
  hasUnavailable: boolean;
  hasPriceChanges: boolean;
}

/**
 * تقييم سلة ضد منتجات المتجر الحيّة. سطر «غير متاح» = المنتج محذوف أو
 * مخفي، أو صيغته/إضافة منه لم تعد موجودة — سعره يسقط من الإجمالي ولا
 * يُسمح بإرساله (الخادم كان سيرفضه أصلًا؛ الآن يعرف الزبون السبب قبل
 * الضغط). «تغيّر السعر» = الفارق بين التقدير القديم والحالي (وسم صدقٍ
 * على السطر، لا منعًا — السعر الحالي هو العقد).
 */
export function evaluateCartAgainstProducts(
  items: RefreshCartItem[],
  products: RefreshProduct[],
): CartEvaluation {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: RefreshLine[] = [];
  let currentSubtotal = 0;
  let hasUnavailable = false;
  let hasPriceChanges = false;

  for (const item of items) {
    const product = byId.get(item.productId);
    let unavailable = !product || !product.isAvailable;
    let currentUnitPrice = 0;

    if (product && product.isAvailable) {
      currentUnitPrice = product.price;
      if (item.variantId) {
        const variant = product.variants.find((v) => v.id === item.variantId);
        if (!variant) {
          unavailable = true;
        } else {
          currentUnitPrice += variant.priceDelta;
        }
      }
      if (!unavailable) {
        for (const optionId of item.optionIds) {
          // الإضافة تُطابق عبر كل المجموعات (الخادم يحوّلها مجموعة→خيارات
          // بنفس الهوية عند التسعير — عقد المطابقة واحد).
          const option = product.optionGroups
            .flatMap((g) => g.options)
            .find((o) => o.id === optionId);
          if (!option) {
            unavailable = true;
            break;
          }
          currentUnitPrice += option.priceDelta;
        }
      }
    }

    if (unavailable) hasUnavailable = true;
    else if (currentUnitPrice !== item.staleUnitPrice) hasPriceChanges = true;

    // الإجمالي يحتسب المتاح فقط وبالكمية — السطر الممنوع لا يدخل مال الزبون.
    if (!unavailable) currentSubtotal += currentUnitPrice * item.quantity;

    lines.push({
      key: item.key,
      unavailable,
      priceChanged: !unavailable && currentUnitPrice !== item.staleUnitPrice,
      currentUnitPrice: unavailable ? 0 : currentUnitPrice,
    });
  }

  return { lines, currentSubtotal, hasUnavailable, hasPriceChanges };
}
