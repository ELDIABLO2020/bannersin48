"use client";

import { useMemo, useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import {
  POPULAR_SIZES,
  PRODUCTS,
  validateProductSize,
  orientationOf,
  orientationLabel,
  type PopularSize,
  type ProductId,
} from "@bannersin48/shared";
import { cn } from "@/lib/utils/cn";

export function popularSizesForProduct(productId: ProductId, query = ""): PopularSize[] {
  const config = PRODUCTS[productId];
  const legal = POPULAR_SIZES.filter((s) =>
    validateProductSize(config, {
      widthFt: s.widthFt,
      widthIn: 0,
      heightFt: s.heightFt,
      heightIn: 0,
    }).ok,
  );
  const q = query.trim().toLowerCase();
  if (!q) return legal;
  return legal.filter((s) => s.label.toLowerCase().includes(q) || s.id.includes(q));
}

export function SizePanel() {
  const productId = useConfigurator((s) => s.productId);
  const size = useConfigurator((s) => s.size);
  const setSize = useConfigurator((s) => s.setSize);
  const applySize = useConfigurator((s) => s.applySize);
  const aspectLocked = useConfigurator((s) => s.aspectLocked);
  const setAspectLocked = useConfigurator((s) => s.setAspectLocked);
  const [query, setQuery] = useState("");
  const config = PRODUCTS[productId];
  const sizeError = validateProductSize(config, size);

  const filtered = useMemo(() => popularSizesForProduct(productId, query), [productId, query]);

  function updateAxis(axis: "width" | "height", ft: number, inches: number) {
    if (!aspectLocked) {
      if (axis === "width") setSize({ widthFt: ft, widthIn: inches });
      else setSize({ heightFt: ft, heightIn: inches });
      return;
    }
    const curW = size.widthFt * 12 + size.widthIn;
    const curH = size.heightFt * 12 + size.heightIn;
    if (curW <= 0 || curH <= 0) {
      if (axis === "width") setSize({ widthFt: ft, widthIn: inches });
      else setSize({ heightFt: ft, heightIn: inches });
      return;
    }
    const next = ft * 12 + inches;
    if (axis === "width") {
      const ratio = curH / curW;
      const newH = Math.max(12, Math.round(next * ratio));
      setSize({
        widthFt: ft,
        widthIn: inches,
        heightFt: Math.floor(newH / 12),
        heightIn: newH % 12,
      });
    } else {
      const ratio = curW / curH;
      const newW = Math.max(12, Math.round(next * ratio));
      setSize({
        heightFt: ft,
        heightIn: inches,
        widthFt: Math.floor(newW / 12),
        widthIn: newW % 12,
      });
    }
  }

  return (
    <div data-testid="size-panel" className="space-y-md">
      <div className="flex items-center justify-between gap-sm">
        <p className="text-sm font-bold text-ink">Size</p>
        <label className="flex items-center gap-1.5 text-xs text-ink-muted">
          <input
            type="checkbox"
            checked={aspectLocked}
            onChange={(e) => setAspectLocked(e.target.checked)}
            data-testid="aspect-lock"
          />
          Lock aspect
        </label>
      </div>

      <div className="grid grid-cols-2 gap-sm">
        <Axis
          label="Width (left to right)"
          ft={size.widthFt}
          inches={size.widthIn}
          onChange={(ft, inches) => updateAxis("width", ft, inches)}
          testId="size-width"
        />
        <Axis
          label="Height (top to bottom)"
          ft={size.heightFt}
          inches={size.heightIn}
          onChange={(ft, inches) => updateAxis("height", ft, inches)}
          testId="size-height"
        />
      </div>

      <OrientationDiagram size={size} />

      {!sizeError.ok && (
        <p role="alert" data-testid="size-error" className="text-sm text-danger">
          {sizeError.message}
        </p>
      )}

      <div>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search standard sizes"
          data-testid="size-search"
          className="w-full rounded-btn border border-line px-md py-sm text-sm bg-surface"
        />
        <div className="mt-sm grid grid-cols-2 sm:grid-cols-3 gap-sm max-h-40 overflow-y-auto">
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              data-testid={`popular-size-${s.id}`}
              onClick={() => applySize(s.widthFt, s.heightFt)}
              className={cn(
                "rounded-card border px-sm py-sm text-left text-sm",
                size.widthFt === s.widthFt && size.heightFt === s.heightFt && size.widthIn === 0 && size.heightIn === 0
                  ? "border-strong-accent bg-soft-accent"
                  : "border-line hover:border-strong-accent",
              )}
            >
              <span className="font-bold text-ink">{s.label}</span>
              <span className="block text-[11px] text-ink-muted">{s.sqFt} sq ft</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Axis({
  label,
  ft,
  inches,
  onChange,
  testId,
}: {
  label: string;
  ft: number;
  inches: number;
  onChange: (ft: number, inches: number) => void;
  testId: string;
}) {
  return (
    <fieldset className="space-y-1">
      <legend className="text-xs font-bold uppercase tracking-wide text-ink-muted">{label}</legend>
      <div className="flex gap-1">
        <label className="flex-1 text-[10px] text-ink-muted">
          ft
          <input
            type="number"
            min={1}
            max={11}
            value={ft}
            data-testid={`${testId}-ft`}
            onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0), inches)}
            className="mt-0.5 w-full rounded-btn border border-line px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
        <label className="flex-1 text-[10px] text-ink-muted">
          in
          <input
            type="number"
            min={0}
            max={11}
            value={inches}
            data-testid={`${testId}-in`}
            onChange={(e) => onChange(ft, Math.min(11, Math.max(0, Number(e.target.value) || 0)))}
            className="mt-0.5 w-full rounded-btn border border-line px-2 py-1.5 text-sm tabular-nums"
          />
        </label>
      </div>
    </fieldset>
  );
}

function OrientationDiagram({ size }: { size: { widthFt: number; widthIn: number; heightFt: number; heightIn: number } }) {
  const widthIn = size.widthFt * 12 + size.widthIn;
  const heightIn = size.heightFt * 12 + size.heightIn;
  const orientation = orientationOf({ widthFt: size.widthFt, widthIn: size.widthIn, heightFt: size.heightFt, heightIn: size.heightIn });

  // Bound the diagram so extreme ratios stay inside the panel.
  const MAX_PX = 150;
  const scale = MAX_PX / Math.max(widthIn, heightIn);
  const boxW = Math.max(20, Math.round(widthIn * scale));
  const boxH = Math.max(20, Math.round(heightIn * scale));

  return (
    <div
      data-testid="orientation-diagram"
      className="rounded-card border border-line bg-surface-tint px-sm py-sm"
    >
      <div className="flex items-center justify-between gap-sm">
        <p className="text-xs font-bold uppercase tracking-wide text-ink-muted">Orientation</p>
        <span className="rounded-pill bg-soft-accent px-sm py-micro text-[11px] font-bold uppercase text-ink">
          {orientationLabel(orientation)}
        </span>
      </div>
      <div className="mt-sm flex min-h-[80px] items-center justify-center">
        <div className="relative">
          <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-bold uppercase text-ink-muted">
            W
          </span>
          <span className="absolute -left-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase text-ink-muted">
            H
          </span>
          <div
            className="rounded-sm border-2 border-ink bg-surface"
            style={{ width: boxW, height: boxH }}
            aria-label={`${widthIn} inches wide by ${heightIn} inches high`}
          />
        </div>
      </div>
    </div>
  );
}
