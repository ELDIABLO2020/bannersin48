import type { OrderStatus } from "@bannersin48/shared";
import { ORDER_STATUS_LABELS } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Clock, CheckCircle2, AlertCircle, XCircle, Package, Send, type LucideIcon } from "lucide-react";

const VARIANT: Record<OrderStatus, { bg: string; icon: LucideIcon; tone: "info" | "success" | "warning" | "error" | "neutral" }> = {
  AWAITING_PAYMENT: { bg: "var(--color-bg-navy-deep)", icon: Clock, tone: "info" },
  AWAITING_PROOF_APPROVAL: { bg: "var(--color-bg-navy-deep)", icon: Clock, tone: "info" },
  CANCELLATION_WINDOW: { bg: "var(--color-bg-warning)", icon: Clock, tone: "warning" },
  READY_FOR_TRANSFER: { bg: "var(--color-bg-link)", icon: Package, tone: "info" },
  TRANSFERRED_TO_PRODUCTION: { bg: "var(--color-bg-link)", icon: Send, tone: "info" },
  IN_PRODUCTION: { bg: "var(--color-bg-link)", icon: Package, tone: "info" },
  SHIPPED: { bg: "var(--color-bg-link)", icon: Truck, tone: "info" },
  DELIVERED: { bg: "var(--color-bg-success)", icon: CheckCircle2, tone: "success" },
  EXCEPTION: { bg: "var(--color-bg-error)", icon: AlertCircle, tone: "error" },
  CANCELLED: { bg: "var(--color-bg-error)", icon: XCircle, tone: "error" },
  REFUNDED: { bg: "var(--color-bg-error)", icon: XCircle, tone: "error" },
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
  return (
    <Card className="text-white" style={{ backgroundColor: v.bg }}>
      <div className="flex items-start gap-md">
        <div className="rounded-pill bg-white/15 p-md shrink-0">
          <Icon className="h-6 w-6" aria-hidden />
        </div>
        <div className="flex-1">
          <p className="text-body-sm text-white/70">Order {orderNumber}</p>
          <h1 className="font-display text-2xl font-bold mt-xs">{ORDER_STATUS_LABELS[status]}</h1>
          {status !== "CANCELLED" && status !== "REFUNDED" && status !== "EXCEPTION" && (
            <p className="text-body-sm text-white/80 mt-sm">
              Guaranteed delivery by <strong className="text-white">{guaranteedDeliveryDow}</strong> at 12:00 PM
            </p>
          )}
        </div>
        <Badge variant="neutral" className="bg-white/15 text-white">{status}</Badge>
      </div>
    </Card>
  );
}
