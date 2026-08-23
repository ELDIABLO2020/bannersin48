"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const LABELS: Record<string, string> = {
  RECEIVED: "New",
  AWAITING_PAYMENT: "Awaiting payment",
  IN_PROCESSING: "Paid · in processing",
  ACCEPTED: "Accepted · tracking",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  ON_HOLD: "On hold",
  CANCELLED: "Cancelled",
};

export default function AdminOrderBoardPage() {
  const [selected, setSelected] = useState("RECEIVED");
  const buckets = useQuery({ queryKey: ["admin", "buckets"], queryFn: () => getAdminApiClient().buckets(), refetchInterval: 30_000 });
  const orders = useQuery({
    queryKey: ["admin", "orders", selected],
    queryFn: () => getAdminApiClient().listOrders({ status: selected, pageSize: 50 }),
  });

  return (
    <div className="space-y-xl">
      <div>
        <p className="text-body-sm text-ink-muted">Operations</p>
        <h1 className="font-display text-section-h2 text-ink">Order board</h1>
      </div>

      {buckets.isError && <ErrorBox error={buckets.error} />}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {(buckets.data?.buckets ?? []).map((bucket) => (
          <button key={bucket.status} type="button" onClick={() => setSelected(bucket.status)} className="text-left border-0 bg-transparent p-0 cursor-pointer">
            <Card className={`h-full bg-surface p-md border ${selected === bucket.status ? "border-link" : "border-line-subtle"}`}>
              <div className="flex items-start justify-between gap-sm">
                <span className="font-bold text-ink">{LABELS[bucket.status] ?? bucket.status}</span>
                <span className="font-display text-heading-h3 text-ink tabular-nums">{bucket.count}</span>
              </div>
              {bucket.slaBreachedCount > 0 && (
                <p className="mt-sm text-xs font-bold text-danger">{bucket.slaBreachedCount} past 48-business-hour SLA</p>
              )}
            </Card>
          </button>
        ))}
      </div>

      <Card className="bg-surface p-lg overflow-hidden">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-bold text-heading-h4 text-ink">{LABELS[selected] ?? selected}</h2>
          <span className="text-body-sm text-ink-muted">{orders.data?.total ?? 0} orders</span>
        </div>
        {orders.isLoading ? (
          <p className="text-ink-muted py-xl">Loading orders…</p>
        ) : orders.isError ? (
          <ErrorBox error={orders.error} />
        ) : orders.data?.items.length === 0 ? (
          <p className="text-ink-muted py-xl">No orders in this bucket.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-body-sm">
              <thead><tr className="border-b border-line-subtle text-left text-ink-muted"><th className="py-sm">Order</th><th>Customer</th><th>Item</th><th>Total</th><th>Placed</th><th>SLA</th></tr></thead>
              <tbody>
                {orders.data?.items.map((order) => (
                  <tr key={order.id} className="border-b border-line-subtle last:border-0">
                    <td className="py-md"><Link className="font-bold text-link no-underline hover:underline" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                    <td className="text-ink">{order.userEmail}</td>
                    <td className="text-ink">{order.firstLineLabel}</td>
                    <td className="text-ink tabular-nums">{order.totalLabel}</td>
                    <td className="text-ink-muted">{order.placedAt ? new Date(order.placedAt).toLocaleString() : "—"}</td>
                    <td>{order.slaBreached ? <Badge variant="error">Past SLA</Badge> : <Badge variant="neutral">OK</Badge>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return <div role="alert" className="rounded-feature bg-badge-error-bg text-danger p-md text-body-sm">{(error as Error).message}</div>;
}
