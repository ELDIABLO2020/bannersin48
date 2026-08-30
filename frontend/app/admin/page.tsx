"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const PAGE_SIZE = 25;

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
  const [page, setPage] = useState(1);
  const buckets = useQuery({ queryKey: ["admin", "buckets"], queryFn: () => getAdminApiClient().buckets(), refetchInterval: 30_000 });
  const orders = useQuery({
    queryKey: ["admin", "orders", selected, page],
    queryFn: () => getAdminApiClient().listOrders({ status: selected, page, pageSize: PAGE_SIZE }),
  });

  const total = orders.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-xl">
      <div>
        <p className="text-body-sm text-ink-muted">Operations</p>
        <h1 className="font-display text-section-h2 text-ink">Order board</h1>
      </div>

      {buckets.isError && <ErrorBox error={buckets.error} />}
      <fieldset className="border-0 p-0 m-0">
        <legend className="text-body-sm font-bold text-ink mb-sm sr-only">Filter by order status</legend>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
          {(buckets.data?.buckets ?? []).map((bucket) => (
            <button
              key={bucket.status}
              type="button"
              onClick={() => {
                setSelected(bucket.status);
                setPage(1);
              }}
              aria-pressed={selected === bucket.status}
              className="text-left border-0 bg-transparent p-0 cursor-pointer"
            >
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
      </fieldset>

      <Card className="bg-surface p-lg overflow-hidden">
        <div className="flex items-center justify-between mb-md">
          <h2 className="font-bold text-heading-h4 text-ink">{LABELS[selected] ?? selected}</h2>
          <span className="text-body-sm text-ink-muted" aria-live="polite">
            {orders.isLoading ? "Loading…" : `${total} orders`}
          </span>
        </div>
        {orders.isLoading ? (
          <p className="text-ink-muted py-xl" role="status">Loading orders…</p>
        ) : orders.isError ? (
          <ErrorBox error={orders.error} />
        ) : orders.data?.items.length === 0 ? (
          <div className="py-xl text-center">
            <p className="text-ink-muted">No orders in this bucket.</p>
            <p className="text-body-sm text-ink-muted mt-xs">Choose another status or check back later.</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <caption className="sr-only">
                  {LABELS[selected] ?? selected} orders, page {page} of {totalPages}
                </caption>
                <thead>
                  <tr className="border-b border-line-subtle text-left text-ink-muted">
                    <th scope="col" className="py-sm font-bold">Order</th>
                    <th scope="col" className="font-bold">Customer</th>
                    <th scope="col" className="font-bold">Item</th>
                    <th scope="col" className="font-bold">Total</th>
                    <th scope="col" className="font-bold">Placed</th>
                    <th scope="col" className="font-bold">SLA</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.data?.items.map((order) => (
                    <tr key={order.id} className="border-b border-line-subtle last:border-0">
                      <td className="py-md"><Link className="font-bold text-link no-underline hover:underline" href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link></td>
                      <td className="text-ink">{order.userEmail ?? "—"}</td>
                      <td className="text-ink">{order.firstLineLabel}</td>
                      <td className="text-ink tabular-nums">{order.totalLabel}</td>
                      <td className="text-ink-muted">{order.placedAt ? new Date(order.placedAt).toLocaleString() : "—"}</td>
                      <td>{order.slaBreached ? <Badge variant="error">Past SLA</Badge> : <Badge variant="neutral">OK</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-md mt-md">
              <span className="text-body-sm text-ink-muted">
                Page {page} of {totalPages}
              </span>
              <div className="flex gap-sm">
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Previous
                </Button>
                <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

function ErrorBox({ error }: { error: unknown }) {
  return <div role="alert" className="rounded-feature bg-badge-error-bg text-danger p-md text-body-sm">{(error as Error).message}</div>;
}
