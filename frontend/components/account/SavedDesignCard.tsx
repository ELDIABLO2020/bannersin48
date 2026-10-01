"use client";

import { useState } from "react";
import type { SavedDesign } from "@bannersin48/api-client";
import { PRODUCTS, finishingSummary, formatDimensionsWH, type ProductId } from "@bannersin48/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** One saved configuration: thumbnail, name, what it is, and order/rename/delete. */
export function SavedDesignCard({
  design,
  busy,
  onOrder,
  onRename,
  onDelete,
}: {
  design: SavedDesign;
  busy: boolean;
  onOrder: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [name, setName] = useState(design.name);
  const productId = design.productId as ProductId;
  const known = PRODUCTS[productId];
  const finish = known ? finishingSummary(productId, design.config.finishing) : "";

  return (
    <li className="flex flex-col rounded-card border border-line bg-surface overflow-hidden" data-testid="saved-design">
      <div className="flex h-40 items-center justify-center bg-surface-tint">
        {design.previewUrl ? (
          // Signed preview links are short-lived; a broken image just falls back to the placeholder text.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={design.previewUrl} alt="" className="h-full w-full object-contain p-sm" />
        ) : (
          <p className="px-md text-center text-body-sm text-ink-muted">No artwork attached yet</p>
        )}
      </div>
      <div className="flex flex-1 flex-col p-lg">
        {renaming ? (
          <form
            className="flex gap-sm"
            onSubmit={(e) => {
              e.preventDefault();
              if (name.trim() && name.trim() !== design.name) onRename(name.trim());
              setRenaming(false);
            }}
          >
            <label className="sr-only" htmlFor={`design-name-${design.id}`}>Design name</label>
            <Input id={`design-name-${design.id}`} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} autoFocus />
            <Button type="submit" variant="cta" size="sm" disabled={busy}>Save</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => { setName(design.name); setRenaming(false); }}>Cancel</Button>
          </form>
        ) : (
          <h3 className="font-bold text-body text-ink" data-testid="saved-design-name">{design.name}</h3>
        )}
        <p className="mt-xs text-body-sm text-ink-muted">
          {known?.title ?? design.productName} · {formatDimensionsWH(design.config.dimensions)} · Qty {design.config.quantity}
          {finish ? ` · ${finish}` : ""}
        </p>
        <p className="mt-xs text-xs text-ink-muted">Saved {new Date(design.updatedAt).toLocaleDateString()}</p>
        <div className="mt-auto flex flex-wrap gap-sm pt-md">
          <Button type="button" variant="cta" size="sm" disabled={busy} onClick={onOrder} data-testid="saved-design-order">
            {design.artworkFileId ? "Order again" : "Open in builder"}
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={busy || renaming} onClick={() => setRenaming(true)}>
            Rename
          </Button>
          <Button type="button" variant="ghost" size="sm" disabled={busy} onClick={onDelete}>
            Delete
          </Button>
        </div>
      </div>
    </li>
  );
}
