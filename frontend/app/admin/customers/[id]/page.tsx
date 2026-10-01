"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminCustomerDetail } from "@bannersin48/api-client";
import { rewardAdjustmentSchema } from "@bannersin48/shared";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Can, useCan } from "@/lib/auth/useCan";
import { centsLabel, customerStatusLabel, orderStatusLabel, paymentStatusLabel, rewardReasonLabel } from "@/lib/admin/labels";
import { RequirePermission } from "../../_components/require-permission";
import { ConfirmDialog } from "../../_components/confirm-dialog";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const TEXTAREA = "w-full rounded-btn border border-line-input px-md py-sm bg-surface text-ink text-sm";

export default function AdminCustomerDetailPage() {
  return (
    <RequirePermission perm="customers:read">
      <CustomerDetail />
    </RequirePermission>
  );
}

function CustomerDetail() {
  const id = String(useParams().id);
  const qc = useQueryClient();
  const canSeeRewards = useCan("rewards:read");
  const customer = useQuery({ queryKey: ["admin", "customer", id], queryFn: () => getAdminApiClient().customerDetail(id) });
  const rewards = useQuery({ queryKey: ["admin", "customer", id, "rewards"], queryFn: () => getAdminApiClient().customerRewards(id, { pageSize: 50 }), enabled: canSeeRewards });

  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [statusDialog, setStatusDialog] = useState<"suspend" | "reactivate" | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["admin", "customer", id] }), qc.invalidateQueries({ queryKey: ["admin", "customers"] })]);
  };
  const run = useMutation({
    mutationFn: async (input: { action: () => Promise<unknown>; done: string }) => {
      await input.action();
      return input.done;
    },
    onSuccess: async (done) => {
      setMessage({ tone: "ok", text: done });
      await refresh();
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });

  if (customer.isLoading) return <p className="text-ink-muted" role="status">Loading customer…</p>;
  if (customer.isError || !customer.data) return <p className="text-danger" role="alert">{(customer.error as Error | undefined)?.message ?? "Customer not found."}</p>;
  const data = customer.data;
  const suspended = data.account.status === "SUSPENDED";

  return (
    <div className="space-y-xl">
      <div>
        <Link href="/admin/customers" className="text-body-sm text-link no-underline hover:underline">← Customers</Link>
        <div className="flex flex-wrap items-center gap-sm mt-xs">
          <h1 className="font-display text-section-h2 text-ink">{data.user.fullName}</h1>
          <Badge variant={suspended ? "warning" : "success"} data-testid="customer-status">{customerStatusLabel(data.account.status)}</Badge>
        </div>
        <p className="text-body-sm text-ink-muted">
          {data.user.email} · customer since {new Date(data.user.createdAt).toLocaleDateString()}
          {data.account.lastLoginAt ? ` · last signed in ${new Date(data.account.lastLoginAt).toLocaleString()}` : ""}
        </p>
      </div>

      {message && (
        <div role={message.tone === "ok" ? "status" : "alert"} className={`rounded-feature p-md text-body-sm ${message.tone === "ok" ? "bg-success-bg text-success-fg" : "bg-badge-error-bg text-danger"}`} data-testid="customer-message">
          {message.text}
        </div>
      )}

      {suspended && (
        <div className="rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm" data-testid="customer-suspended-banner">
          Suspended {data.account.suspendedAt ? new Date(data.account.suspendedAt).toLocaleDateString() : ""}: {data.account.suspendedReason ?? "no reason recorded"}. The customer cannot sign in or order.
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <section className="lg:col-span-8 space-y-lg">
          <ProfileCard customer={data} onSaved={(text) => { setMessage({ tone: "ok", text }); void refresh(); }} onError={(text) => setMessage({ tone: "error", text })} />

          <Card className="bg-surface p-lg relative overflow-x-auto">
            <h2 className="text-heading-h4 text-ink mb-md">Order history</h2>
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
                      <td><Badge variant={order.status === "DELIVERED" ? "success" : "info"}>{orderStatusLabel(order.status)}</Badge></td>
                      <td className="text-ink-muted">{paymentStatusLabel(order.paymentStatus)}</td>
                      <td className="text-ink">{order.totalLabel}</td>
                      <td className="text-ink-muted">{new Date(order.placedAt ?? order.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Card>

          {canSeeRewards && (
            <Card className="bg-surface p-lg relative overflow-x-auto">
              <div className="flex flex-wrap items-start justify-between gap-sm mb-md">
                <div>
                  <h2 className="text-heading-h4 text-ink">Rewards</h2>
                  <p className="text-body-sm text-ink-muted">
                    Balance <span className="font-bold text-ink" data-testid="reward-balance">{centsLabel(rewards.data?.balanceCents ?? data.account.rewardBalanceCents)}</span>
                  </p>
                </div>
                <Can perm="rewards:adjust">
                  <Button type="button" variant="secondary" size="sm" onClick={() => setAdjustOpen(true)} data-testid="reward-adjust">Adjust balance</Button>
                </Can>
              </div>
              {rewards.isLoading ? (
                <p className="text-ink-muted" role="status">Loading ledger…</p>
              ) : rewards.isError ? (
                <p className="text-danger" role="alert">{(rewards.error as Error).message}</p>
              ) : (rewards.data?.ledger.length ?? 0) === 0 ? (
                <p className="text-body-sm text-ink-muted">No reward activity yet.</p>
              ) : (
                <table className="w-full text-body-sm" data-testid="reward-ledger-admin">
                  <caption className="sr-only">Reward ledger for {data.user.fullName}, newest first</caption>
                  <thead>
                    <tr className="text-left text-ink-muted border-b border-line-subtle">
                      <th scope="col" className="py-sm font-bold">Date</th>
                      <th scope="col" className="font-bold">Activity</th>
                      <th scope="col" className="font-bold">Order</th>
                      <th scope="col" className="font-bold">By</th>
                      <th scope="col" className="font-bold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rewards.data?.ledger.map((entry) => (
                      <tr key={entry.id} className="border-b border-line-subtle last:border-0">
                        <td className="py-sm text-ink whitespace-nowrap">{new Date(entry.createdAt).toLocaleDateString()}</td>
                        <td className="text-ink">{rewardReasonLabel(entry.reason)}</td>
                        <td>{entry.orderId && entry.orderNumber ? <Link href={`/admin/orders/${entry.orderId}`} className="text-link">{entry.orderNumber}</Link> : <span className="text-ink-muted">—</span>}</td>
                        <td className="text-ink-muted">{entry.createdByEmail ?? "System"}</td>
                        <td className={`text-right font-bold tabular-nums ${entry.deltaCents < 0 ? "text-ink-muted" : "text-ink"}`}>{centsLabel(entry.deltaCents, true)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          )}
        </section>

        <aside className="lg:col-span-4 space-y-lg">
          <Card className="bg-surface p-lg space-y-sm">
            <h2 className="text-heading-h4 text-ink">Account</h2>
            <dl className="text-body-sm grid grid-cols-[auto_1fr] gap-x-md gap-y-xs">
              <dt className="text-ink-muted">Status</dt>
              <dd className="text-ink">{customerStatusLabel(data.account.status)}</dd>
              <dt className="text-ink-muted">Email verified</dt>
              <dd className="text-ink">{data.account.emailVerifiedAt ? new Date(data.account.emailVerifiedAt).toLocaleDateString() : "No"}</dd>
              <dt className="text-ink-muted">Orders</dt>
              <dd className="text-ink tabular-nums">{data.account.orderCount}</dd>
              <dt className="text-ink-muted">Rewards</dt>
              <dd className="text-ink tabular-nums">{centsLabel(data.account.rewardBalanceCents)}</dd>
            </dl>
            <div className="flex flex-col gap-sm pt-sm">
              <Can perm="customers:suspend">
                {suspended ? (
                  <Button type="button" variant="secondary" onClick={() => setStatusDialog("reactivate")} data-testid="customer-reactivate">Reactivate account</Button>
                ) : (
                  <Button type="button" variant="secondary" onClick={() => setStatusDialog("suspend")} data-testid="customer-suspend">Suspend account</Button>
                )}
              </Can>
              <Can perm="customers:reset_password">
                <Button type="button" variant="secondary" onClick={() => setConfirmReset(true)}>Reset password</Button>
              </Can>
            </div>
          </Card>

          <Card className="bg-surface p-lg">
            <h2 className="text-heading-h4 text-ink mb-sm">Addresses</h2>
            {data.addresses.length === 0 ? (
              <p className="text-body-sm text-ink-muted">No saved addresses.</p>
            ) : (
              data.addresses.map((address) => (
                <address key={address.id} className="not-italic text-body-sm text-ink-muted leading-relaxed border-t border-line-subtle first:border-t-0 py-sm">
                  {address.label && <span className="block font-bold text-ink">{address.label}{address.isDefaultShipping ? " (default)" : ""}</span>}
                  {address.line1} {address.line2}
                  <br />
                  {address.city}, {address.state} {address.zip}
                </address>
              ))
            )}
          </Card>
        </aside>
      </div>

      <ConfirmDialog
        open={confirmReset}
        onOpenChange={setConfirmReset}
        title="Reset password?"
        description={`Send a password-reset email to ${data.user.email} and revoke their active sessions?`}
        confirmLabel="Send reset"
        busy={run.isPending}
        onConfirm={() => {
          setConfirmReset(false);
          run.mutate({ action: () => getAdminApiClient().adminResetPassword(id), done: "Password reset email queued and active sessions revoked." });
        }}
      />
      <StatusDialog
        mode={statusDialog}
        customer={data}
        busy={run.isPending}
        onClose={() => setStatusDialog(null)}
        onSubmit={(reason) => {
          const mode = statusDialog;
          setStatusDialog(null);
          if (mode === "suspend") run.mutate({ action: () => getAdminApiClient().suspendCustomer(id, reason), done: "Account suspended and sessions signed out." });
          if (mode === "reactivate") run.mutate({ action: () => getAdminApiClient().reactivateCustomer(id, reason || undefined), done: "Account reactivated." });
        }}
      />
      <AdjustRewardsDialog
        open={adjustOpen}
        customer={data}
        balanceCents={rewards.data?.balanceCents ?? data.account.rewardBalanceCents}
        onClose={() => setAdjustOpen(false)}
        onSaved={async (text) => {
          setAdjustOpen(false);
          setMessage({ tone: "ok", text });
          await Promise.all([refresh(), qc.invalidateQueries({ queryKey: ["admin", "customer", id, "rewards"] })]);
        }}
      />
    </div>
  );
}

function ProfileCard({ customer, onSaved, onError }: { customer: AdminCustomerDetail; onSaved: (text: string) => void; onError: (text: string) => void }) {
  const user = customer.user;
  const [firstName, setFirstName] = useState(user.firstName ?? "");
  const [lastName, setLastName] = useState(user.lastName ?? "");
  const [phone, setPhone] = useState(user.phone ?? "");
  useEffect(() => {
    setFirstName(user.firstName ?? "");
    setLastName(user.lastName ?? "");
    setPhone(user.phone ?? "");
  }, [user.firstName, user.lastName, user.phone]);
  const dirty = firstName !== (user.firstName ?? "") || lastName !== (user.lastName ?? "") || phone !== (user.phone ?? "");
  const save = useMutation({
    mutationFn: () => getAdminApiClient().updateCustomer(user.id, { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim() || null }),
    onSuccess: () => onSaved("Profile saved."),
    onError: (err) => onError((err as Error).message),
  });

  return (
    <Card className="bg-surface p-lg">
      <h2 className="text-heading-h4 text-ink mb-sm">Profile</h2>
      <Can
        perm="customers:update"
        fallback={
          <dl className="text-body-sm grid grid-cols-[auto_1fr] gap-x-md gap-y-xs">
            <dt className="text-ink-muted">Name</dt>
            <dd className="text-ink">{user.fullName}</dd>
            <dt className="text-ink-muted">Phone</dt>
            <dd className="text-ink">{user.phone ?? "—"}</dd>
          </dl>
        }
      >
        <form
          className="grid grid-cols-1 sm:grid-cols-3 gap-sm items-end"
          onSubmit={(e) => {
            e.preventDefault();
            save.mutate();
          }}
        >
          <label className="block" htmlFor="customer-first">
            <span className="text-body-sm text-ink-muted block mb-xs">First name</span>
            <Input id="customer-first" required maxLength={60} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </label>
          <label className="block" htmlFor="customer-last">
            <span className="text-body-sm text-ink-muted block mb-xs">Last name</span>
            <Input id="customer-last" required maxLength={60} value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </label>
          <label className="block" htmlFor="customer-phone">
            <span className="text-body-sm text-ink-muted block mb-xs">Phone</span>
            <Input id="customer-phone" maxLength={20} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </label>
          <div className="sm:col-span-3 flex justify-end">
            <Button type="submit" size="sm" disabled={!dirty || save.isPending} data-testid="customer-profile-save">{save.isPending ? "Saving…" : "Save profile"}</Button>
          </div>
        </form>
      </Can>
    </Card>
  );
}

function StatusDialog({ mode, customer, busy, onClose, onSubmit }: { mode: "suspend" | "reactivate" | null; customer: AdminCustomerDetail; busy: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState("");
  useEffect(() => setReason(""), [mode]);
  const suspend = mode === "suspend";
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="p-lg">
        <form
          className="space-y-md"
          onSubmit={(e) => {
            e.preventDefault();
            onSubmit(reason.trim());
          }}
        >
          <DialogTitle>{suspend ? "Suspend customer account?" : "Reactivate customer account?"}</DialogTitle>
          <DialogDescription>
            {suspend
              ? `${customer.user.email} is signed out everywhere and cannot sign in or order until reactivated. The reason is recorded in the audit log.`
              : `${customer.user.email} can sign in and order again.`}
          </DialogDescription>
          <label className="block" htmlFor="customer-status-reason">
            <span className="text-body-sm text-ink-muted block mb-xs">{suspend ? "Reason (required)" : "Note (optional)"}</span>
            <Input id="customer-status-reason" value={reason} onChange={(e) => setReason(e.target.value)} minLength={suspend ? 3 : 0} maxLength={200} required={suspend} data-testid="status-reason" />
          </label>
          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={busy || (suspend && reason.trim().length < 3)} className={suspend ? "bg-danger hover:bg-danger" : undefined} data-testid="status-confirm">
              {suspend ? "Suspend" : "Reactivate"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AdjustRewardsDialog({ open, customer, balanceCents, onClose, onSaved }: { open: boolean; customer: AdminCustomerDetail; balanceCents: number; onClose: () => void; onSaved: (text: string) => Promise<void> }) {
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (!open) return;
    setDirection("credit");
    setAmount("");
    setReason("");
    setError(null);
  }, [open]);

  const adjust = useMutation({
    mutationFn: (input: { deltaCents: number; reason: string }) => getAdminApiClient().adjustCustomerRewards(customer.user.id, input),
    onSuccess: (result) => onSaved(`Balance ${result.entry.deltaCents > 0 ? "credited" : "debited"} ${centsLabel(Math.abs(result.entry.deltaCents))}. New balance ${centsLabel(result.balanceCents)}.`),
    onError: (err) => setError((err as Error).message),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const cents = Math.round(Number(amount) * 100);
    const parsed = rewardAdjustmentSchema.safeParse({ deltaCents: direction === "debit" ? -cents : cents, reason });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Check the amount and reason.");
      return;
    }
    if (parsed.data.deltaCents < 0 && balanceCents + parsed.data.deltaCents < 0) {
      setError(`The balance is only ${centsLabel(balanceCents)}; you cannot deduct more than that.`);
      return;
    }
    adjust.mutate(parsed.data);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="p-lg">
        <form onSubmit={submit} className="space-y-md" noValidate>
          <DialogTitle>Adjust reward balance</DialogTitle>
          <DialogDescription>
            Current balance {centsLabel(balanceCents)}. Adjustments are capped at $500, cannot take the balance below zero, and are recorded in the ledger and the audit log with your reason.
          </DialogDescription>
          <fieldset className="border-0 p-0 m-0">
            <legend className="text-body-sm text-ink-muted mb-xs">Direction</legend>
            <div className="flex gap-lg text-body-sm text-ink">
              <label className="flex items-center gap-xs"><input type="radio" name="reward-direction" value="credit" checked={direction === "credit"} onChange={() => setDirection("credit")} className="accent-strong-accent" /> Credit (add)</label>
              <label className="flex items-center gap-xs"><input type="radio" name="reward-direction" value="debit" checked={direction === "debit"} onChange={() => setDirection("debit")} className="accent-strong-accent" /> Debit (remove)</label>
            </div>
          </fieldset>
          <label className="block" htmlFor="reward-amount">
            <span className="text-body-sm text-ink-muted block mb-xs">Amount (USD)</span>
            <Input id="reward-amount" type="number" inputMode="decimal" min={0.01} max={500} step={0.01} value={amount} onChange={(e) => setAmount(e.target.value)} data-testid="reward-amount" />
          </label>
          <label className="block" htmlFor="reward-reason">
            <span className="text-body-sm text-ink-muted block mb-xs">Reason (10–200 characters)</span>
            <textarea id="reward-reason" className={TEXTAREA} rows={3} minLength={10} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} data-testid="reward-reason" />
          </label>
          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}
          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={adjust.isPending} data-testid="reward-submit">{adjust.isPending ? "Saving…" : direction === "credit" ? "Credit balance" : "Debit balance"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
