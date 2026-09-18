import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "bg-orange/15 text-orange border-orange/25",
  CONFIRMED: "bg-info/15 text-info border-info/25",
  PREPARING: "bg-warning/15 text-warning border-warning/25",
  READY: "bg-saffron/15 text-ember dark:text-saffron border-saffron/25",
  OUT_FOR_DELIVERY: "bg-info/15 text-info border-info/25",
  DELIVERED: "bg-success/15 text-success border-success/25",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  REJECTED: "bg-destructive/15 text-destructive border-destructive/25",
};

const STATUS_DOTS: Record<OrderStatus, string> = {
  NEW: "bg-orange",
  CONFIRMED: "bg-info",
  PREPARING: "bg-warning",
  READY: "bg-saffron",
  OUT_FOR_DELIVERY: "bg-info",
  DELIVERED: "bg-success",
  CANCELLED: "bg-muted-foreground",
  REJECTED: "bg-destructive",
};;

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
      variant="outline"
      className={cn("gap-1.5 font-medium border", STATUS_STYLES[status], className)}
    >
      {dot && <span className={cn("size-1.5 rounded-full", STATUS_DOTS[status])} />}
      {ORDER_STATUS_AR[status]}
    </Badge>
  );
}

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  UNPAID: "bg-muted text-muted-foreground border-border",
  PAID: "bg-success/15 text-success border-success/25",
  REFUNDED: "bg-destructive/15 text-destructive border-destructive/25",
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PAYMENT_STYLES[status], className)}>
      {PAYMENT_STATUS_AR[status]}
    </Badge>
  );
}
