"use client";

import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils/format";
import { displayedQuantity, type CartLine } from "@/lib/cart/quoteState";
import { Trash2, Minus, Plus, AlertCircle, FileImage } from "lucide-react";
import {
  PRODUCTS,
  productIdForMaterial,
  finishingSummary,
  orientationLabel,
  orientationOf,
  type ProductId,
} from "@bannersin48/shared";
import { materialLabel } from "@/components/builder/builderRules";

interface CartLineRowProps {
  line: CartLine;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, quantity: number) => void;
  onRetry: (id: string) => void;
  onRevert: (id: string) => void;
  /**
   * Render without the surrounding Card wrapper — used inside the drawer
   * where each line sits in a bordered container instead of a card.
   */
  bare?: boolean;
}

export function CartLineRow({
  line: l,
  onRemove,
  onUpdateQty,
  onRetry,
  onRevert,
  bare = false,
}: CartLineRowProps) {
  const productId: ProductId = (l.productId as ProductId | undefined) ?? productIdForMaterial(l.material);
  const productTitle = PRODUCTS[productId].title;
  const mat = materialLabel(l.material);
  const finish = finishingSummary(productId, l.finishing);
  const heading =
    productId === "RETRACTABLE"
      ? 'Retractable Banner (33.5" × 80")'
      : productTitle === mat
        ? productTitle
        : `${productTitle} · ${mat}`;

  const refreshing = l.quoteState === "refreshing";
  const stale = l.quoteState === "stale";
  const errored = l.quoteState === "error";
  const qty = displayedQuantity(l);

  const body = (
    <div className="flex items-start justify-between gap-md">
      <div className="min-w-0 flex-1">
        <p className="font-bold text-ink break-words">{heading}</p>
        <p className="text-body-sm text-ink-muted mt-xs">
          Requested: {l.display.requestedLabel} · Billable: {l.display.billableLabel}
          {l.billableSqFt > 0 && ` · ${l.billableSqFt} sq ft`}
        </p>
        {finish && (
          <p className="text-body-sm text-ink-muted mt-xs">Finishing: {finish}</p>
        )}
        <p className="text-body-sm text-ink-muted mt-xs">
          <span className="inline-flex items-center gap-xs">
            <FileImage className="h-3.5 w-3.5" aria-hidden />
            {l.artwork?.filename ?? "Artwork attached"}
          </span>
          {l.artwork?.mimeType && (
            <span className="ml-1">· {l.artwork.mimeType.replace("image/", "").toUpperCase()}</span>
          )}
          {l.artwork?.widthPx && l.artwork?.heightPx && (
            <span className="ml-1">· {orientationLabel(orientationOf(l.dimensions))}</span>
          )}
        </p>

        <div className="flex items-center gap-sm mt-md">
          <span className="text-body-sm text-ink-muted" id={`qty-label-${l.id}`}>
            Qty
          </span>
          <div className="inline-flex items-center rounded-pill border border-line-input bg-surface">
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={refreshing || stale || qty <= 1}
              onClick={() => onUpdateQty(l.id, Math.max(1, qty - 1))}
              className="h-9 w-9 inline-flex items-center justify-center text-ink-muted hover:text-ink disabled:opacity-40"
            >
              <Minus className="h-4 w-4" aria-hidden />
            </button>
            <span aria-labelledby={`qty-label-${l.id}`} className="w-10 text-center tabular-nums text-ink">
              {qty}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={refreshing || stale || qty >= 10}
              onClick={() => onUpdateQty(l.id, Math.min(10, qty + 1))}
              className="h-9 w-9 inline-flex items-center justify-center text-ink-muted hover:text-ink disabled:opacity-40"
            >
              <Plus className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {refreshing && <span className="text-body-sm text-ink-muted">Refreshing price…</span>}
          {stale && <span className="text-body-sm text-ink-muted">Quote expired — refreshing…</span>}
        </div>

        {errored && (
          <div role="alert" className="mt-sm rounded-card bg-warning-bg p-sm text-body-sm text-ink">
            <p className="flex items-start gap-xs">
              <AlertCircle className="h-4 w-4 text-warning-fg shrink-0 mt-0.5" aria-hidden />
              Price refresh failed — this line keeps its last confirmed price (
              {formatUsd(l.totalBeforeTax)}).
            </p>
            <div className="flex gap-sm mt-xs">
              <button
                type="button"
                onClick={() => onRetry(l.id)}
                className="text-link text-body-sm font-bold hover:underline"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => onRevert(l.id)}
                className="text-ink-muted text-body-sm font-bold hover:underline"
              >
                Revert
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="text-right shrink-0">
        <p className="text-heading-h4 font-bold text-ink">
          {formatUsd(l.totalBeforeTax)}
          {refreshing && (
            <span className="ml-1 block text-body-sm font-normal text-ink-muted">updating…</span>
          )}
        </p>
        <p className="text-body-sm text-ink-muted">incl. {formatUsd(l.shipping)} shipping</p>
        <button
          type="button"
          className="mt-sm text-body-sm text-danger inline-flex items-center gap-xs hover:underline"
          onClick={() => onRemove(l.id)}
        >
          <Trash2 className="h-3 w-3" aria-hidden /> Remove
        </button>
      </div>
    </div>
  );

  if (bare) return body;
  return <Card className="bg-surface">{body}</Card>;
}
