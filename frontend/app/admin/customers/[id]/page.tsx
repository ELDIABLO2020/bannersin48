"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "../../_components/confirm-dialog";

export default function AdminCustomerDetailPage() {
  const id = String(useParams().id);
  const customer = useQuery({ queryKey: ["admin", "customer", id], queryFn: () => getAdminApiClient().customerDetail(id) });
  const reset = useMutation({ mutationFn: () => getAdminApiClient().adminResetPassword(id) });
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (customer.isLoading) return <p className="text-ink-muted" role="status">Loading customer…</p>;
  if (customer.isError || !customer.data) return <p className="text-danger" role="alert">{(customer.error as Error | undefined)?.message ?? "Customer not found."}</p>;
  const data = customer.data;

  return (
    <div className="space-y-xl">
      <div>
        <Link href="/admin/customers" className="text-body-sm text-link no-underline hover:underline">← Customers</Link>
        <div className="flex flex-wrap items-center gap-sm mt-xs">
          <h1 className="font-display text-section-h2 text-ink">{data.user.fullName}</h1>
          <Badge variant="neutral">{(data.user.role ?? "CUSTOMER").replace("_", " ")}</Badge>
        </div>
        <p className="text-body-sm text-ink-muted">{data.user.email}</p>
      </div>

      {reset.isSuccess && <div className="rounded-feature bg-success-bg text-success-fg p-md text-body-sm" role="status">Password reset email queued and active sessions revoked.</div>}
      {reset.isError && <div className="rounded-feature bg-badge-error-bg text-danger p-md text-body-sm" role="alert">{(reset.error as Error).message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <section className="lg:col-span-8">
          <Card className="bg-surface p-lg overflow-x-auto">
            <h2 className="font-bold text-heading-h4 text-ink mb-md">Order history</h2>
            {data.orders.length === 0 ? (
              <p className="text-ink-muted">No orders yet.</p>
            ) : (
              <table className="w-full text-body-sm">
                <caption className="sr-only">Order history for {data.user.fullName}</caption>
                <thead>
                  <tr className="text-left text-ink-muted border-b border-line-subtle">
                    <th scope="col" className="py-sm font-bold">Order</th>
                    <th scope="col" className="font-bold">Status</th>
                    <th scope="col" className="font-bold">Payment</th>
                    <th scope="col" className="font-bold">Total</th>
                    <th scope="col" className="font-bold">Placed</th>
                  </tr>
                </thead>
                <tbody>
                  {data.orders.map((order) => (
                    <tr key={order.id} className="border-b border-line-subtle last:border-0">
                      <td className="py-md"><Link href={`/admin/orders/${order.id}`} className="font-bold text-link no-underline hover:underline">{order.orderNumber}</Link></td>
                      <td><Badge variant={order.status === "DELIVERED" ? "success" : "info"}>{order.status.replace("_", " ")}</Badge></td>
                      <td className="text-ink-muted">{order.paymentStatus.replace("_", " ")}</td>
                      <td className="text-ink">{order.totalLabel}</td>
                      <td className="text-ink-muted">{new Date(order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>
        </section>
        <aside className="lg:col-span-4 space-y-lg">
          <Card className="bg-surface p-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-sm">Account</h2>
            <p className="text-body-sm text-ink-muted">Rewards balance: {data.user.rewardsPoints}</p>
            <Button
              className="w-full mt-md"
              variant="secondary"
              onClick={() => setConfirmOpen(true)}
            >
              Reset password
            </Button>
          </Card>
          <Card className="bg-surface p-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-sm">Addresses</h2>
            {data.addresses.length === 0 ? (
              <p className="text-body-sm text-ink-muted">No saved addresses.</p>
            ) : (
              data.addresses.map((address, i) => (
                <pre key={String(address.id ?? i)} className="text-xs text-ink-muted whitespace-pre-wrap">{JSON.stringify(address, null, 2)}</pre>
              ))
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Reset password?"
        description={`Send a password-reset email to ${data.user.email} and revoke their active sessions?`}
        confirmLabel="Send reset"
        busy={reset.isPending}
        onConfirm={() => {
          setConfirmOpen(false);
          reset.mutate();
        }}
      />
    </div>
  );
}
