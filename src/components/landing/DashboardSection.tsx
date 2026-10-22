'use client';

import { useState } from "react";
import Link from "next/link";
import { m } from "motion/react";
import {
  ArrowLeft,
  RotateCcw,
  MapPin,
  Phone,
  StickyNote,
} from "lucide-react";
import { RevealCssClass } from "@/hooks/useReveal";
import {
  OrderStatusBadge,
  PaymentStatusBadge,
} from "@/components/shared/status-badges";
import {
  getAllowedTransitions,
  canMarkPaid,
} from "@/lib/order-machine";
import {
  ORDER_STATUS_AR,
  PAYMENT_TYPE_AR,
  TRACKING_FLOW,
  FULFILLMENT_AR,
  ROLE_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { formatLyd } from "@/lib/money";

/* ═══════════════════════════════════════════════════════════════════════
   r142 «الخط» — DashboardSection «لوحة التاجر» (chapter 03):
   the merchant console as an HONEST interactive model — the real state
   machine (lib/order-machine.ts) driving a clearly-labeled demo order.

   Truthful by construction:
   · The action buttons are exactly getAllowedTransitions(status,
     fulfillment) — including the machine's two real rules: pickup
     orders never see «خرج للتوصيل», and delivery orders must pass
     through it before «تم التسليم».
   · Payment confirmation rides canMarkPaid (blocked only for
     cancelled/rejected) — the same gate the dashboard uses.
   · The badges are the PRODUCT's own OrderStatusBadge /
     PaymentStatusBadge components — same pastel families, same labels.
   · The roles row maps ROLE_PERMISSIONS honestly (STAFF: orders.update,
     ADMIN: payments.manage).
   · The order is a labeled نموذج تفاعلي — no invented live figures.
   ═══════════════════════════════════════════════════════════════════════ */

const FULFILLMENTS = ["DELIVERY", "PICKUP"] as const;
type Fulfillment = (typeof FULFILLMENTS)[number];

const DEMO = {
  number: "SO-20250101-0014",
  customer: "أمينة",
  city: "طرابلس",
  /* W21 Wave 6: منطقة موثّقة — وسط المدينة (رسوم البذرة الحقيقية:
     5 د.ل)، نفس منطقة سلة الزبون في فصل المتجر (02)؛ الطلبُ واحدٌ في
     الفصلين: بيتزا مارغريتا ×2 + عصير برتقال طازج ×2 + توصيلها. */
  area: "وسط المدينة",
  phone: "091•••••••",
  note: "الجرس لا يعمل — اتصل عند الوصول",
  items: [
    { name: "بيتزا مارغريتا ×2", total: 90_000 },
    { name: "عصير برتقال طازج ×2", total: 18_000 },
  ],
  deliveryFee: 5_000,
  paymentMethod: "CASH" as const,
};

const ROLE_NOTES = [
  { role: "OWNER", can: "كل الصلاحيات — إعدادات وفواتير وموظفين" },
  { role: "ADMIN", can: "الطلبات والمدفوعات (payments.manage) والمخزون" },
  { role: "STAFF", can: "قراءة الطلبات وتحديثها (orders.update)" },
] as const;

export function DashboardSection() {
  const [status, setStatus] = useState<OrderStatus>("NEW");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("UNPAID");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("DELIVERY");

  const transitions = getAllowedTransitions(status, fulfillment);
  const terminal = transitions.length === 0;
  const currentIdx = TRACKING_FLOW.indexOf(status);

  const total =
    DEMO.items.reduce((sum, it) => sum + it.total, 0) + DEMO.deliveryFee;

  const reset = () => {
    setStatus("NEW");
    setPaymentStatus("UNPAID");
  };

  return (
    <section id="dashboard" className="ln-chapter ln-dash">
      <div className="ln-chapter-head">
        <span className="ln-micro" aria-hidden="true">{"SMART ORDER — 003 · CONSOLE"}</span>
        <span className="ln-label">{'03 — لوحة التاجر'}</span>
        <RevealCssClass as="h2" className="ln-chapter-title" delay={1}>
          من لوحة واحدة <em>تُدار الرحلة كلها</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="ln-chapter-lede" delay={2}>
          جرّب لوحة الطلبات بنفسك — هذا نموذج تفاعلي يعمل بآلة الحالات
          الحقيقية للمنصّة: لا انتقال إلا بما تسمح به اللوحة، ولا تأكيد
          دفع إلا بقواعدها.
        </RevealCssClass>
      </div>

      <RevealCssClass as="div" delay={2}>
        <div className="ln-dash-grid">
          {/* ── the fulfillment toggle + the journey stepper ── */}
          <div className="ln-dash-console">
            <div className="ln-dash-console-head">
              <div>
                <p className="ln-dash-console-title">لوحة الطلبات</p>
                <p className="ln-mono ln-dash-console-sub" dir="ltr">
                  {DEMO.number}
                </p>
              </div>
              <span className="ln-dash-demo-chip">نموذج تفاعلي</span>
            </div>

            {/* fulfillment — the real contract the machine branches on */}
            <div className="ln-dash-fulfillment" role="group" aria-label="نوع الطلب">
              {FULFILLMENTS.map((f) => (
                <button
                  key={f}
                  type="button"
                  className={`ln-dash-fulfillment-btn${fulfillment === f ? " is-active" : ""}`}
                  aria-pressed={fulfillment === f}
                  onClick={() => setFulfillment(f)}
                >
                  {FULFILLMENT_AR[f]}
                </button>
              ))}
            </div>

            {/* the six-state stepper — TRACKING_FLOW, real colors */}
            <ol className="ln-dash-stepper" aria-label="مراحل الطلب في اللوحة">
              {TRACKING_FLOW.map((s, i) => {
                const passed = currentIdx >= 0 && i < currentIdx;
                const isCurrent = s === status;
                /* pickup orders skip OUT_FOR_DELIVERY — the machine's rule,
                   shown on the rail exactly as the dashboard timeline does */
                const skipped = fulfillment === "PICKUP" && s === "OUT_FOR_DELIVERY";
                return (
                  <li
                    key={s}
                    className={`ln-dash-step${passed ? " is-passed" : ""}${isCurrent ? " is-current" : ""}${skipped ? " is-skipped" : ""}`}
                    data-stage={s}
                  >
                    <span className="ln-dash-step-dot" aria-hidden="true" />
                    <span className="ln-dash-step-label">{ORDER_STATUS_AR[s]}</span>
                    {skipped && (
                      <span className="ln-mono ln-dash-step-skip" aria-hidden="true">
                        استلام
                      </span>
                    )}
                  </li>
                );
              })}
            </ol>

            {/* the order — receipt-honest rows */}
            <div className="ln-dash-order">
              <div className="ln-dash-order-row">
                <MapPin size={14} aria-hidden="true" />
                <span>{DEMO.customer} · {DEMO.city} — {DEMO.area}</span>
              </div>
              <div className="ln-dash-order-row">
                <Phone size={14} aria-hidden="true" />
                <span className="ln-mono" dir="ltr">{DEMO.phone}</span>
              </div>
              <div className="ln-dash-order-row">
                <StickyNote size={14} aria-hidden="true" />
                <span>{DEMO.note}</span>
              </div>
              <ul className="ln-dash-items">
                {DEMO.items.map((it) => (
                  <li key={it.name}>
                    <span>{it.name}</span>
                    <span className="ln-mono" dir="ltr">{formatLyd(it.total)}</span>
                  </li>
                ))}
                <li className="ln-dash-item-fee">
                  <span>التوصيل</span>
                  <span className="ln-mono" dir="ltr">{formatLyd(DEMO.deliveryFee)}</span>
                </li>
                <li className="ln-dash-item-total">
                  <span>الإجمالي</span>
                  <span className="ln-mono" dir="ltr">{formatLyd(total)}</span>
                </li>
              </ul>
            </div>

            {/* the actions — EXACTLY what the machine allows now */}
            <div className="ln-dash-actions">
              {terminal ? (
                <p className="ln-dash-terminal">
                  {status === "DELIVERED"
                    ? "حالة نهائية: تم التسليم — بقي تأكيد الدفع إن لم يُؤكَّد."
                    : "حالة نهائية — لا انتقالات متاحة من هنا."}
                </p>
              ) : (
                transitions.map((t) => (
                  <button
                    key={t.to}
                    type="button"
                    className={`ln-dash-action${t.destructive ? " is-destructive" : ""}`}
                    onClick={() => setStatus(t.to)}
                  >
                    {t.label}
                    <span className="ln-mono ln-dash-action-next" dir="ltr" aria-hidden="true">
                      → {t.to}
                    </span>
                  </button>
                ))
              )}
            </div>

            {/* the payment rail — the real canMarkPaid gate */}
            <div className="ln-dash-payment">
              <div className="ln-dash-payment-row">
                <span className="ln-dash-payment-label">الدفع</span>
                <PaymentStatusBadge status={paymentStatus} />
                <span className="ln-dash-payment-method">
                  {PAYMENT_TYPE_AR[DEMO.paymentMethod]}
                </span>
              </div>
              {canMarkPaid(status) && paymentStatus === "UNPAID" && (
                <button
                  type="button"
                  className="ln-dash-pay-btn"
                  onClick={() => setPaymentStatus("PAID")}
                >
                  تأكيد استلام الدفع
                </button>
              )}
              <p className="ln-dash-payment-note">
                القاعدة نفسها في اللوحة: لا تأكيد دفع على طلب ملغي أو مرفوض.
              </p>
            </div>

            <button type="button" className="ln-dash-reset" onClick={reset}>
              <RotateCcw size={14} aria-hidden="true" />
              إعادة النموذج من «جديد»
            </button>
          </div>

          {/* ── the roles ledger — who sees what ── */}
          <m.div
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ delay: 0.2 }}
            className="ln-dash-roles"
          >
            <p className="ln-dash-roles-title">الأدوار والصلاحيات — كما في المنصّة</p>
            <ul className="ln-dash-roles-list">
              {ROLE_NOTES.map((r) => (
                <li key={r.role} className="ln-dash-role">
                  <span className="ln-dash-role-name">{ROLE_AR[r.role]}</span>
                  <span className="ln-dash-role-can">{r.can}</span>
                  <span className="ln-mono ln-dash-role-key" dir="ltr" aria-hidden="true">
                    {r.role}
                  </span>
                </li>
              ))}
            </ul>
            <div className="ln-dash-roles-status">
              <OrderStatusBadge status={status} />
              <span className="ln-dash-roles-status-hint">
                الشارة نفسها التي يراها العميل في صفحة التتبّع.
              </span>
            </div>
            <Link href="/register" className="ln-btn-ghost ln-dash-roles-cta">
              أنشئ لوحتك
              <ArrowLeft size={15} aria-hidden="true" />
            </Link>
          </m.div>
        </div>
      </RevealCssClass>
    </section>
  );
}
