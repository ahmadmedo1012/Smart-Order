// r140 (P2-2) — cart hydration contract (src/hooks/use-cart.ts).
// The root cause of the hydration mismatch was `skipHydration: false`:
// zustand persist rehydrated SYNCHRONOUSLY at store creation (before the
// first client render) while the ISR server HTML was rendered with an
// empty cart → React 19 mismatch on every count-dependent node. The twin
// pattern (Smart-Menu cart.ts + CartHydrator) is pinned here at the store
// level: import must NOT self-rehydrate, and the post-paint rehydrate()
// (what CartHydrator triggers) must merge the saved cart and flip
// hasHydrated() — the exact signal useCartHydrated() gates on.
import { test } from "node:test";
import assert from "node:assert/strict";

// A returning visitor's localStorage payload — zustand persist JSON shape
// (SO persists items + business meta; functions drop out of stringify).
const SAVED_CART = JSON.stringify({
  state: {
    businessSlug: "waha-cafe",
    businessName: "مقهى الواحة",
    items: [
      {
        key: "p1|-|+",
        productId: "p1",
        productName: "كابتشينو",
        productImage: null,
        variantId: null,
        variantName: null,
        options: [],
        quantity: 2,
        note: "",
        unitPrice: 7500,
      },
    ],
  },
  version: 1,
});

async function importStore() {
  return import("../../src/hooks/use-cart.ts");
}

test("cart store (r140 P2-2): import does NOT self-rehydrate — the mismatch root cause", async () => {
  // Simulate a browser carrying the saved cart BEFORE the store module
  // loads (dynamic import — ESM imports hoist, so globals must precede it).
  (globalThis as Record<string, unknown>).window = globalThis;
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (k === "smart-order-cart" ? SAVED_CART : null),
    setItem: () => {},
    removeItem: () => {},
  };
  const { useCart } = await importStore();

  // THE contract: the persisted cart must stay unread at import —
  // server render and first client render both see the empty initial
  // store (hydration match by construction); CartHydrator owns the read.
  assert.equal(useCart.persist.getOptions().skipHydration, true);
  assert.equal(useCart.persist.getOptions().name, "smart-order-cart");
  assert.equal(useCart.persist.hasHydrated(), false);
  assert.equal(useCart.getState().items.length, 0);
  assert.equal(useCart.getState().businessSlug, null);
});

test("cart store (r140 P2-2): post-paint rehydrate() (CartHydrator) merges the saved cart", async () => {
  const { useCart, cartCount, cartEstimatedSubtotal } = await importStore();
  await useCart.persist.rehydrate();

  // the signal useCartHydrated() gates on
  assert.equal(useCart.persist.hasHydrated(), true);

  const s = useCart.getState();
  assert.equal(s.businessSlug, "waha-cafe");
  assert.equal(s.items.length, 1);
  assert.equal(s.items[0].productName, "كابتشينو");
  assert.equal(cartCount(s.items), 2);
  assert.equal(cartEstimatedSubtotal(s.items), 15000);
});

test("cart store (r140 P2-2): onFinishHydration fires on rehydrate (the gate's re-render)", async () => {
  const { useCart } = await importStore();
  // already rehydrated by the previous test (module cache) — a fresh
  // listener must still be callable, and rehydrate is idempotent.
  let fired = false;
  const unsub = useCart.persist.onFinishHydration(() => {
    fired = true;
  });
  await useCart.persist.rehydrate();
  unsub();
  assert.equal(fired, true);
  assert.equal(useCart.persist.hasHydrated(), true);
  // the saved cart is still there (idempotent replay, no duplication)
  assert.equal(useCart.getState().items.length, 1);
});
