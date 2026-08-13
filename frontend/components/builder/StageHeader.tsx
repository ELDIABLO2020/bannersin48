"use client";

import { useConfigurator } from "@/lib/stores/configurator";
import { formatUsd } from "@/lib/utils/format";
import { materialLabel } from "./builderRules";
import { RateMatrix } from "./RateMatrix";
import { useBuilderQuote } from "./useBuilderQuote";

function formatSizeLabel(size: {
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
}): string {
  const w = size.widthIn > 0 ? `${size.widthFt}′${size.widthIn}″` : `${size.widthFt}′`;
  const h = size.heightIn > 0 ? `${size.heightFt}′${size.heightIn}″` : `${size.heightFt}′`;
  return `${w} × ${h}`;
}

function specsSubtitle(materialLabelText: string, sizeLabel: string): string {
  // "13 oz single-sided" → "Vinyl 13 oz Single Sided"
  const sides = materialLabelText
    .replace(/single-sided/i, "Single Sided")
    .replace(/double-sided/i, "Double Sided");
  return `Vinyl ${sides}, ${sizeLabel}`;
}

export function StageHeader() {
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const { displayTotal, billableSqFt, isFetching } = useBuilderQuote();

  const sizeLabel = formatSizeLabel(size);
  const subtitle = specsSubtitle(materialLabel(material), sizeLabel);

  return (
    <header
      data-testid="stage-header"
      className="border-b border-line bg-surface px-md py-sm"
    >
      <div className="grid grid-cols-1 gap-sm min-[901px]:grid-cols-[minmax(0,1.1fr)_minmax(0,1.2fr)_minmax(0,0.9fr)] min-[901px]:items-start min-[901px]:gap-md">
        <div className="min-w-0">
          <h1 className="font-display text-lg font-bold uppercase tracking-tight text-ink leading-tight sm:text-xl">
            HD Banner (Vinyl)
          </h1>
          <p data-testid="stage-header-specs" className="mt-0.5 text-xs text-ink-muted truncate">
            {subtitle}
          </p>
        </div>

        <div className="hidden min-[901px]:flex min-[901px]:justify-center">
          <RateMatrix material={material} showShippingNote title="Pricing and shipping" />
        </div>

        <div className="min-[901px]:text-right">
          <p
            data-testid="stage-header-price"
            className="font-display text-3xl font-bold tabular-nums text-success leading-none"
          >
            {formatUsd(displayTotal)}
            {isFetching && (
              <span className="ml-2 text-body-sm text-ink-muted font-body font-normal">
                updating…
              </span>
            )}
          </p>
          <p className="mt-1 text-xs text-ink-muted">
            {billableSqFt} sq ft / 48-hour production
          </p>
        </div>
      </div>
    </header>
  );
}
