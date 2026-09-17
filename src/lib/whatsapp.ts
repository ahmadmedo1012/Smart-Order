// WhatsApp message builders — structured Arabic order messages via wa.me deep links.
// First-class channel for Libyan commerce; no Business API dependency (link-based, real).

import { formatLyd, formatLydAmount } from "@/lib/money";
import { formatPhoneDisplay } from "@/lib/phone";
import { FULFILLMENT_AR, PAYMENT_TYPE_AR, type OrderStatus } from "@/lib/constants";

export interface OrderMessageData {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  items: Array<{
    productName: string;
    variantName?: string | null;
    options?: string | null;
    quantity: number;
    lineTotal: number;
  }>;
  fulfillmentType: "DELIVERY" | "PICKUP";
  city?: string | null;
  area?: string | null;
  addressLine?: string | null;
  subtotal: number;
  deliveryFee: number;
  total: number;
  paymentName?: string | null;
  paymentType?: string | null;
  customerNote?: string | null;
}

/** Structured message the BUSINESS receives/uses after order creation (customer → business confirmation). */
export function buildOrderMessage(o: OrderMessageData, opts?: { trackUrl?: string }): string {
  const lines: string[] = [];
  lines.push(`🧾 *طلب جديد* ${o.orderNumber}`);
  lines.push("");
  lines.push(`👤 ${o.customerName} — ${formatPhoneDisplay(o.customerPhone)}`);
  const itemsLines = o.items.map((it) => {
    const opts = it.options ? ` (${it.options})` : "";
    const variant = it.variantName ? ` [${it.variantName}]` : "";
    return `• ${it.quantity}× ${it.productName}${variant}${opts} — ${formatLyd(it.lineTotal)}`;
  });
  lines.push(...itemsLines);
  lines.push("");
  lines.push(`المجموع الفرعي: ${formatLyd(o.subtotal)}`);
  if (o.deliveryFee > 0) lines.push(`التوصيل: ${formatLyd(o.deliveryFee)}`);
  lines.push(`*الإجمالي: ${formatLyd(o.total)}*`);
  lines.push("");
  if (o.fulfillmentType === "DELIVERY") {
    const place = [o.city, o.area].filter(Boolean).join(" — ");
    lines.push(`🚚 ${FULFILLMENT_AR.DELIVERY}${place ? ` (${place})` : ""}`);
    if (o.addressLine) lines.push(`📍 ${o.addressLine}`);
  } else {
    lines.push(`🏬 ${FULFILLMENT_AR.PICKUP}`);
  }
  if (o.paymentType) {
    lines.push(`💳 ${PAYMENT_TYPE_AR[o.paymentType as keyof typeof PAYMENT_TYPE_AR] ?? o.paymentName ?? o.paymentType}`);
  }
  if (o.customerNote) lines.push(`📝 ملاحظة: ${o.customerNote}`);
  if (opts?.trackUrl) lines.push(`\n🔗 تتبع الطلب: ${opts.trackUrl}`);
  return lines.join("\n");
}

/** Confirmation message the BUSINESS sends to the CUSTOMER (dashboard action). */
export function buildCustomerConfirmationMessage(o: OrderMessageData, businessName: string): string {
  return `شكراً لطلبك من ${businessName} 🙏\n\nطلبك ${o.orderNumber} قيد المعالجة وسنوافيك بالتحديثات.\nالإجمالي: ${formatLyd(o.total)}`;
}

/** Status update message for the customer. */
export function buildStatusUpdateMessage(orderNumber: string, status: OrderStatus, businessName: string): string {
  const labels: Record<string, string> = {
    CONFIRMED: "تم تأكيد طلبك ✅",
    PREPARING: "طلبك قيد التحضير الآن 👨‍🍳",
    READY: "طلبك جاهز ✨",
    OUT_FOR_DELIVERY: "طلبك في الطريق إليك 🚚",
    DELIVERED: "تم توصيل طلبك بنجاح 🎉 شكراً لثقتك!",
    CANCELLED: "تم إلغاء طلبك",
    REJECTED: "نعتذر، لم نتمكن من قبول طلبك",
  };
  const label = labels[status] ?? `تحديث حالة الطلب: ${status}`;
  return `${label}\nطلب ${orderNumber} — ${businessName}`;
}

export function waLink(targetE164: string, message?: string): string {
  const t = String(targetE164 || "").replace(/\D/g, "");
  const m = message ? `?text=${encodeURIComponent(message)}` : "";
  return `https://wa.me/${t}${m}`;
}
