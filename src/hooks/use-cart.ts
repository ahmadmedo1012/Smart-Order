"use client";

// Cart store — per-business single cart, persisted to localStorage.
// Client holds ONLY product choices; all money math is re-done server-side at checkout.

import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      skipHydration: false,
    }
  )
);

export function cartEstimatedSubtotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
