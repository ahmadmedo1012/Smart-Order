import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

/**
 * Solid pastel status chips — canonical Madarek `.badge` status family
 * (components.css:490-527): solid `-bg` ground + `-deep` ink (no border,
 * no alpha wash), 11px/600, 6px currentColor dot, quiet resting shadow.
 * Mapping (W1-F P1-3): NEW→copper, CONFIRMED/OUT→sky, PREPARING→yellow,
 * READY→copper, DELIVERED→mint, CANCELLED→grey, REJECTED→rose,
 * PAID→mint, REFUNDED→rose, UNPAID→grey. The 9 families are tokenized
 * in globals (`--c-<family>-bg/-ink/-deep`) and flip with the theme.
 */
export const ORDER_STATUS_CHIP: Record<OrderStatus, string> = {
  NEW: "bg-(--c-copper-bg) text-(--c-copper-deep)",
  CONFIRMED: "bg-(--c-sky-bg) text-(--c-sky-deep)",
  PREPARING: "bg-(--c-yellow-bg) text-(--c-yellow-deep)",
  READY: "bg-(--c-copper-bg) text-(--c-copper-deep)",
  OUT_FOR_DELIVERY: "bg-(--c-sky-bg) text-(--c-sky-deep)",
  DELIVERED: "bg-(--c-mint-bg) text-(--c-mint-deep)",
  CANCELLED: "bg-(--c-grey-bg) text-(--c-grey-deep)",
  REJECTED: "bg-(--c-rose-bg) text-(--c-rose-deep)",
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
        "h-auto gap-1.5 border-0 px-2.5 py-1 text-[11px] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-transform duration-(--t-fast) ease-smooth hover:-translate-y-px",
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
  UNPAID: "bg-(--c-grey-bg) text-(--c-grey-deep)",
  PAID: "bg-(--c-mint-bg) text-(--c-mint-deep)",
  REFUNDED: "bg-(--c-rose-bg) text-(--c-rose-deep)",
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Badge
      className={cn(
        "h-auto border-0 px-2.5 py-1 text-[11px] font-semibold shadow-[0_1px_2px_rgb(0_0_0/0.06)] transition-transform duration-(--t-fast) ease-smooth hover:-translate-y-px",
        PAYMENT_CHIP[status],
        className
      )}
    >
      {PAYMENT_STATUS_AR[status]}
    </Badge>
  );
}
