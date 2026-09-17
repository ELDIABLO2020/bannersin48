"use client";

import { useConfigurator } from "@/lib/stores/configurator";
import { materialLabel } from "./builderRules";
import { RateMatrix } from "./RateMatrix";
import {
  PRODUCTS,
  SHIPPING_FLAT_PER_UNIT_USD,
  formatDimensionsHW,
  formatInchesWH,
} from "@bannersin48/shared";

/** Industry-facing "height × width" label, e.g. "4′ H × 8′ W". */
function formatSizeLabel(size: {
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
}): string {
  return formatDimensionsHW(size);
}

function specsSubtitle(materialLabelText: string, sizeLabel: string): string {
  const sides = materialLabelText
    .replace(/single-sided/i, "Single Sided")
    .replace(/double-sided/i, "Double Sided");
  return `Vinyl ${sides}, ${sizeLabel}`;
}

export function StageHeader() {
  const productId = useConfigurator((s) => s.productId);
  const material = useConfigurator((s) => s.material);
  const size = useConfigurator((s) => s.size);
  const config = PRODUCTS[productId];

  const sizeLabel = formatSizeLabel(size);
  const subtitle =
    productId === "HD_BANNER"
      ? specsSubtitle(materialLabel(material), sizeLabel)
      : config.sizeMode === "fixed" && config.fixedSizeIn
        ? `${config.title}, ${formatInchesWH(config.fixedSizeIn.widthIn, config.fixedSizeIn.heightIn)}`
        : `${materialLabel(material)}, ${sizeLabel}`;

  return (
    <header
      data-testid="stage-header"
      className="border-b border-line bg-surface px-lg py-md"
    >
      <div className="grid grid-cols-1 gap-sm min-[901px]:grid-cols-[minmax(0,1fr)_auto] min-[901px]:items-start min-[901px]:gap-md">
        <div className="min-w-0">
          <h1 className="font-display text-heading-h2 text-ink">
            {productId === "HD_BANNER" ? "HD Banner (Vinyl)" : config.title}
          </h1>
          <p data-testid="stage-header-specs" className="mt-0.5 text-body-sm text-ink-muted truncate">
            {subtitle}
          </p>
        </div>

        <div className="hidden min-[901px]:block">
          {productId === "HD_BANNER" ? (
            <RateMatrix material={material} showShippingNote title="Rate per sq ft" />
          ) : config.sizeMode === "custom" ? (
            <p data-testid="rate-single" className="text-xs text-ink-muted">
              ${config.ratePerSqFt(material).toFixed(2)} / sq ft · Shipping ${SHIPPING_FLAT_PER_UNIT_USD.toFixed(0)} / banner
            </p>
          ) : null}
        </div>

      </div>
    </header>
  );
}
