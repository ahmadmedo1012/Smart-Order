// P43 SO-3 — the cart's SHARED type shapes. use-cart.ts owned these
// inline; reorder.ts (a pure, node-testable module) needs the same
// shapes WITHOUT importing the zustand hook ("use client" + the store —
// node --test loads bare). The types moved to this dependency-free home
// and use-cart re-exports them, so every existing import keeps working.

export interface CartOption {
  id: string;
  name: string;
  priceDelta: number; // display only (server re-prices)
}

export interface CartItem {
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
