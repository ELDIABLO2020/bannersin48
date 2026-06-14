"use client";

import { useState, useEffect } from "react";
import { useConfigurator, MAX_BILLABLE_FT } from "@/lib/stores/configurator";
import { POPULAR_SIZES } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils/cn";
import { Star } from "lucide-react";
import { billableDimensions, dimensionsDisplay } from "@bannersin48/shared";

export function SizeStep() {
  const size = useConfigurator((s) => s.size);
  const setSize = useConfigurator((s) => s.setSize);
  const applySize = useConfigurator((s) => s.applySize);

  const [wFt, setWFt] = useState(String(size.widthFt));
  const [wIn, setWIn] = useState(String(size.widthIn));
  const [hFt, setHFt] = useState(String(size.heightFt));
  const [hIn, setHIn] = useState(String(size.heightIn));

  useEffect(() => {
    setWFt(String(size.widthFt));
    setWIn(String(size.widthIn));
    setHFt(String(size.heightFt));
    setHIn(String(size.heightIn));
  }, [size.widthFt, size.widthIn, size.heightFt, size.heightIn]);

  function commit() {
    const wf = Math.max(1, Math.min(11, parseInt(wFt) || 1));
    const wi = Math.max(0, Math.min(11, parseInt(wIn) || 0));
    const hf = Math.max(1, Math.min(11, parseInt(hFt) || 1));
    const hi = Math.max(0, Math.min(11, parseInt(hIn) || 0));
    setSize({ widthFt: wf, widthIn: wi, heightFt: hf, heightIn: hi });
  }

  const display = dimensionsDisplay({
    widthFt: size.widthFt,
    widthIn: size.widthIn,
    heightFt: size.heightFt,
    heightIn: size.heightIn,
  });
  const billable = billableDimensions({
    widthFt: size.widthFt,
    widthIn: size.widthIn,
    heightFt: size.heightFt,
    heightIn: size.heightIn,
  });

  return (
    <section aria-labelledby="size-h">
      <h2 id="size-h" className="font-bold text-heading-h4 text-ink mb-md">
        1. Pick your size
      </h2>

      <div className="space-y-lg">
        <div>
          <p className="text-sm text-ink-muted mb-sm">Quick-pick popular sizes</p>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-xs">
            {POPULAR_SIZES.slice(0, 10).map((s, idx) => {
              const active = size.widthFt === s.widthFt && size.heightFt === s.heightFt && size.widthIn === 0 && size.heightIn === 0;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => applySize(s.widthFt, s.heightFt)}
                  className={cn(
                    "rounded-btn border p-sm text-sm font-bold text-center transition-all",
                    active
                      ? "bg-soft-accent border-strong-accent text-ink"
                      : "bg-surface border-line text-ink hover:border-strong-accent",
                  )}
                >
                  <span className="block">{s.label}</span>
                  {idx === 6 && (
                    <Star className="inline h-3 w-3 text-strong-accent fill-current mt-xs" aria-label="Most popular" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="text-sm text-ink-muted mb-sm">Or enter a custom size</p>
          <Card variant="default" className="bg-surface">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-md">
              <NumberField label="Width (ft)" value={wFt} onChange={setWFt} onBlur={commit} min={1} max={11} />
              <NumberField label="Width (in)" value={wIn} onChange={setWIn} onBlur={commit} min={0} max={11} />
              <NumberField label="Height (ft)" value={hFt} onChange={setHFt} onBlur={commit} min={1} max={11} />
              <NumberField label="Height (in)" value={hIn} onChange={setHIn} onBlur={commit} min={0} max={11} />
            </div>
          </Card>
        </div>

        <Card
          className={cn(
            display.eligible ? "bg-soft-accent" : "bg-badge-error-bg",
          )}
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-sm">
            <div>
              <p className="text-sm font-bold text-ink">
                Requested: <span className="font-normal text-ink-muted">{display.requestedLabel}</span>
              </p>
              <p className="text-body font-bold text-ink mt-xs">
                Billable: <span className="text-strong-accent">{display.billableLabel}</span>{" "}
                <span className="font-normal text-ink-muted">= {billable.sqFt} sq ft</span>
              </p>
            </div>
            {!display.eligible && (
              <p className="text-sm text-danger font-bold max-w-xs">
                {display.ineligibilityReason}
              </p>
            )}
          </div>
        </Card>
      </div>
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  onBlur,
  min,
  max,
}: {
  label: string;
  value: string;
  onChange: (s: string) => void;
  onBlur: () => void;
  min: number;
  max: number;
}) {
  return (
    <label className="block">
      <span className="text-body-sm text-ink-muted block mb-xs">{label}</span>
      <Input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        inputSize="md"
      />
    </label>
  );
}
