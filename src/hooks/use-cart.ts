"use client";

// Cart store — per-business single cart, persisted to localStorage.
// Client holds ONLY product choices; all money math is re-done server-side at checkout.

import { useSyncExternalStore } from "react";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

/* r140 (P2-2): غلاف آمن للخادم — توأم Smart-Menu cart.ts: على الخادم
   يعيد مخزنًا فارغًا (getItem=null) فلا يُسقط persist خاصيته
   (createJSONStorage(() => localStorage) في بيئة node يجعل storage
   undefined فيخرج persistImpl بمسار الإرجاع المبكر بلا api.persist)،
   وفي المتصفح يقرأ/يكتب localStorage الحقيقي. */
const ssrSafeStorage = () => ({
  getItem: (name: string) => {
    if (typeof window === "undefined") return null;
    try {
      return localStorage.getItem(name);
    } catch {
      return null;
    }
  },
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch {
      /* noop */
    }
  },
  removeItem: (name: string) => {
    try {
      localStorage.removeItem(name);
    } catch {
      /* noop */
    }
  },
});

interface CartOption {
  id: string;
  name: string;
  priceDelta: number; // display only (server re-prices)
}

interface CartItem {
  key: string; // signature: product+variant+options+note
  productId: string;
  productName: string;
  productImage: string | null;
  variantId: string | null;
  variantName: string | null;
  options: CartOption[];
  quantity: number;
  note: string;
  unitPrice: number; // display estimate: base + variant + options
}

interface CartState {
  businessSlug: string | null;
  businessName: string | null;
  items: CartItem[];
  addItem: (slug: string, businessName: string, item: Omit<CartItem, "key">) => { replaced: boolean };
  updateQuantity: (key: string, quantity: number) => void;
  removeItem: (key: string) => void;
  updateNote: (key: string, note: string) => void;
  clear: () => void;
}

function signatureOf(item: Omit<CartItem, "key">): string {
  return [
    item.productId,
    item.variantId ?? "-",
    [...item.options].map((o) => o.id).sort().join("+"),
    item.note.trim(),
  ].join("|");
}

export const MAX_CART_QUANTITY = 99;

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      businessSlug: null,
      businessName: null,
      items: [],

      addItem(slug, businessName, item) {
        const state = get();
        // single-business cart: switching business resets
        const replaced = state.businessSlug !== null && state.businessSlug !== slug;
        const base = replaced ? [] : state.items;
        const key = signatureOf(item);
        /* r134 (W2 #14): map to a NEW item object on merge — the old
           in-place `existing.quantity = ...` mutated an object still
           aliased by the previous array snapshot (torn reads for any
           consumer holding the old items reference). */
        const items = base.some((i) => i.key === key)
          ? base.map((i) =>
              i.key === key
                ? { ...i, quantity: Math.min(MAX_CART_QUANTITY, i.quantity + item.quantity) }
                : i,
            )
          : [...base, { ...item, key }];
        set({ businessSlug: slug, businessName, items });
        return { replaced };
      },

      updateQuantity(key, quantity) {
        set((s) => ({
          items:
            quantity <= 0
              ? s.items.filter((i) => i.key !== key)
              : s.items.map((i) => (i.key === key ? { ...i, quantity: Math.min(MAX_CART_QUANTITY, quantity) } : i)),
        }));
      },

      removeItem(key) {
        set((s) => ({ items: s.items.filter((i) => i.key !== key) }));
      },

      updateNote(key, note) {
        set((s) => ({ items: s.items.map((i) => (i.key === key ? { ...i, note } : i)) }));
      },

      clear() {
        set({ items: [], businessSlug: null, businessName: null });
      },
    }),
    {
      name: "smart-order-cart",
      version: 1,
      /* r140 (P2-2): الترطيب يُدار مركزيًا (توأم Smart-Menu cart.ts) —
         skipHydration يمنع persist من قراءة localStorage تزامنيًا عند
         إنشاء المخزن، فكانت القراءة تجري قبل أول رسم عميل بينما HTML
         الـISR رُسم بسلة فارغة → انعدام تطابق React 19 على الشارة
         وaria-label والشريط اللاصق وفرع «سلتك فارغة». الآن
         CartHydrator (جذر Providers) يعيد الترطيب بعد الطلاء الأول. */
      skipHydration: true,
      storage: createJSONStorage(ssrSafeStorage),
    }
  )
);

/** r140 (P2-2): بوابة «اكتمل الترطيب» — توأم useCartHydrated في
 *  Smart-Menu (cart.ts r123): getServerSnapshot يرجع false دائمًا
 *  فطبقة الترطيب في React تستخدم قيمة الخادم (مطابقة مضمونة البنية)،
 *  ثم تتصالح مع اللقطة الحية بعد الطلاء. المستهلكات تبقي عرض أي شيء
 *  يعتمد على count حتى يكتمل rehydrate (لا ومضة «سلة فارغة» كاذبة). */
export function useCartHydrated(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => useCart.persist.onFinishHydration(onStoreChange),
    () => useCart.persist.hasHydrated(),
    () => false,
  );
}

export function cartEstimatedSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
