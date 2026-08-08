"use client";

import { useRef, useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import {
  GROMMET_PRESET_OPTIONS,
  GROMMET_SPACING_OPTIONS,
  dimensionsToInches,
  clampGrommetPoint,
  generateGrommetPoints,
  type GrommetPoint,
} from "@bannersin48/shared";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";

export function GrommetEditor() {
  const finishing = useConfigurator((s) => s.finishing);
  const size = useConfigurator((s) => s.size);
  const setFinishing = useConfigurator((s) => s.setFinishing);
  const setGrommetPoints = useConfigurator((s) => s.setGrommetPoints);
  const { widthIn, heightIn } = dimensionsToInches(size);
  const stageRef = useRef<HTMLDivElement>(null);
  const [draft, setDraft] = useState<GrommetPoint[] | null>(null);

  const points =
    draft ??
    finishing.grommetPoints ??
    generateGrommetPoints(
      widthIn,
      heightIn,
      finishing.grommetPreset ?? "TOP_AND_BOTTOM",
      finishing.grommetSpacing ?? "EVERY_2_3FT",
    );

  function enableCustom() {
    setFinishing({ grommets: true, grommetPreset: "CUSTOM" });
    setDraft(points);
  }

  function handleStageClick(e: React.MouseEvent<HTMLDivElement>) {
    if (finishing.grommetPreset !== "CUSTOM" && !draft) enableCustom();
    const el = stageRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xIn = ((e.clientX - rect.left) / rect.width) * widthIn;
    const yIn = ((e.clientY - rect.top) / rect.height) * heightIn;
    const next = [...(draft ?? points), clampGrommetPoint({ xIn, yIn }, widthIn, heightIn)];
    setDraft(next);
  }

  function removePoint(index: number) {
    const next = points.filter((_, i) => i !== index);
    setDraft(next);
  }

  function save() {
    setGrommetPoints(draft ?? points);
    setDraft(null);
  }

  function reset() {
    const regenerated = generateGrommetPoints(widthIn, heightIn, "TOP_AND_BOTTOM", "EVERY_2_3FT");
    setFinishing({
      grommets: true,
      grommetPreset: "TOP_AND_BOTTOM",
      grommetSpacing: "EVERY_2_3FT",
      grommetPoints: regenerated,
    });
    setDraft(null);
  }

  return (
    <div data-testid="grommet-editor" className="space-y-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-ink">Grommets</p>
        <button
          type="button"
          data-testid="grommets-toggle"
          className={cn(
            "rounded-card border px-md py-1.5 text-sm font-bold",
            finishing.grommets ? "border-strong-accent bg-soft-accent" : "border-line",
          )}
          onClick={() => setFinishing({ grommets: !finishing.grommets })}
          disabled={finishing.polePockets}
        >
          {finishing.grommets ? "On" : "Off"}
        </button>
      </div>

      {finishing.rope && !finishing.grommets && (
        <p className="text-sm text-ink-muted">Turning on grommets will remove rope.</p>
      )}

      {finishing.grommets && (
        <>
          <div className="flex flex-wrap gap-sm">
            {GROMMET_PRESET_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                data-testid={`grommet-preset-${opt.id}`}
                onClick={() => {
                  if (opt.id === "CUSTOM") {
                    enableCustom();
                    return;
                  }
                  const pts = generateGrommetPoints(widthIn, heightIn, opt.id, finishing.grommetSpacing ?? "EVERY_2_3FT");
                  setFinishing({ grommetPreset: opt.id, grommetPoints: pts });
                  setDraft(null);
                }}
                className={cn(
                  "rounded-card border px-sm py-1.5 text-xs font-bold",
                  finishing.grommetPreset === opt.id ? "border-strong-accent bg-soft-accent" : "border-line",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {finishing.grommetPreset !== "CUSTOM" && (
            <div className="flex flex-wrap gap-sm">
              {GROMMET_SPACING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`grommet-spacing-${opt.id}`}
                  onClick={() => {
                    const pts = generateGrommetPoints(
                      widthIn,
                      heightIn,
                      finishing.grommetPreset ?? "TOP_AND_BOTTOM",
                      opt.id,
                    );
                    setFinishing({ grommetSpacing: opt.id, grommetPoints: pts });
                  }}
                  className={cn(
                    "rounded-card border px-sm py-1.5 text-xs font-bold",
                    finishing.grommetSpacing === opt.id ? "border-strong-accent bg-soft-accent" : "border-line",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div
            ref={stageRef}
            data-testid="grommet-click-stage"
            onClick={handleStageClick}
            className="relative mx-auto w-full max-w-sm aspect-[4/3] rounded-card border border-dashed border-line bg-surface-tint cursor-crosshair"
            style={{ aspectRatio: `${widthIn} / ${heightIn}` }}
          >
            <p className="absolute inset-x-0 top-2 text-center text-[10px] text-ink-muted pointer-events-none">
              Click to add · click a dot to remove
            </p>
            {points.map((p, i) => (
              <button
                key={`${p.xIn}-${p.yIn}-${i}`}
                type="button"
                data-testid={`grommet-point-${i}`}
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink bg-strong-accent"
                style={{ left: `${(p.xIn / widthIn) * 100}%`, top: `${(p.yIn / heightIn) * 100}%` }}
                onClick={(e) => {
                  e.stopPropagation();
                  removePoint(i);
                }}
                aria-label={`Remove grommet ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex gap-sm">
            <Button type="button" variant="cta" size="sm" data-testid="grommet-save" onClick={save}>
              Save
            </Button>
            <Button type="button" variant="secondary" size="sm" data-testid="grommet-reset" onClick={reset}>
              Reset
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
