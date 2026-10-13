import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

/**
 * STATUS STAMPS (r152, Phase 5 Route & Node): the order/payment states
 * speak the shipping-stamp language — solid family ground + family deep
 * ink + a 1px family-ink border + the squared stamp corner. Mapping
 * (unchanged since W1-F P1-3): NEW→copper (delivery orange), CONFIRMED/
 * OUT→sky (steel), PREPARING→yellow (amber), READY→copper, DELIVERED→
 * mint (green), CANCELLED→grey, REJECTED→rose, PAID→mint, REFUNDED→
 * rose, UNPAID→grey. The 9 families are tokenized in globals
 * (`--c-<family>-bg/-ink/-deep`) and flip with the theme.
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
        "h-auto gap-1.5 px-2.5 py-1 text-[11px] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-transform duration-(--t-fast) ease-smooth hover:-translate-y-px",
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
        "h-auto px-2.5 py-1 text-[11px] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-transform duration-(--t-fast) ease-smooth hover:-translate-y-px",
        PAYMENT_CHIP[status],
        className
      )}
    >
      {PAYMENT_STATUS_AR[status]}
    </Badge>
  );
}
