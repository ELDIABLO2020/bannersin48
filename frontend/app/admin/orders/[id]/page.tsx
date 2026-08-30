"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "../../_components/confirm-dialog";

type ConfirmAction =
  | { kind: "markPaid"; title: string; description: string }
  | { kind: "transition"; status: string; title: string; description: string; destructive: boolean; reason: string };

export default function AdminOrderWorkspacePage() {
  const id = String(useParams().id);
  const qc = useQueryClient();
  const [externalRef, setExternalRef] = useState("");
  const [dropshipNotes, setDropshipNotes] = useState("");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [label, setLabel] = useState<File | undefined>();
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmAction | null>(null);

  const detail = useQuery({ queryKey: ["admin", "order", id], queryFn: () => getAdminApiClient().orderDetail(id) });
  const refresh = async () => {
    setMessage(null);
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["admin", "order", id] }),
      qc.invalidateQueries({ queryKey: ["admin", "orders"] }),
      qc.invalidateQueries({ queryKey: ["admin", "buckets"] }),
    ]);
  };
  const mutation = useMutation({
    mutationFn: async (action: () => Promise<unknown>) => action(),
    onSuccess: async () => { setMessage("Saved."); await refresh(); },
    onError: (error) => setMessage((error as Error).message),
  });

  if (detail.isLoading) return <p className="text-ink-muted" role="status">Loading order…</p>;
  if (detail.isError || !detail.data) return <ErrorBox text={(detail.error as Error | undefined)?.message ?? "Order not found."} />;
  const order = detail.data;
  const ship = order.shipTo ?? {};

  const confirmDescription = (a: ConfirmAction) => a.description;

  return (
    <div className="space-y-xl">
      <div className="flex flex-wrap items-start justify-between gap-md">
        <div>
          <Link href="/admin" className="text-body-sm text-link no-underline hover:underline">← Order board</Link>
          <div className="flex items-center gap-sm mt-xs">
            <h1 className="font-display text-section-h2 text-ink">{order.orderNumber}</h1>
            <Badge variant={order.status === "DELIVERED" ? "success" : order.status === "CANCELLED" ? "error" : "info"}>{order.status.replace("_", " ")}</Badge>
            {order.slaBreached && <Badge variant="error">Past SLA</Badge>}
          </div>
          <p className="text-body-sm text-ink-muted">{order.customer.email} · Payment: {order.paymentStatus.replace("_", " ")}</p>
        </div>
        <div className="text-right">
          <p className="font-display text-heading-h3 text-ink">${order.total.toFixed(2)}</p>
          <p className="text-xs text-ink-muted">Subtotal ${order.subtotal.toFixed(2)} · Shipping ${order.shipping.toFixed(2)}</p>
        </div>
      </div>

      {message && <div className={`rounded-feature p-md text-body-sm ${message === "Saved." ? "bg-success-bg text-success-fg" : "bg-badge-error-bg text-danger"}`} role="status">{message}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <section className="lg:col-span-8 space-y-lg">
          <Card className="bg-surface p-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-md">Configuration & artwork</h2>
            <div className="space-y-lg">
              {order.items.map((raw, index) => {
                const item = raw as Record<string, unknown>;
                const artwork = item.artwork as Record<string, unknown> | null;
                const snapshot = item.configSnapshot as Record<string, unknown> | undefined;
                return (
                  <div key={String(item.id ?? index)} className="border border-line-subtle rounded-feature p-md">
                    <div className="flex flex-wrap justify-between gap-sm">
                      <div><p className="font-bold text-ink">{String(item.productName ?? item.description ?? "Banner")}</p><p className="text-body-sm text-ink-muted">{String(item.material ?? "")} · Qty {String(item.quantity ?? "")}</p></div>
                      <p className="font-bold text-ink">${Number(item.totalBeforeTax ?? 0).toFixed(2)}</p>
                    </div>
                    <dl className="grid grid-cols-2 md:grid-cols-4 gap-sm mt-md text-body-sm">
                      <Readout label="Size" value={formatBillable(item.billableDims)} />
                      <Readout label="Billable" value={`${String(item.billableSqFt ?? "—")} sqft`} />
                      <Readout label="Sides" value={String(item.printSides ?? "single")} />
                      <Readout label="Finishing" value={formatFinishing(item.finishing)} />
                    </dl>
                    {artwork && (
                      <div className="mt-md flex items-center gap-md rounded-feature bg-surface-tint p-md">
                        {String(artwork.mimeType).startsWith("image/") && (
                          // Authenticated local artwork is intentionally not routed through Next's public image optimizer.
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={authorizedUrl(String(artwork.downloadUrl))} alt="Artwork preview" className="h-20 w-28 object-contain bg-surface border border-line-subtle" />
                        )}
                        <div className="min-w-0"><p className="font-bold text-ink truncate">{String(artwork.filename)}</p><p className="text-xs text-ink-muted">{String(artwork.mimeType)} · {formatBytes(Number(artwork.sizeBytes))}</p><a href={authorizedUrl(String(artwork.downloadUrl))} className="text-body-sm text-link" target="_blank" rel="noreferrer">Download original</a></div>
                      </div>
                    )}
                    <details className="mt-md"><summary className="text-xs text-link cursor-pointer">Raw snapshot</summary><pre className="mt-sm text-xs whitespace-pre-wrap overflow-auto bg-surface-tint p-sm rounded-feature">{JSON.stringify(snapshot, null, 2)}</pre></details>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="bg-surface p-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-md">History & audit trail</h2>
            {order.events.length === 0 ? (
              <p className="text-body-sm text-ink-muted">No status events recorded yet.</p>
            ) : (
              <ol className="space-y-sm">
                {order.events.map((event) => (
                  <li key={event.id} className="flex gap-md text-body-sm">
                    <time className="w-40 shrink-0 text-ink-muted">{new Date(event.createdAt).toLocaleString()}</time>
                    <div><span className="font-bold text-ink">{event.toStatus.replace("_", " ")}</span>{event.note && <span className="text-ink-muted"> · {event.note}</span>}</div>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </section>

        <aside className="lg:col-span-4 space-y-lg">
          <Card className="bg-surface p-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-md">Fulfillment checklist</h2>
            <ol className="space-y-lg">
              <Step number="1" title="Payment received" complete={order.paymentStatus !== "PENDING_PAYMENT"}>
                {order.paymentStatus === "PENDING_PAYMENT" && (
                  <Button
                    disabled={mutation.isPending}
                    onClick={() => setConfirm({ kind: "markPaid", title: "Mark order as paid?", description: "This records manual payment received and starts the 48-business-hour delivery clock." })}
                    className="w-full"
                  >
                    Mark paid
                  </Button>
                )}
              </Step>
              <Step number="2" title="Drop-ship submission" complete={Boolean(order.dropship)}>
                {order.dropship ? <p className="text-body-sm text-ink-muted">Ref {order.dropship.externalRef}</p> : (
                  <div className="space-y-sm">
                    <label className="sr-only" htmlFor="dropship-ref">External reference</label>
                    <Input id="dropship-ref" placeholder="External reference" value={externalRef} onChange={(e) => setExternalRef(e.target.value)} />
                    <label className="sr-only" htmlFor="dropship-notes">Notes (optional)</label>
                    <Input id="dropship-notes" placeholder="Notes (optional)" value={dropshipNotes} onChange={(e) => setDropshipNotes(e.target.value)} />
                    <Button variant="secondary" disabled={!externalRef || mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().recordDropship(id, { externalRef, notes: dropshipNotes }))} className="w-full">Record submission</Button>
                  </div>
                )}
              </Step>
              <Step number="3" title="Tracking & label" complete={Boolean(order.shipment?.trackingNumber)}>
                {order.shipment?.trackingNumber ? (
                  <div className="text-body-sm text-ink-muted">
                    <p>{order.shipment.trackingNumber}</p>
                    {order.shipment.labelDownloadUrl && <a href={authorizedUrl(order.shipment.labelDownloadUrl)} className="text-link" target="_blank" rel="noreferrer">Download label</a>}
                  </div>
                ) : (
                  <div className="space-y-sm">
                    <label className="sr-only" htmlFor="tracking-number">FedEx tracking number</label>
                    <Input id="tracking-number" placeholder="FedEx tracking number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} />
                    <label className="sr-only" htmlFor="label-pdf">Label PDF</label>
                    <input id="label-pdf" aria-label="Label PDF" type="file" accept="application/pdf" className="text-xs text-ink-muted" onChange={(e) => setLabel(e.target.files?.[0])} />
                    <Button variant="secondary" disabled={trackingNumber.length < 6 || mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().attachTracking(id, { trackingNumber, label }))} className="w-full">Attach tracking</Button>
                  </div>
                )}
              </Step>
              <Step number="4" title="Ship & deliver" complete={order.status === "DELIVERED"}>
                <div className="flex flex-wrap gap-xs">
                  {order.status === "ACCEPTED" && (
                    <Button size="sm" disabled={mutation.isPending} onClick={() => setConfirm({ kind: "transition", status: "SHIPPED", title: "Mark as shipped?", description: "Record that this order has shipped.", destructive: false, reason: "" })}>Mark shipped</Button>
                  )}
                  {order.status === "SHIPPED" && (
                    <Button size="sm" disabled={mutation.isPending} onClick={() => setConfirm({ kind: "transition", status: "DELIVERED", title: "Mark as delivered?", description: "Delivered is a final state and cannot be changed from this workspace.", destructive: false, reason: "" })}>Mark delivered</Button>
                  )}
                </div>
              </Step>
            </ol>
          </Card>

          <Card className="bg-surface p-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-sm">Shipping address</h2>
            <address className="not-italic text-body-sm text-ink-muted leading-relaxed">{String(ship.fullName ?? "")}<br />{String(ship.street1 ?? "")} {String(ship.street2 ?? "")}<br />{String(ship.city ?? "")}, {String(ship.region ?? "")} {String(ship.postalCode ?? "")}<br />{String(ship.country ?? "")}</address>
          </Card>

          {!['DELIVERED', 'CANCELLED'].includes(order.status) && (
            <Card className="bg-surface p-lg">
              <h2 className="font-bold text-ink mb-sm">Exception controls</h2>
              <label className="sr-only" htmlFor="exception-reason">Reason / note</label>
              <Input id="exception-reason" placeholder="Reason / note" value={reason} onChange={(e) => setReason(e.target.value)} />
              <div className="flex gap-sm mt-sm">
                <Button variant="secondary" size="sm" disabled={mutation.isPending} onClick={() => setConfirm({ kind: "transition", status: "ON_HOLD", title: "Put order on hold?", description: "Holding pauses fulfillment and flags the order for review.", destructive: false, reason: reason || "Placed on hold by staff." })}>Put on hold</Button>
                <Button variant="secondary" size="sm" className="border-danger text-danger" disabled={!reason || mutation.isPending} onClick={() => setConfirm({ kind: "transition", status: "CANCELLED", title: "Cancel order?", description: "Cancellation stops production and is recorded in the audit trail.", destructive: true, reason })}>Cancel</Button>
              </div>
            </Card>
          )}
        </aside>
      </div>

      <ConfirmDialog
        open={confirm != null}
        onOpenChange={(open) => { if (!open) setConfirm(null); }}
        title={confirm?.title ?? ""}
        description={confirm ? confirmDescription(confirm) : ""}
        confirmLabel={confirm?.kind === "markPaid" ? "Mark paid" : confirm?.kind === "transition" ? "Confirm" : "Confirm"}
        destructive={confirm != null && confirm.kind === "transition" && confirm.destructive}
        busy={mutation.isPending}
        onConfirm={() => {
          const action = confirm;
          setConfirm(null);
          if (!action) return;
          if (action.kind === "markPaid") {
            mutation.mutate(() => getAdminApiClient().markPaid(id));
          } else {
            mutation.mutate(() => getAdminApiClient().transition(id, { status: action.status, reason: action.reason || undefined }));
          }
        }}
      />
    </div>
  );
}

function Step({ number, title, complete, children }: { number: string; title: string; complete: boolean; children: React.ReactNode }) {
  return (
    <li>
      <div className="flex items-center gap-sm mb-sm">
        <span className={`h-6 w-6 rounded-full text-xs font-bold flex items-center justify-center ${complete ? "bg-success-bg text-success-fg" : "bg-surface-tint text-ink-muted"}`}>{complete ? "✓" : number}</span>
        <span className="font-bold text-ink">{title}</span>
      </div>
      <div className="pl-8">{children}</div>
    </li>
  );
}
function Readout({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs text-ink-muted">{label}</dt><dd className="text-ink">{value}</dd></div>; }
function formatBillable(value: unknown): string { const v = value as { widthFt?: number; heightFt?: number } | null; return v ? `${v.widthFt ?? "—"}' × ${v.heightFt ?? "—"}'` : "—"; }
function formatFinishing(value: unknown): string { const obj = (value ?? {}) as Record<string, unknown>; const enabled = Object.entries(obj).filter(([, v]) => v === true).map(([k]) => k); return enabled.length ? enabled.join(", ") : "None"; }
function formatBytes(bytes: number): string { return bytes > 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.round(bytes / 1024)} KB`; }
function authorizedUrl(path: string): string { const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001"; const token = typeof window !== "undefined" ? window.localStorage.getItem("bi48.token") : null; return `${base}${path}${token ? `?access_token=${encodeURIComponent(token)}` : ""}`; }
function ErrorBox({ text }: { text: string }) { return <div role="alert" className="rounded-feature bg-badge-error-bg text-danger p-md">{text}</div>; }
