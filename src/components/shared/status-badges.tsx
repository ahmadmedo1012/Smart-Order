import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { BadgeCheck } from "lucide-react";

/**
 * STATUS STAMPS (r152, Phase 5 Route & Node): the order/payment states
 * speak the shipping-stamp language — solid family ground + family deep
 * ink + a 1px family-ink border + the squared stamp corner. Mapping
 * (unchanged since W1-F P1-3): NEW→copper (delivery orange), CONFIRMED/
 * OUT→sky (steel), PREPARING→yellow (amber), READY→copper, DELIVERED→
 * mint (green), CANCELLED→grey, REJECTED→rose, PAID→mint, REFUNDED→
 * rose, UNPAID→grey. The 9 families are tokenized in globals
 * (`--c-<family>-bg/-ink/-deep`) and flip with the theme. The stamp LIFT
 * rides the elevation ladder (shadow-sm = --elev-1) for the same reason:
 * the raw 6%-black literal it replaced had no night twin and vanished on
 * the night-dispatch card (P10-1b).
 *
 * W21-E (false-affordance kill): the hover -translate-y-px transition-lift
 * retired from all three stamps. Audit of every render site: 8 are
 * display-only (landing dashboard mock ×2, orders desktop table ×2,
 * order-detail header ×4) where a lifting badge reads as a pressable
 * control that isn't there; the 4 link-nested sites (dashboard recent-
 * orders feed ×2, orders mobile card ×1, customer history ×1) ride the
 * clickable ancestor's OWN hover affordance (row/card bg wash) — the
 * badge-level lift added a second, badge-shaped affordance that never
 * existed. Stamps state facts; they never move.
 */
export const ORDER_STATUS_CHIP: Record<OrderStatus, string> = {
  NEW: "border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep)",
  CONFIRMED: "border-(--c-sky-ink)/35 bg-(--c-sky-bg) text-(--c-sky-deep)",
  PREPARING: "border-(--c-yellow-ink)/40 bg-(--c-yellow-bg) text-(--c-yellow-deep)",
  READY: "border-(--c-copper-ink)/35 bg-(--c-copper-bg) text-(--c-copper-deep)",
  OUT_FOR_DELIVERY: "border-(--c-sky-ink)/35 bg-(--c-sky-bg) text-(--c-sky-deep)",
  DELIVERED: "border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep)",
  CANCELLED: "border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)",
  REJECTED: "border-(--c-rose-ink)/35 bg-(--c-rose-bg) text-(--c-rose-deep)",
};

export function OrderStatusBadge({
  status,
  className,
  dot = true,
}: {
  status: OrderStatus;
  className?: string;
  dot?: boolean;
}) {
  return (
    <Badge
      className={cn(
        "h-auto gap-1.5 px-2.5 py-1 text-[11px] font-semibold shadow-sm",
        ORDER_STATUS_CHIP[status],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />}
      {ORDER_STATUS_AR[status]}
    </Badge>
  );
}

const PAYMENT_CHIP: Record<PaymentStatus, string> = {
  UNPAID: "border-(--c-grey-ink)/35 bg-(--c-grey-bg) text-(--c-grey-deep)",
  PAID: "border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep)",
  REFUNDED: "border-(--c-rose-ink)/35 bg-(--c-rose-bg) text-(--c-rose-deep)",
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Badge
      className={cn(
        "h-auto px-2.5 py-1 text-[11px] font-semibold shadow-sm",
        PAYMENT_CHIP[status],
        className
      )}
    >
      {PAYMENT_STATUS_AR[status]}
    </Badge>
  );
}

/* W6-B7 (the COD-confirmation loop): the customer's one-tap confirmation
 * stamp, owner-facing. Mint family (the "good news" family — same ground
 * as PAID) + the BadgeCheck glyph. The exact timestamp is the CALLER's
 * to render (see the prop note below). */
export function CustomerConfirmedBadge({
  confirmedAt,
  title,
  className,
}: {
  /* No date formatting HERE (r137 law: the display helpers are
     client-only and this shared module renders from server pages too
     — the landing's RSC imports it). Callers that own a timestamp
     render it themselves (orders/[id] header line) or pass a
     preformatted `title`. */
  confirmedAt?: string | null;
  title?: string;
  className?: string;
}) {
  return (
    <Badge
      title={title ?? (confirmedAt ? "مؤكد من العميل" : undefined)}
      className={cn(
        "h-auto gap-1.5 px-2.5 py-1 text-[11px] font-semibold shadow-sm",
        "border-(--c-mint-ink)/35 bg-(--c-mint-bg) text-(--c-mint-deep)",
        className
      )}
    >
      <BadgeCheck className="size-3.5" aria-hidden="true" />
      مؤكد من العميل
    </Badge>
  );
}
