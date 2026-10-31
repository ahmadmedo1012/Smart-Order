/**
 * P38 (Phase F) — الأجزاء النقية من خط الإشعارات (بلا DB): بناء
 * الحمولات الآمنة، تقطيع الدفعات، واختزال تذاكر Expo إلى عدّات.
 *
 * منفصلة عمدًا عن push.ts (الذي يستورد Prisma) لتكون قابلة للاختبار
 * في بيئة node:test العارية (tests/unit/push.test.ts) — نفس نمط
 * client-ip.ts.
 */

/** The business events that may produce a push (server truth only). */
export type PushEvent =
  | { kind: "order-created"; orderNumber: string; businessId: string; businessName?: string | null; total?: number | null }
  | { kind: "order-status"; orderNumber: string; businessId: string; status: string };

/** Safe payload law: Arabic title/body, order number + status only —
 * no customer PII, no line items, no notes, no money in a notification. */
export function buildPushMessage(event: PushEvent): { title: string; body: string; data: Record<string, string> } {
  if (event.kind === "order-created") {
    return {
      title: "طلب جديد",
      body: `الطلب رقم ${event.orderNumber} وصل إلى متجرك — افتح صندوق الطلبات لتفاصيله`,
      data: { kind: event.kind, orderNumber: event.orderNumber, businessId: event.businessId },
    };
  }
  const label = STATUS_AR[event.status] ?? event.status;
  return {
    title: "تحديث حالة طلب",
    body: `الطلب رقم ${event.orderNumber} أصبح: ${label}`,
    data: { kind: event.kind, orderNumber: event.orderNumber, businessId: event.businessId, status: event.status },
  };
}

export const STATUS_AR: Record<string, string> = {
  NEW: "جديد",
  CONFIRMED: "مؤكد",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "في الطريق",
  DELIVERED: "مكتمل",
  CANCELLED: "ملغى",
  REJECTED: "مرفوض",
};

export interface ExpoPushTicket {
  status: "ok" | "error";
  id?: string;
  message?: string;
  details?: { error?: string };
}

export const EXPO_PUSH_ENDPOINT = "https://exp.host/--/api/v2/push/send";
export const MAX_PUSH_BATCH = 100;

/** تقطيع التوكنات إلى دفعات ≤ الحد الأقصى (بلا تكرارات). */
export function chunkTokens(tokens: string[], max: number = MAX_PUSH_BATCH): string[][] {
  const live = [...new Set(tokens)];
  const out: string[][] = [];
  for (let i = 0; i < live.length; i += max) out.push(live.slice(i, i + max));
  return out;
}

/** اختزال تذاكر الدفعة إلى عدّات + توكنات ميتة (إبطال خادمي لاحق).
 * DeviceNotRegistered فقط هي حُكم الموت — فشل النقل لا يقتل توكنًا
 * صالحًا. */
export function reduceTickets(batch: string[], tickets: ExpoPushTicket[]): {
  sent: number;
  failed: number;
  deadTokens: string[];
} {
  let sent = 0;
  let failed = 0;
  const deadTokens: string[] = [];
  for (let t = 0; t < tickets.length; t++) {
    const ticket = tickets[t];
    if (ticket.status === "ok") {
      sent += 1;
      continue;
    }
    failed += 1;
    if (ticket.details?.error === "DeviceNotRegistered" && batch[t]) {
      deadTokens.push(batch[t]);
    }
  }
  return { sent, failed, deadTokens };
}
