"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart, cartTotals } from "@/lib/stores/cart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { Trash2, ChevronRight, ShoppingBag } from "lucide-react";

export default function CartPage() {
  const lines = useCart((s) => s.lines);
  const removeLine = useCart((s) => s.removeLine);
  const updateLine = useCart((s) => s.updateLine);
  const router = useRouter();

  const totals = cartTotals(lines);

  if (lines.length === 0) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center p-md">
        <div className="bg-surface rounded-card p-3xl text-center max-w-md">
          <ShoppingBag className="h-10 w-10 text-ink-muted mx-auto mb-md" aria-hidden />
          <h1 className="font-display text-section-h2 text-ink leading-section-h2">Your cart is empty</h1>
          <p className="text-body text-ink-muted mt-md">
            Build a banner in under 3 minutes and it will show up here.
          </p>
          <Link href="/order/vinyl">
            <Button variant="cta" size="lg" className="mt-xl">Start an order</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">Home</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Cart</span>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          Your cart
        </h1>
        <p className="text-body text-ink-muted mb-2xl">
          Review your configuration. We&rsquo;ll save it while you sign in at checkout.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-8 space-y-md">
            {lines.map((l) => (
              <Card key={l.id} className="bg-surface">
                <div className="flex items-start justify-between gap-md">
                  <div>
                    <p className="font-bold text-ink">
                      {l.product === "retractable"
                        ? "Retractable Banner (33.5\" × 80\")"
                        : `${l.display.requestedLabel} (${l.material.replaceAll("_", " ")})`}
                    </p>
                    <p className="text-body-sm text-ink-muted mt-xs">
                      Requested: {l.display.requestedLabel} · Billable: {l.display.billableLabel}
                      {l.billableSqFt > 0 && ` · ${l.billableSqFt} sq ft`}
                    </p>
                    <p className="text-body-sm text-ink-muted mt-xs">
                      Finishing: {finishLabel(l.finishing)}
                    </p>
                    <div className="flex items-center gap-sm mt-md">
                      <label className="text-body-sm text-ink-muted">Qty</label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        value={l.quantity}
                        onChange={(e) => updateLine(l.id, { quantity: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                        className="w-16 h-9 rounded-pill border border-line-input px-sm text-ink text-center"
                      />
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-heading-h4 font-bold text-ink">{formatUsd(l.totalBeforeTax)}</p>
                    <p className="text-body-sm text-ink-muted">incl. {formatUsd(l.shipping)} shipping</p>
                    <button
                      type="button"
                      className="mt-sm text-body-sm text-danger inline-flex items-center gap-xs hover:underline"
                      onClick={() => removeLine(l.id)}
                    >
                      <Trash2 className="h-3 w-3" aria-hidden /> Remove
                    </button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          <div className="lg:col-span-4">
            <Card className="bg-surface sticky top-20">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Order summary</h2>
              <dl className="text-sm space-y-xs">
                <Row label="Subtotal" value={formatUsd(totals.subtotal)} />
                <Row label="Shipping" value={formatUsd(totals.shipping)} />
                <div className="border-t border-line my-sm" />
                <Row label="Total before tax" value={formatUsd(totals.total)} bold />
              </dl>
              <Button
                variant="cta"
                size="block"
                className="w-full mt-lg"
                onClick={() => router.push("/checkout")}
              >
                Proceed to checkout
              </Button>
              <Link
                href="/order/vinyl"
                className="block text-center mt-md text-body-sm text-link hover:underline"
              >
                Add another banner
              </Link>
            </Card>
          </div>
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

function finishLabel(f: { welding: boolean; grommets: boolean; windSlits: boolean; polePockets: boolean; polePocketPlacement?: string }) {
  const parts: string[] = [];
  parts.push(f.polePockets ? `Pole pockets${f.polePocketPlacement ? ` (${f.polePocketPlacement})` : ""}` : "Welded");
  parts.push(f.polePockets ? "— (pockets)" : f.grommets ? "Grommets" : "No grommets");
  if (f.windSlits) parts.push("Wind slits");
  return parts.join(" · ");
}
