"use client";

// W2-ORD-3 — حوار حارس السلة عبر المتاجر (المستهلك الوحيد لحدث
// cross-store-add): سلة متجر آخر غير فارغة + إضافة جديدة هنا = سؤال
// صريح قبل الاستبدال الصامت. توأم لغة product-dialog (Dialog من
// components/ui) لا أدوات لوحة التحكم — سطح الزبون له عائلته.

import * as React from "react";
import { useCart } from "@/hooks/use-cart";
import { CROSS_STORE_ADD_EVENT, type CrossStoreAddDetail } from "@/lib/add-item-guard";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ShoppingBag, Store } from "lucide-react";

export function CrossStoreAddGuard() {
  const addItem = useCart((s) => s.addItem);
  const [pending, setPending] = React.useState<CrossStoreAddDetail | null>(null);
  /* اسم متجر السلة الحالية لحظة السؤال (مأخوذ من المخزن لا من الحدث —
     الحدث يحمل متجر الإضافة الجديدة فقط). */
  const [currentStore, setCurrentStore] = React.useState<string | null>(null);

  React.useEffect(() => {
    const onRequest = (e: Event) => {
      const detail = (e as CustomEvent<CrossStoreAddDetail>).detail;
      setCurrentStore(useCart.getState().businessName);
      setPending(detail);
    };
    window.addEventListener(CROSS_STORE_ADD_EVENT, onRequest);
    return () => window.removeEventListener(CROSS_STORE_ADD_EVENT, onRequest);
  }, []);

  const confirm = () => {
    if (pending) addItem(pending.slug, pending.businessName, pending.item);
    setPending(null);
  };

  return (
    <Dialog open={pending !== null} onOpenChange={(open) => { if (!open) setPending(null); }}>
      {pending && (
        <DialogContent dir="rtl">
          <DialogTitle className="flex items-center gap-2">
            <Store className="size-4 text-muted-foreground" aria-hidden="true" />
            سلتك من متجر آخر
          </DialogTitle>
          <DialogDescription>
            سلتك الحالية تحمل أصنافًا من «{currentStore ?? "متجر آخر"}». إضافة «
            {pending.item.productName}» من «{pending.businessName}» ستستبدل سلتك
            بالكامل — لا يمكن الجمع بين متجرين في طلب واحد.
          </DialogDescription>
          <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-start">
            <Button variant="outline" onClick={() => setPending(null)}>
              إلغاء
            </Button>
            <Button onClick={confirm}>
              <ShoppingBag className="size-4" aria-hidden="true" />
              استبدال السلة وإضافة الصنف
            </Button>
          </div>
        </DialogContent>
      )}
    </Dialog>
  );
}
