"use client";

import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils/format";
import { Trash2 } from "lucide-react";
import type { CartLine } from "@/lib/stores/cart";

interface CartLineRowProps {
  line: CartLine;
  onRemove: (id: string) => void;
  onUpdateQty: (id: string, quantity: number) => void;
  /**
   * Render without the surrounding Card wrapper — used inside the drawer
   * where each line sits in a bordered container instead of a card.
   */
  bare?: boolean;
}

export function CartLineRow({ line: l, onRemove, onUpdateQty, bare = false }: CartLineRowProps) {
  const body = (
    <div className="flex items-start justify-between gap-md">
      <div className="min-w-0">
        <p className="font-bold text-ink break-words">
          {l.product === "retractable"
            ? "Retractable Banner (33.5\" × 80\")"
            : `${l.display.requestedLabel} (${l.material.replaceAll("_", " ")})`}
        </p>
        <p className="text-body-sm text-ink-muted mt-xs">
          Requested: {l.display.requestedLabel} · Billable: {l.display.billableLabel}
          {l.billableSqFt > 0 && ` · ${l.billableSqFt} sq ft`}
        </p>
        <p className="text-body-sm text-ink-muted mt-xs">Finishing: {finishLabel(l.finishing)}</p>
        <div className="flex items-center gap-sm mt-md">
          <label className="text-body-sm text-ink-muted" htmlFor={`qty-${l.id}`}>
            Qty
          </label>
          <input
            id={`qty-${l.id}`}
            type="number"
            min={1}
            max={10}
            value={l.quantity}
            onChange={(e) =>
              onUpdateQty(l.id, Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))
            }
            className="w-16 h-9 rounded-pill border border-line-input px-sm text-ink text-center"
          />
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-heading-h4 font-bold text-ink">{formatUsd(l.totalBeforeTax)}</p>
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

function finishLabel(f: {
  welding: boolean;
  grommets: boolean;
  windSlits: boolean;
  polePockets: boolean;
  polePocketPlacement?: string;
}) {
  const parts: string[] = [];
  parts.push(f.polePockets ? `Pole pockets${f.polePocketPlacement ? ` (${f.polePocketPlacement})` : ""}` : "Welded");
  parts.push(f.polePockets ? "— (pockets)" : f.grommets ? "Grommets" : "No grommets");
  if (f.windSlits) parts.push("Wind slits");
  return parts.join(" · ");
}
