import type { OrderStatus } from "@bannersin48/shared";
import { ORDER_STATUS_LABELS } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock, CheckCircle2, AlertCircle, XCircle, Package, Send, type LucideIcon } from "lucide-react";

const VARIANT: Record<OrderStatus, { bg: string; icon: LucideIcon; tone: "info" | "success" | "warning" | "error" | "neutral" }> = {
  RECEIVED: { bg: "var(--color-bg-soft-accent)", icon: Package, tone: "info" },
  AWAITING_PAYMENT: { bg: "var(--color-bg-soft-accent)", icon: Clock, tone: "info" },
  IN_PROCESSING: { bg: "var(--color-bg-soft-accent)", icon: Package, tone: "info" },
  ACCEPTED: { bg: "var(--color-strong-accent)", icon: Send, tone: "info" },
  ON_HOLD: { bg: "var(--color-warning)", icon: AlertCircle, tone: "warning" },
  SHIPPED: { bg: "var(--color-strong-accent)", icon: Truck, tone: "info" },
  DELIVERED: { bg: "var(--color-success)", icon: CheckCircle2, tone: "success" },
  CANCELLED: { bg: "var(--color-error)", icon: XCircle, tone: "error" },
};

export function StatusHeroCard({
  status,
  orderNumber,
  guaranteedDeliveryDow,
}: {
  status: OrderStatus;
  orderNumber: string;
  guaranteedDeliveryDow: string;
}) {
  const v = VARIANT[status];
  const Icon = v.icon;
  const isLight = ["RECEIVED", "AWAITING_PAYMENT", "IN_PROCESSING"].includes(status);
  return (
    <Card
      className={isLight ? "text-ink" : "text-white"}
      style={{ backgroundColor: v.bg }}
    >
      <div className="flex items-start gap-md">
        <div
          className={cn_tonePill(isLight)}
          aria-hidden
        >
          <Icon className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <p className={isLight ? "text-body-sm text-ink-muted" : "text-body-sm text-white/70"}>
            Order {orderNumber}
          </p>
          <h1 className="font-display font-extrabold tracking-tight text-2xl mt-xs">
            {ORDER_STATUS_LABELS[status]}
          </h1>
          {status !== "CANCELLED" && (
            <p className={isLight ? "text-body-sm text-ink mt-sm" : "text-body-sm text-white/80 mt-sm"}>
              Guaranteed delivery by{" "}
              <strong className={isLight ? "text-strong-accent" : "text-white"}>
                {guaranteedDeliveryDow}
              </strong>{" "}
              at 12:00 PM
            </p>
          )}
        </div>
        <Badge
          variant="neutral"
          className={isLight ? "bg-white/70 text-ink" : "bg-white/15 text-white"}
        >
          {ORDER_STATUS_LABELS[status]}
        </Badge>
      </div>
    </Card>
  );
}

function cn_tonePill(isLight: boolean): string {
  return [
    "rounded-pill p-md shrink-0 inline-flex items-center justify-center",
    isLight ? "bg-white text-strong-accent" : "bg-white/15 text-white",
  ].join(" ");
}
