import { cn } from "@/lib/utils";
import {
  ORDER_STATUS_AR,
  PAYMENT_STATUS_AR,
  type OrderStatus,
  type PaymentStatus,
} from "@/lib/constants";
import { Badge } from "@/components/ui/badge";

const STATUS_STYLES: Record<OrderStatus, string> = {
  NEW: "bg-primary/10 text-primary border-primary/25",
  CONFIRMED: "bg-chart-3/10 text-chart-3 border-chart-3/25",
  PREPARING: "bg-warning/15 text-warning-foreground border-warning/40",
  READY: "bg-saffron/15 text-accent-foreground border-saffron/40",
  OUT_FOR_DELIVERY: "bg-chart-3/10 text-chart-3 border-chart-3/25",
  DELIVERED: "bg-success/10 text-success border-success/25",
  CANCELLED: "bg-muted text-muted-foreground border-border",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/25",
};

const STATUS_DOTS: Record<OrderStatus, string> = {
  NEW: "bg-primary",
  CONFIRMED: "bg-chart-3",
  PREPARING: "bg-warning",
  READY: "bg-saffron",
  OUT_FOR_DELIVERY: "bg-chart-3",
  DELIVERED: "bg-success",
  CANCELLED: "bg-muted-foreground",
  REJECTED: "bg-destructive",
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
  PAID: "bg-success/10 text-success border-success/25",
  REFUNDED: "bg-destructive/10 text-destructive border-destructive/25",
};

export function PaymentStatusBadge({ status, className }: { status: PaymentStatus; className?: string }) {
  return (
    <Badge variant="outline" className={cn("font-medium", PAYMENT_STYLES[status], className)}>
      {PAYMENT_STATUS_AR[status]}
    </Badge>
  );
}
