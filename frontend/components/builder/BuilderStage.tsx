"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import {
  dimensionsToInches,
  generateGrommetPoints,
  PRODUCTS,
  formatDimensionsWH,
  orientationOf,
  orientationLabel,
} from "@bannersin48/shared";
import { ImageIcon } from "lucide-react";
import { StageHeader } from "./StageHeader";

const RULER_SIZE_PX = 24;
const CREATIVE_INSET_PX = 16;
const MAJOR_TICK_IN = 12; // 1′
const MINOR_TICK_IN = 6; // 6″

export function BuilderStage() {
  const size = useConfigurator((s) => s.size);
  const productId = useConfigurator((s) => s.productId);
  const finishing = useConfigurator((s) => s.finishing);
  const artworkPreviewUrl = useConfigurator((s) => s.artworkPreviewUrl);
  const fitMode = useConfigurator((s) => s.fitMode);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);

  const pasteboardRef = useRef<HTMLDivElement>(null);
  const [pasteboard, setPasteboard] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = pasteboardRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setPasteboard({ w: rect.width, h: rect.height });
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const config = PRODUCTS[productId];
  const { widthIn, heightIn } =
    config.sizeMode === "fixed" && config.fixedSizeIn
      ? { widthIn: config.fixedSizeIn.widthIn, heightIn: config.fixedSizeIn.heightIn }
      : dimensionsToInches(size);
  const hasValidDimensions = widthIn > 0 && heightIn > 0;

  const layout = useMemo(() => {
    if (!hasValidDimensions || pasteboard.w <= 0 || pasteboard.h <= 0) {
      return { pxPerInch: 0, creativeW: 0, creativeH: 0, offsetX: 0, offsetY: 0 };
    }
    const availW = Math.max(0, pasteboard.w - CREATIVE_INSET_PX * 2);
    const availH = Math.max(0, pasteboard.h - CREATIVE_INSET_PX * 2);
    const pxPerInch = Math.min(availW / widthIn, availH / heightIn);
    const creativeW = widthIn * pxPerInch;
    const creativeH = heightIn * pxPerInch;
    const offsetX = (pasteboard.w - creativeW) / 2;
    const offsetY = (pasteboard.h - creativeH) / 2;
    return { pxPerInch, creativeW, creativeH, offsetX, offsetY };
  }, [hasValidDimensions, pasteboard.h, pasteboard.w, widthIn, heightIn]);

  const grommets = useMemo(() => {
    if (!hasValidDimensions || !finishing.grommets) return [];
    if (finishing.grommetPoints?.length) return finishing.grommetPoints;
    return generateGrommetPoints(
      widthIn,
      heightIn,
      finishing.grommetPreset ?? "TOP_AND_BOTTOM",
      finishing.grommetSpacing ?? "EVERY_2_3FT",
    );
  }, [finishing, hasValidDimensions, widthIn, heightIn]);

  const hTicks = useMemo(() => {
    if (layout.pxPerInch <= 0) return [];
    // Cover pasteboard relative to creative origin (can go negative left / past width)
    const leftIn = -layout.offsetX / layout.pxPerInch;
    const rightIn = (pasteboard.w - layout.offsetX) / layout.pxPerInch;
    const start = Math.floor(leftIn / MINOR_TICK_IN) * MINOR_TICK_IN;
    const end = Math.ceil(rightIn / MINOR_TICK_IN) * MINOR_TICK_IN;
    const ticks: number[] = [];
    for (let v = start; v <= end; v += MINOR_TICK_IN) ticks.push(v);
    return ticks;
  }, [layout.offsetX, layout.pxPerInch, pasteboard.w]);

  const vTicks = useMemo(() => {
    if (layout.pxPerInch <= 0) return [];
    const topIn = -layout.offsetY / layout.pxPerInch;
    const bottomIn = (pasteboard.h - layout.offsetY) / layout.pxPerInch;
    const start = Math.floor(topIn / MINOR_TICK_IN) * MINOR_TICK_IN;
    const end = Math.ceil(bottomIn / MINOR_TICK_IN) * MINOR_TICK_IN;
    const ticks: number[] = [];
    for (let v = start; v <= end; v += MINOR_TICK_IN) ticks.push(v);
    return ticks;
  }, [layout.offsetY, layout.pxPerInch, pasteboard.h]);

  return (
    <div
      data-testid="builder-stage"
      className="relative flex h-full min-h-[280px] w-full flex-col overflow-hidden rounded-feature border border-line bg-surface shadow-[0_12px_40px_-24px_rgba(0,0,0,0.35)]"
    >
      <StageHeader />

      <div
        className="relative grid min-h-0 flex-1 overflow-hidden"
        style={{
          gridTemplateColumns: `${RULER_SIZE_PX}px minmax(0, 1fr)`,
          gridTemplateRows: `${RULER_SIZE_PX}px minmax(0, 1fr)`,
        }}
      >
        {/* Corner */}
        <div className="pointer-events-none flex items-center justify-center border-b border-r border-line bg-surface text-[9px] font-bold uppercase tracking-wide text-ink-muted">
          W/H ft
        </div>

        {/* Horizontal ruler (width, left-to-right) */}
        <div
          data-testid="stage-ruler-h"
          aria-label="Width ruler in feet"
          className="pointer-events-none relative overflow-hidden border-b border-line bg-surface"
        >
          {hTicks.map((inch) => {
            const left = layout.offsetX + inch * layout.pxPerInch;
            const isMajor = inch % MAJOR_TICK_IN === 0;
            return (
              <div key={`h-${inch}`} className="absolute inset-y-0" style={{ left }}>
                <div
                  className={`absolute bottom-0 left-0 w-px bg-ink-muted ${isMajor ? "h-3" : "h-1.5"}`}
                />
                {isMajor && (
                  <span className="absolute left-0.5 top-0.5 text-[9px] font-bold leading-none tabular-nums text-ink-muted">
                    {inch / 12}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Vertical ruler (height, top-to-bottom) */}
        <div
          data-testid="stage-ruler-v"
          aria-label="Height ruler in feet"
          className="pointer-events-none relative overflow-hidden border-r border-line bg-surface"
        >
          {vTicks.map((inch) => {
            const top = layout.offsetY + inch * layout.pxPerInch;
            const isMajor = inch % MAJOR_TICK_IN === 0;
            return (
              <div key={`v-${inch}`} className="absolute inset-x-0" style={{ top }}>
                <div
                  className={`absolute right-0 top-0 h-px bg-ink-muted ${isMajor ? "w-3" : "w-1.5"}`}
                />
                {isMajor && (
                  <span className="absolute left-0.5 top-0.5 text-[9px] font-bold leading-none tabular-nums text-ink-muted">
                    {inch / 12}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Pasteboard + creative */}
        <div
          ref={pasteboardRef}
          className="relative min-h-0 min-w-0 overflow-hidden"
          style={{
            backgroundColor: "var(--color-bg-surface-tint)",
            backgroundImage:
              "linear-gradient(to right, rgba(189,189,189,0.35) 1px, transparent 1px), linear-gradient(to bottom, rgba(189,189,189,0.35) 1px, transparent 1px)",
            backgroundSize: "8px 8px",
          }}
        >
          {layout.creativeW > 0 && (
            <div
              data-testid="builder-creative"
              className="absolute overflow-hidden rounded-sm border border-line bg-surface shadow-[0_12px_40px_-24px_rgba(0,0,0,0.35)] transition-[width,height,left,top] duration-200 ease-out"
              style={{
                left: layout.offsetX,
                top: layout.offsetY,
                width: layout.creativeW,
                height: layout.creativeH,
              }}
            >
              {/* Artwork plane */}
              <div
                className="absolute inset-0 bg-surface-tint"
                style={
                  artworkPreviewUrl
                    ? {
                        backgroundImage: `url(${artworkPreviewUrl})`,
                        backgroundRepeat: "no-repeat",
                        backgroundPosition: "center",
                        backgroundSize: fitMode === "fit" ? "contain" : "cover",
                      }
                    : undefined
                }
              />

              {!artworkPreviewUrl && (
                <button
                  type="button"
                  data-testid="stage-empty-upload"
                  onClick={() => setPickerOpen(true)}
                  className="absolute inset-6 border-2 border-dashed border-line rounded-feature flex flex-col items-center justify-center gap-sm px-sm text-center text-ink-muted hover:border-strong-accent hover:text-strong-accent transition-colors"
                >
                  <ImageIcon className="h-8 w-8" aria-hidden />
                  <span className="text-sm font-bold uppercase tracking-wide">
                    Specify dimensions or click to select an image
                  </span>
                  <span className="text-xs">Upload or pick from your library</span>
                </button>
              )}

              {/* Safe zone */}
              <div className="pointer-events-none absolute inset-[4%] border border-dashed border-strong-accent/30 rounded-sm" />

              {/* Dimension labels */}
              <div className="absolute left-2 top-2 rounded-sm bg-ink/75 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
                {PRODUCTS[productId].sizeMode === "fixed" ? (
                  <span data-testid="fixed-size-label">33.5″ × 80″ · Front side</span>
                ) : (
                  <span data-testid="stage-dimension-label">
                    {formatDimensionsWH(size)} · {orientationLabel(orientationOf(size))}
                  </span>
                )}
              </div>

              {/* Grommet dots */}
              {grommets.map((p, i) => (
                <span
                  key={`${p.xIn}-${p.yIn}-${i}`}
                  data-testid="grommet-dot"
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-surface shadow-sm"
                  style={{
                    left: `${(p.xIn / widthIn) * 100}%`,
                    top: `${(p.yIn / heightIn) * 100}%`,
                  }}
                />
              ))}

              {/* Rope indicator */}
              {finishing.rope && (
                <div
                  data-testid="rope-indicator"
                  className="pointer-events-none absolute inset-x-3 h-1 rounded-full bg-strong-accent/70"
                  style={{
                    top:
                      finishing.ropePlacement === "BOTTOM"
                        ? "auto"
                        : finishing.ropePlacement === "TOP_AND_BOTTOM"
                          ? "0.75rem"
                          : "0.75rem",
                    bottom:
                      finishing.ropePlacement === "BOTTOM" || finishing.ropePlacement === "TOP_AND_BOTTOM"
                        ? "0.75rem"
                        : undefined,
                  }}
                />
              )}

              {/* Pole pocket indicator */}
              {finishing.polePockets && (
                <div
                  data-testid="pocket-indicator"
                  className="pointer-events-none absolute inset-x-0 top-0 bg-soft-accent/80 text-center text-[10px] font-bold uppercase tracking-wide text-ink py-1"
                >
                  Pole pocket {finishing.polePocketDepthIn ?? 2}&quot; ·{" "}
                  {(finishing.polePocketPlacement ?? "").replace(/_/g, " ")}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
