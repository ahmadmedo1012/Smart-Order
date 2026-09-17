// Order state machine — centralized, validated, auditable transitions.

import type { OrderStatus } from "@/lib/constants";

export interface TransitionRule {
  to: OrderStatus;
  label: string; // Arabic action label for the dashboard
  destructive?: boolean;
}

const TRANSITIONS: Record<OrderStatus, TransitionRule[]> = {
  NEW: [
    { to: "CONFIRMED", label: "تأكيد الطلب" },
    { to: "REJECTED", label: "رفض الطلب", destructive: true },
    { to: "CANCELLED", label: "إلغاء الطلب", destructive: true },
  ],
  CONFIRMED: [
    { to: "PREPARING", label: "بدء التحضير" },
    { to: "CANCELLED", label: "إلغاء الطلب", destructive: true },
  ],
  PREPARING: [
    { to: "READY", label: "جاهز للاستلام" },
    { to: "CANCELLED", label: "إلغاء الطلب", destructive: true },
  ],
  READY: [
    { to: "OUT_FOR_DELIVERY", label: "خرج للتوصيل" },
    { to: "DELIVERED", label: "تم التسليم" },
    { to: "CANCELLED", label: "إلغاء الطلب", destructive: true },
  ],
  OUT_FOR_DELIVERY: [{ to: "DELIVERED", label: "تم التسليم" }],
  DELIVERED: [],
  CANCELLED: [],
  REJECTED: [],
};

export function getAllowedTransitions(current: OrderStatus, fulfillment: "DELIVERY" | "PICKUP"): TransitionRule[] {
  const rules = TRANSITIONS[current] ?? [];
  if (fulfillment === "PICKUP") {
    // OUT_FOR_DELIVERY is nonsensical for pickup orders
    return rules.filter((r) => r.to !== "OUT_FOR_DELIVERY");
  }
  // DELIVERED directly from READY is odd for delivery orders — force through OUT_FOR_DELIVERY
  if (fulfillment === "DELIVERY" && current === "READY") {
    return rules.filter((r) => r.to !== "DELIVERED");
  }
  return rules;
}

export function canTransition(from: OrderStatus, to: OrderStatus, fulfillment: "DELIVERY" | "PICKUP"): boolean {
  return getAllowedTransitions(from, fulfillment).some((r) => r.to === to);
}

export function isTerminal(status: OrderStatus): boolean {
  return (TRANSITIONS[status] ?? []).length === 0;
}

/** Statuses where payment can be marked as received. */
export function canMarkPaid(status: OrderStatus): boolean {
  return status !== "CANCELLED" && status !== "REJECTED";
}
