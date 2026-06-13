"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { useCart } from "@/lib/stores/cart";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const STATUS_TONE: Record<OrderStatus, "info" | "success" | "warning" | "error" | "neutral"> = {
  AWAITING_PAYMENT: "warning",
  AWAITING_PROOF_APPROVAL: "info",
  CANCELLATION_WINDOW: "warning",
  READY_FOR_TRANSFER: "info",
  TRANSFERRED_TO_PRODUCTION: "info",
  IN_PRODUCTION: "info",
  SHIPPED: "info",
  DELIVERED: "success",
  EXCEPTION: "error",
  CANCELLED: "error",
  REFUNDED: "error",
};

export default function OrdersListPage() {
  const auth = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const loadFromOrder = useCart((s) => s.loadFromOrder);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getApiClient().listOrders(),
    enabled: !!auth.user,
  });

  const reorder = useMutation({
    mutationFn: (id: string) => getApiClient().reorder(id),
    onSuccess: (res) => {
      loadFromOrder(res.order);
      router.push("/cart");
    },
  });

  if (!auth.user) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center px-md">
        <Card className="bg-surface max-w-md w-full text-center p-3xl">
          <h1 className="font-display text-section-h2 text-ink">Sign in to view your orders</h1>
          <div className="flex gap-sm mt-xl">
            <Link href="/login" className="flex-1"><Button variant="cta" size="block" className="w-full">Log in</Button></Link>
            <Link href="/register" className="flex-1"><Button variant="secondary" size="block" className="w-full">Register</Button></Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">Your orders</h1>
        {isLoading ? (
          <Card className="bg-surface animate-pulse-slow h-32" />
        ) : !orders || orders.length === 0 ? (
          <Card className="bg-surface text-center p-2xl">
            <p className="text-ink-muted">No orders yet.</p>
            <Link href="/order/vinyl"><Button variant="cta" size="md" className="mt-md">Start your first order</Button></Link>
          </Card>
        ) : (
          <ul className="space-y-sm">
            {orders.map((o) => (
              <li key={o.id}>
                <Card className="bg-surface">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-md">
                    <div>
                      <p className="text-body-sm text-ink-muted">Order {o.orderNumber}</p>
                      <p className="font-bold text-ink mt-xs">
                        {o.firstLineLabel} <span className="text-ink-muted font-normal">× {o.firstLineQty}</span>
                      </p>
                      <p className="text-body-sm text-ink-muted mt-xs">
                        Placed {new Date(o.createdAt).toLocaleDateString()} · Delivery {o.guaranteedDeliveryDate}
                      </p>
                    </div>
                    <div className="flex items-center gap-md">
                      <Badge variant={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
                      <span className="text-heading-h4 font-bold text-ink tabular-nums">{o.totalLabel}</span>
                    </div>
                    <div className="flex gap-sm">
                      <Link href={`/orders/${o.id}`}><Button variant="secondary" size="sm">View</Button></Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => reorder.mutate(o.id)}
                        disabled={reorder.isPending}
                      >
                        Reorder
                      </Button>
                    </div>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
