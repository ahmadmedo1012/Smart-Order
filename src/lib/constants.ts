// Central domain constants — single source of truth for statuses, permissions, payment types.

export const ORDER_STATUSES = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "REJECTED",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const ORDER_STATUS_AR: Record<OrderStatus, string> = {
  NEW: "جديد",
  CONFIRMED: "مؤكد",
  PREPARING: "قيد التحضير",
  READY: "جاهز",
  OUT_FOR_DELIVERY: "في الطريق للتوصيل",
  DELIVERED: "تم التوصيل",
  CANCELLED: "ملغي",
  REJECTED: "مرفوض",
};

/** Customer-visible status order for tracking UI */
export const TRACKING_FLOW: OrderStatus[] = [
  "NEW",
  "CONFIRMED",
  "PREPARING",
  "READY",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

export const PAYMENT_STATUSES = ["UNPAID", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_AR: Record<PaymentStatus, string> = {
  UNPAID: "غير مدفوع",
  PAID: "مدفوع",
  REFUNDED: "مسترجع",
};

export const FULFILLMENT_TYPES = ["DELIVERY", "PICKUP"] as const;
export type FulfillmentType = (typeof FULFILLMENT_TYPES)[number];

export const FULFILLMENT_AR: Record<FulfillmentType, string> = {
  DELIVERY: "توصيل",
  PICKUP: "استلام من الفرع",
};

export const PAYMENT_TYPES = ["CASH", "COD", "MANUAL", "WHATSAPP", "MADAR", "LIBYANA"] as const;
export type PaymentType = (typeof PAYMENT_TYPES)[number];

export const PAYMENT_TYPE_AR: Record<PaymentType, string> = {
  CASH: "نقداً عند الاستلام",
  COD: "الدفع عند التوصيل",
  MANUAL: "تحويل يدوي",
  WHATSAPP: "تأكيد دفع عبر واتساب",
  MADAR: "مدار (تحويل موبايل)",
  LIBYANA: "ليبيانا (تحويل موبايل)",
};

export const PAYMENT_TYPE_DESCRIPTIONS: Record<PaymentType, string> = {
  CASH: "ادفع نقداً عند استلام طلبك من الفرع",
  COD: "ادفع نقداً لمندوب التوصيل عند وصول الطلب",
  MANUAL: "حوّل المبلغ يدوياً ثم أرسل إشعار التحويل للرقم الموضح",
  WHATSAPP: "تواصل معنا عبر واتساب لتأكيد الدفع بعد التحويل",
  MADAR: "حوّل المبلغ عبر خدمة مدار للرقم الموضح، ثم أرسل صورة التحويل",
  LIBYANA: "حوّل المبلغ عبر خدمة ليبيانا money أو Tijarta للرقم الموضح، ثم أرسل صورة التحويل",
};

export const ROLES = ["OWNER", "ADMIN", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_AR: Record<Role, string> = {
  OWNER: "مالك",
  ADMIN: "مدير",
  STAFF: "موظف",
};

export const PERMISSIONS = [
  "orders.read",
  "orders.update",
  "orders.cancel",
  "products.read",
  "products.manage",
  "categories.manage",
  "customers.read",
  "customers.manage",
  "delivery.manage",
  "payments.manage",
  "settings.manage",
  "staff.manage",
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  OWNER: [...PERMISSIONS],
  ADMIN: [
    "orders.read",
    "orders.update",
    "orders.cancel",
    "products.read",
    "products.manage",
    "categories.manage",
    "customers.read",
    "customers.manage",
    "delivery.manage",
    "payments.manage",
  ],
  STAFF: ["orders.read", "orders.update", "products.read", "customers.read"],
};

export const LIBYA_CITIES = [
  "طرابلس",
  "بنغازي",
  "مصراتة",
  "الزاوية",
  "البيضاء",
  "سبها",
  "الخمس",
  "زليتن",
  "تاجوراء",
  "جنزور",
  "العجيلات",
  "صرمان",
  "مسلاتة",
  "درنة",
  "طبرق",
  "أوباري",
  "غريان",
  "ترهونة",
  "بني وليد",
  "سرت",
  "يفرن",
  "نالوت",
  "الكفرة",
  "أجدابيا",
  "مرزق",
  "براك",
  "المرج",
  "القبة",
  "سوسة",
  "الأصابعة",
] as const;

export const MAX_IMAGE_BYTES = 500 * 1024; // 500 KB post-compression cap
export const MAX_ORDER_ITEMS = 50;
export const MAX_ORDER_QUANTITY = 99;
