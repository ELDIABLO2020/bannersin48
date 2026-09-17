"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ORDER_STATUS_LABELS, type OrderStatus } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useCart } from "@/lib/stores/cart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STATUS_TONE: Record<OrderStatus, "info" | "success" | "warning" | "error" | "neutral"> = {
  RECEIVED: "warning",
  AWAITING_PAYMENT: "warning",
  IN_PROCESSING: "info",
  ACCEPTED: "info",
  ON_HOLD: "warning",
  SHIPPED: "info",
  DELIVERED: "success",
  CANCELLED: "error",
};

/** The signed-in customer's orders, newest first, with view and reorder. */
export function OrderList({ limit }: { limit?: number }) {
  const router = useRouter();
  const loadFromReorder = useCart((s) => s.loadFromReorder);

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders"],
    queryFn: () => getApiClient().listOrders(),
  });

  const reorder = useMutation({
    mutationFn: (id: string) => getApiClient().reorder(id),
    onSuccess: (res) => {
      loadFromReorder(res);
      router.push("/cart");
    },
  });

  if (isLoading) {
    return <div className="h-32 rounded-card bg-surface animate-pulse-slow" role="status" aria-label="Loading orders" />;
  }

  if (!orders || orders.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-xl">
        <p className="text-body text-ink">You have not placed an order yet.</p>
        <Link href="/order" className="mt-md inline-block">
          <Button variant="cta" size="md">Order your first banner</Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="rounded-card border border-line bg-surface divide-y divide-line">
      {(limit ? orders.slice(0, limit) : orders).map((o) => (
        <li
          key={o.id}
          className="grid grid-cols-1 gap-md p-lg sm:grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_auto] lg:items-center"
        >
          <div>
            <p className="font-bold text-body text-ink">
              {o.firstLineLabel} <span className="font-normal text-ink-muted">× {o.firstLineQty}</span>
            </p>
            <p className="mt-xs text-body-sm text-ink-muted">
              Order {o.orderNumber}, placed {new Date(o.createdAt).toLocaleDateString()}. Delivery{" "}
              {o.guaranteedDeliveryDate}.
            </p>
          </div>
          <div className="flex items-center gap-md">
            <Badge variant={STATUS_TONE[o.status]}>{ORDER_STATUS_LABELS[o.status]}</Badge>
            <span className="font-display text-heading-h3 text-ink tabular-nums">{o.totalLabel}</span>
          </div>
          <div className="flex gap-sm">
            <Link href={`/orders/${o.id}`}>
              <Button variant="secondary" size="sm">View</Button>
            </Link>
            <Button variant="ghost" size="sm" onClick={() => reorder.mutate(o.id)} disabled={reorder.isPending}>
              Reorder
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
