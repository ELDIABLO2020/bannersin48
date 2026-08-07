"use client";

import { useConfigurator } from "@/lib/stores/configurator";
import { materialLabel } from "./builderRules";
import { Plus, Trash2, Palette, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function ItemRail() {
  const signs = useConfigurator((s) => s.signs);
  const activeSignId = useConfigurator((s) => s.activeSignId);
  const selectSign = useConfigurator((s) => s.selectSign);
  const addSign = useConfigurator((s) => s.addSign);
  const removeSign = useConfigurator((s) => s.removeSign);
  const setColorMatchOpen = useConfigurator((s) => s.setColorMatchOpen);
  const colorMatching = useConfigurator((s) => s.colorMatching);

  return (
    <div data-testid="item-rail" className="flex min-[901px]:flex-col gap-sm overflow-x-auto min-[901px]:overflow-visible pb-xs">
      {signs.map((sign, index) => {
        const active = sign.id === activeSignId;
        const ok = Boolean(sign.artworkId);
        return (
          <div
            key={sign.id}
            className={cn(
              "relative shrink-0 w-28 rounded-feature border p-sm transition-colors",
              active ? "border-strong-accent bg-surface" : "border-line bg-surface/80",
            )}
          >
            <button
              type="button"
              data-testid={`item-rail-select-${index}`}
              onClick={() => selectSign(sign.id)}
              className="w-full text-left"
            >
              <div className="flex items-center justify-between gap-1">
                <span className="text-[10px] uppercase tracking-wider text-ink-muted font-bold">
                  Item #{index + 1}
                </span>
                {ok && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] text-success-fg font-bold">
                    <Check className="h-3 w-3" aria-hidden />
                    OK
                  </span>
                )}
              </div>
              <div
                className="mt-xs aspect-[4/3] rounded-sm border border-line bg-surface-tint bg-center bg-contain bg-no-repeat"
                style={
                  sign.artworkPreviewUrl
                    ? { backgroundImage: `url(${sign.artworkPreviewUrl})` }
                    : undefined
                }
              />
              <p className="mt-xs text-[11px] text-ink truncate">
                {sign.size.widthFt}&prime;×{sign.size.heightFt}&prime;
              </p>
              <p className="text-[10px] text-ink-muted truncate">{materialLabel(sign.material)}</p>
              <p className="text-[10px] text-ink-muted">Qty {sign.quantity}</p>
            </button>
            {signs.length > 1 && (
              <button
                type="button"
                aria-label={`Delete item ${index + 1}`}
                data-testid={`item-rail-delete-${index}`}
                className="absolute top-1 right-1 p-0.5 text-ink-muted hover:text-danger"
                onClick={() => removeSign(sign.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}

      <button
        type="button"
        data-testid="add-sign"
        onClick={() => addSign()}
        className="shrink-0 w-28 min-h-[5.5rem] rounded-feature border border-dashed border-line bg-surface/60 text-ink-muted hover:border-strong-accent hover:text-strong-accent flex flex-col items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide"
      >
        <Plus className="h-4 w-4" aria-hidden />
        Add sign
      </button>

      <button
        type="button"
        data-testid="open-color-match"
        onClick={() => setColorMatchOpen(true)}
        className={cn(
          "shrink-0 w-28 rounded-feature border p-sm text-left text-[11px] transition-colors",
          colorMatching
            ? "border-strong-accent bg-soft-accent text-ink"
            : "border-line bg-surface text-ink-muted hover:border-strong-accent",
        )}
      >
        <Palette className="h-3.5 w-3.5 mb-1" aria-hidden />
        <span className="font-bold uppercase tracking-wide block">Color match</span>
        <span className="text-[10px]">{colorMatching ? "PMS notes saved" : "Optional PMS"}</span>
      </button>
    </div>
  );
}
