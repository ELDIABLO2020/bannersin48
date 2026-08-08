"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import { dimensionsToInches, generateGrommetPoints } from "@bannersin48/shared";
import { ImageIcon } from "lucide-react";

const STAGE_MAX_HEIGHT_PX = 640;
const STAGE_MIN_HEIGHT_PX = 280;
/** Reserve space for dock tiles + a short open panel so controls stay reachable. */
const DOCK_RESERVE_PX = 220;

export function BuilderStage() {
  const size = useConfigurator((s) => s.size);
  const finishing = useConfigurator((s) => s.finishing);
  const artworkPreviewUrl = useConfigurator((s) => s.artworkPreviewUrl);
  const fitMode = useConfigurator((s) => s.fitMode);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);

  const slotRef = useRef<HTMLDivElement>(null);
  const [maxHeightPx, setMaxHeightPx] = useState(STAGE_MAX_HEIGHT_PX);
  const [slotWidthPx, setSlotWidthPx] = useState(0);

  useEffect(() => {
    const el = slotRef.current;
    if (!el) return;

    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSlotWidthPx(rect.width);
      const viewportCap = window.innerHeight * 0.68;
      const available = window.innerHeight - rect.top - DOCK_RESERVE_PX;
      setMaxHeightPx(
        Math.max(
          STAGE_MIN_HEIGHT_PX,
          Math.min(STAGE_MAX_HEIGHT_PX, viewportCap, Math.floor(available)),
        ),
      );
    };

    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const { widthIn, heightIn } = dimensionsToInches(size);
  const hasValidDimensions = widthIn > 0 && heightIn > 0;
  const aspect = hasValidDimensions ? widthIn / heightIn : 1;

  const stageWidth = useMemo(() => {
    const widthCap = slotWidthPx > 0 ? slotWidthPx : Number.POSITIVE_INFINITY;
    const heightFromWidth = widthCap / aspect;
    const height = Math.min(maxHeightPx, heightFromWidth);
    const width = Math.min(widthCap, height * aspect);
    return Number.isFinite(width) ? width : undefined;
  }, [aspect, maxHeightPx, slotWidthPx]);

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

  return (
    <div ref={slotRef} data-testid="builder-stage" className="relative flex w-full items-center justify-center">
      <div
        className="relative mx-auto max-w-3xl transition-[width,height] duration-200 ease-out rounded-feature border border-line bg-surface shadow-[0_12px_40px_-24px_rgba(0,0,0,0.35)] overflow-hidden"
        style={{
          aspectRatio: `${aspect}`,
          width: stageWidth,
          maxHeight: maxHeightPx,
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
            className="absolute inset-6 border-2 border-dashed border-line rounded-feature flex flex-col items-center justify-center gap-sm text-ink-muted hover:border-strong-accent hover:text-strong-accent transition-colors"
          >
            <ImageIcon className="h-8 w-8" aria-hidden />
            <span className="text-sm font-bold">Add artwork</span>
            <span className="text-xs">Upload or pick from your library</span>
          </button>
        )}

        {/* Safe zone */}
        <div className="pointer-events-none absolute inset-[4%] border border-dashed border-strong-accent/30 rounded-sm" />

        {/* Dimension labels */}
        <div className="absolute left-2 top-2 rounded-sm bg-ink/75 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">
          {size.widthFt}&prime;{size.widthIn > 0 ? `${size.widthIn}&Prime;` : ""} × {size.heightFt}
          &prime;{size.heightIn > 0 ? `${size.heightIn}&Prime;` : ""}
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
              bottom: finishing.ropePlacement === "BOTTOM" || finishing.ropePlacement === "TOP_AND_BOTTOM" ? "0.75rem" : undefined,
            }}
          />
        )}

        {/* Pole pocket indicator */}
        {finishing.polePockets && (
          <div
            data-testid="pocket-indicator"
            className="pointer-events-none absolute inset-x-0 top-0 bg-soft-accent/80 text-center text-[10px] font-bold uppercase tracking-wide text-ink py-1"
          >
            Pole pocket {finishing.polePocketDepthIn ?? 2}&quot; · {(finishing.polePocketPlacement ?? "").replace(/_/g, " ")}
          </div>
        )}
      </div>
    </div>
  );
}
