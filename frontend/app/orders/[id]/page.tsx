"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { ChevronRight } from "lucide-react";
import { StatusHeroCard } from "@/components/orders/StatusHeroCard";
import { OrderTimeline } from "@/components/orders/OrderTimeline";

export default function OrderDetailPage() {
  const params = useParams<{ id: string }>();
  const orderId = params?.id ?? "";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getApiClient().getOrder(orderId),
    enabled: !!orderId,
  });

  if (isLoading) {
    return <div className="p-md text-ink-muted">Loading…</div>;
  }
  if (!order) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center">
        <div className="bg-surface rounded-card p-3xl text-center">
          <p className="text-ink">Order not found.</p>
          <Link href="/" className="text-link">Back to home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-link no-underline">Dashboard</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Order {order.orderNumber}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-8 space-y-lg">
            <StatusHeroCard
              status={order.status}
              orderNumber={order.orderNumber}
              guaranteedDeliveryDow={order.guaranteedDeliveryDow}
            />

            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Tracking</h2>
              {order.fedexTracking ? (
                <div>
                  <p className="text-sm text-ink-muted">Tracking number</p>
                  <p className="font-mono text-ink font-bold">{order.fedexTracking.trackingNumber}</p>
                  <p className="text-body-sm text-ink-muted mt-xs">
                    {order.fedexTracking.service} · {order.fedexTracking.status}
                  </p>
                </div>
              ) : (
                <p className="text-body-sm text-ink-muted">
                  We&rsquo;ll add tracking as soon as FedEx scans the package. You&rsquo;ll get an email.
                </p>
              )}
            </Card>

            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Order details</h2>
              <ul className="space-y-md">
                {order.lines.map((l) => (
                  <li key={l.id} className="border-t border-line first:border-0 pt-md first:pt-0">
                    <div className="flex justify-between gap-md">
                      <div>
                        <p className="font-bold text-ink">
                          {l.billableDims.widthFt}&prime; × {l.billableDims.heightFt}&prime; · {l.material.replaceAll("_", " ")}
                        </p>
                        <p className="text-body-sm text-ink-muted mt-xs">
                          Qty {l.quantity} · {l.finishing.polePockets ? `Pole pockets (${l.finishing.polePocketPlacement})` : "Welded + grommets"}
                          {l.finishing.windSlits && " · Wind slits"}
                        </p>
                      </div>
                      <p className="text-heading-h4 font-bold text-ink tabular-nums">{formatUsd(l.totalBeforeTax)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>

            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Price breakdown</h2>
              <dl className="text-sm space-y-xs">
                <Row label="Subtotal" value={formatUsd(order.subtotal)} />
                <Row label="Shipping" value={formatUsd(order.shipping)} />
                <Row label="Tax" value={formatUsd(order.tax)} />
                <Row label="Rewards discount" value={`− ${formatUsd(order.rewardsDiscount)}`} />
                <div className="border-t border-line my-sm" />
                <Row label="Total" value={formatUsd(order.total)} bold />
              </dl>
            </Card>

            <div className="flex flex-col sm:flex-row gap-sm">
              {order.status === "AWAITING_PROOF_APPROVAL" && (
                <Link href={`/orders/${order.id}/proof`} className="flex-1">
                  <Button variant="cta" size="lg" className="w-full">Review &amp; approve proof</Button>
                </Link>
              )}
              {order.status === "CANCELLATION_WINDOW" && (
                <Link href={`/orders/${order.id}/proof`} className="flex-1">
                  <Button variant="cta" size="lg" className="w-full">View cancellation window</Button>
                </Link>
              )}
              <Link href={`/orders/${order.id}/reorder`} className="flex-1">
                <Button variant="secondary" size="lg" className="w-full">Reorder this</Button>
              </Link>
            </div>
          </div>

          <aside className="lg:col-span-4">
            <Card className="bg-surface sticky top-20">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Timeline</h2>
              <OrderTimeline status={order.status} />
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-ink" : "text-ink-muted"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
