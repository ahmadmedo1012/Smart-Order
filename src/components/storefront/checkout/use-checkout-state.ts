"use client";

import * as React from "react";
import { api } from "@/lib/client";
import { useCart, useCartHydrated, cartEstimatedSubtotal } from "@/hooks/use-cart";
import { WALLET_CAP_LYD } from "@/lib/payment-constants";
import type { CheckoutResult, FieldErrors, StoreData, Step } from "./types";

/**
 * 17-DEBT-SO: the checkout state machine extracted verbatim from
 * checkout-client.tsx — every useState, the store-data load, the
 * derived money/eligibility values, and the r134 beforeunload dirty
 * guard. The submit flow (validation + POST /api/public/orders +
 * redirect) stays in the composition root so the revenue path's API
 * call and its parity-pinned router.replace remain in the recorded
 * file. Setter identity is stable React state — handlers passed down
 * to the section components behave exactly as the inline originals.
 */
export function useCheckoutState(slug: string) {
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  /* r140 (P2-2): بوابة اكتمال ترطيب السلة — زائر عائد بسلة محفوظة
     (skipHydration + CartHydrator في الجذر) لا يرى ومضة «سلتك
     فارغة» الكاذبة قبل اكتمال rehydrate؛ نمط Smart-Menu /cart. */
  const hydrated = useCartHydrated();
  const [data, setData] = React.useState<StoreData | null>(null);
  const [loadError, setLoadError] = React.useState(false);
  const [step, setStep] = React.useState<Step>("form");
  const [submitting, setSubmitting] = React.useState(false);
  const [result, setResult] = React.useState<CheckoutResult | null>(null);

  const [fulfillment, setFulfillment] = React.useState<"DELIVERY" | "PICKUP">("DELIVERY");
  const [name, setName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [city, setCity] = React.useState("طرابلس");
  const [area, setArea] = React.useState("");
  const [addressLine, setAddressLine] = React.useState("");
  const [customerNote, setCustomerNote] = React.useState("");
  const [zoneId, setZoneId] = React.useState<string>("");
  const [paymentMethodId, setPaymentMethodId] = React.useState<string>("");
  const [errors, setErrors] = React.useState<FieldErrors>({});

  const load = React.useCallback(() => {
    setLoadError(false);
    api
      .get<StoreData>(`/api/public/store/${slug}`)
      .then((r) => {
        setData(r.data);
        if (r.data.deliveryZones.length > 0) setZoneId(r.data.deliveryZones[0].id);
        if (r.data.paymentMethods.length > 0) setPaymentMethodId(r.data.paymentMethods[0].id);
        if (r.data.deliveryZones.length === 0) setFulfillment("PICKUP");
      })
      .catch(() => setLoadError(true));
  }, [slug]);

  React.useEffect(load, [load]);

  const subtotal = cartEstimatedSubtotal(items);
  const zone = data?.deliveryZones.find((z) => z.id === zoneId) ?? null;
  const deliveryFee = fulfillment === "DELIVERY" ? (zone?.fee ?? 0) : 0;
  const total = subtotal + deliveryFee;
  /* r134 (W2 #3): wallet networks (libyana/madar) reject single
     transfers above WALLET_CAP_LYD — subscriptions already enforce the
     cap (payment-dialog.tsx); the checkout quick-code row now matches
     (amounts are millimes — the constant is whole LYD). */
  const overWalletCap = total > WALLET_CAP_LYD * 1000;
  const paymentMethod = data?.paymentMethods.find((p) => p.id === paymentMethodId) ?? null;
  const paymentConfig = paymentMethod?.config ? (JSON.parse(paymentMethod.config) as { number?: string }) : null;

  const minOrderUnmet: boolean =
    fulfillment === "DELIVERY" && !!zone && zone.minOrder > 0 && subtotal < zone.minOrder;

  /* r134 (W2 #15): beforeunload dirty guard — the r133 useDirtyClose
     family pattern adapted to a full-page client form (dialogs guard
     ESC/scrim/close; a page form needs the browser-level guard; note
     beforeunload fires on real unloads only — refresh/close — not on
     Next.js client-side navigations, and the success path uses
     router.replace so it never trips). Dirty = any field off the value
     load() seeds; armed only while there are items to lose. */
  const formDirty =
    step === "form" &&
    !!data &&
    (name.trim() !== "" ||
      phone.trim() !== "" ||
      area.trim() !== "" ||
      addressLine.trim() !== "" ||
      customerNote.trim() !== "" ||
      city !== "طرابلس" ||
      zoneId !== (data.deliveryZones[0]?.id ?? "") ||
      paymentMethodId !== (data.paymentMethods[0]?.id ?? "") ||
      fulfillment !== (data.deliveryZones.length > 0 ? "DELIVERY" : "PICKUP"));

  React.useEffect(() => {
    if (!formDirty || items.length === 0) return;
    const guardUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = ""; // legacy contract — Chrome ignores preventDefault alone
    };
    window.addEventListener("beforeunload", guardUnload);
    return () => window.removeEventListener("beforeunload", guardUnload);
  }, [formDirty, items.length]);

  return {
    // cart
    items,
    clearCart,
    hydrated,
    // store data + load
    data,
    loadError,
    load,
    // step machine
    step,
    setStep,
    submitting,
    setSubmitting,
    result,
    setResult,
    // form state
    fulfillment,
    setFulfillment,
    name,
    setName,
    phone,
    setPhone,
    city,
    setCity,
    area,
    setArea,
    addressLine,
    setAddressLine,
    customerNote,
    setCustomerNote,
    zoneId,
    setZoneId,
    paymentMethodId,
    setPaymentMethodId,
    errors,
    setErrors,
    // derived
    subtotal,
    zone,
    deliveryFee,
    total,
    overWalletCap,
    paymentMethod,
    paymentConfig,
    minOrderUnmet,
  };
}

export type CheckoutState = ReturnType<typeof useCheckoutState>;
