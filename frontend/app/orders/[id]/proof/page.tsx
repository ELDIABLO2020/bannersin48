"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatUsd } from "@/lib/utils/format";
import { ChevronRight, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { CountdownCard } from "@/components/home/CountdownCard";

const ACKS = [
  { key: "artworkCorrect", label: "The artwork is correct." },
  { key: "spellingColorsLayoutAccepted", label: "Spelling, colors, layout, and quality are accepted as shown." },
  { key: "printsAsUploaded", label: "Banners In 48 will print exactly as uploaded / proofed." },
  { key: "cancellationWindowUnderstood", label: "I understand the 10-minute cancellation window after approval." },
  { key: "deliveryDateAndAddressConfirmed", label: "I confirm the final delivery date and shipping address." },
] as const;

export default function ProofPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const orderId = params?.id ?? "";

  const { data: order, isLoading } = useQuery({
    queryKey: ["order", orderId],
    queryFn: () => getApiClient().getOrder(orderId),
    enabled: !!orderId,
  });

  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const allAcked = ACKS.every((a) => checked[a.key]);

  const approve = useMutation({
    mutationFn: () =>
      getApiClient().approveProof(orderId, {
        acknowledgements: {
          artworkCorrect: !!checked.artworkCorrect,
          spellingColorsLayoutAccepted: !!checked.spellingColorsLayoutAccepted,
          printsAsUploaded: !!checked.printsAsUploaded,
          cancellationWindowUnderstood: !!checked.cancellationWindowUnderstood,
          deliveryDateAndAddressConfirmed: !!checked.deliveryDateAndAddressConfirmed,
        },
      }),
    onSuccess: (next) => {
      queryClient.setQueryData(["order", orderId], next);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
    onError: (err) => setSubmitError((err as Error).message),
  });

  // Live 10-minute cancel countdown
  const cancel = useMutation({
    mutationFn: () => getApiClient().cancelOrder(orderId),
    onSuccess: (next) => {
      queryClient.setQueryData(["order", orderId], next);
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (isLoading) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center">
        <p className="text-ink-muted">Loading proof…</p>
      </div>
    );
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

  const inWindow = order.status === "CANCELLATION_WINDOW" && order.cancellationWindowExpiresAt;
  const expiresAt = inWindow ? new Date(order.cancellationWindowExpiresAt!).getTime() : 0;
  const remainingMs = Math.max(0, expiresAt - now);
  const mm = Math.floor(remainingMs / 60000);
  const ss = Math.floor((remainingMs % 60000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-3xl px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/dashboard" className="hover:text-link no-underline">Dashboard</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <Link href={`/orders/${order.id}`} className="hover:text-link no-underline">Order {order.orderNumber}</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Proof</span>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          {inWindow ? "Approved — cancellation window" : "Approve your instant proof"}
        </h1>

        <Card className="bg-surface mb-lg">
          <div className="flex items-center gap-md mb-md">
            <FileText className="h-6 w-6 text-link" aria-hidden />
            <div>
              <p className="font-bold text-ink">Your artwork, as uploaded</p>
              <p className="text-body-sm text-ink-muted">This is what we&rsquo;ll print. What you see is what you get.</p>
            </div>
          </div>
          <div className="rounded-card bg-info-tint p-3xl text-center">
            <p className="text-ink-muted">[ Artwork preview — PDF / JPG page 1 ]</p>
          </div>

          <dl className="mt-lg grid grid-cols-2 gap-md text-sm">
            <Spec label="Order #" value={order.orderNumber} />
            <Spec label="Material" value={order.lines[0]?.material.replaceAll("_", " ") ?? "—"} />
            <Spec label="Size" value={
              order.lines[0]
                ? `${order.lines[0].billableDims.widthFt}' × ${order.lines[0].billableDims.heightFt}'`
                : "—"
            } />
            <Spec label="Quantity" value={String(order.lines.reduce((acc, l) => acc + l.quantity, 0))} />
            <Spec label="Ship to" value={order.shipTo ? `${order.shipTo.city}, ${order.shipTo.region}` : "—"} />
            <Spec label="Delivery" value={`${order.guaranteedDeliveryDow} by 12:00 PM`} />
            <Spec label="Total" value={formatUsd(order.total)} bold />
          </dl>
        </Card>

        {inWindow ? (
          <Card className="bg-warning-bg mb-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-sm">Cancellation window</h2>
            <p className="text-body-sm text-ink-muted mb-md">
              You can cancel this order for the next{" "}
              <strong className="text-ink">{pad(mm)}:{pad(ss)}</strong>. After that, the order goes into production and cannot be cancelled.
            </p>
            <div className="flex flex-col sm:flex-row gap-sm">
              <Button
                variant="secondary"
                size="lg"
                onClick={() => cancel.mutate()}
                disabled={cancel.isPending || remainingMs === 0}
              >
                Cancel this order
              </Button>
              <Link href={`/orders/${order.id}`} className="flex-1">
                <Button variant="cta" size="lg" className="w-full">
                  Keep order &mdash; go to status
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="bg-surface mb-lg">
            <h2 className="font-bold text-heading-h4 text-ink mb-md">Confirm before production</h2>
            <ul className="space-y-sm">
              {ACKS.map((a) => (
                <li key={a.key}>
                  <label className="flex items-start gap-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={!!checked[a.key]}
                      onChange={(e) => setChecked((c) => ({ ...c, [a.key]: e.target.checked }))}
                    />
                    <span className="text-sm text-ink">{a.label}</span>
                  </label>
                </li>
              ))}
            </ul>
            {submitError && (
              <div role="alert" className="flex items-start gap-sm mt-md p-md rounded-feature bg-badge-error-bg">
                <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-ink">{submitError}</p>
              </div>
            )}
            <Button
              variant="cta"
              size="lg"
              className="w-full mt-lg"
              onClick={() => approve.mutate()}
              disabled={!allAcked || approve.isPending}
            >
              {approve.isPending ? "Approving…" : "Approve & send to production"}
            </Button>
          </Card>
        )}

        <CountdownCard variant="inline" />
      </div>
    </div>
  );
}

function Spec({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div>
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className={`mt-xs ${bold ? "text-heading-h4 font-bold text-ink" : "text-ink"}`}>{value}</dd>
    </div>
  );
}
