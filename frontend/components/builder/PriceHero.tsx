"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import { formatUsd } from "@/lib/utils/format";
import { formatCountdown } from "@/lib/utils/time";
import { Button } from "@/components/ui/button";
import { Clock, ShoppingCart } from "lucide-react";
import { materialLabel } from "./builderRules";
import { RateMatrix } from "./RateMatrix";
import { useBuilderQuote } from "./useBuilderQuote";
import { PRODUCTS, SHIPPING_FLAT_PER_UNIT_USD } from "@bannersin48/shared";

export function PriceHero() {
  const signs = useConfigurator((s) => s.signs);
  const productId = useConfigurator((s) => s.productId);
  const material = useConfigurator((s) => s.material);
  const quantity = useConfigurator((s) => s.quantity);
  const addLine = useCart((s) => s.addLine);
  const openDrawer = useCartDrawer((s) => s.open);
  const config = PRODUCTS[productId];

  const { displayTotal, eligible, billableSqFt, isFetching, ineligibilityReason } = useBuilderQuote();

  const { data: cutoff } = useQuery({
    queryKey: ["next-cutoff"],
    queryFn: () => getApiClient().getNextCutoff(),
    refetchInterval: 60_000,
  });

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const cutoffTs = cutoff ? new Date(cutoff.cutoffAtEt).getTime() : 0;
  const { padded } = cutoff ? formatCountdown(cutoffTs - now) : { padded: "--:--:--" };

  const [adding, setAdding] = useState(false);

  async function handleAddAll() {
    setAdding(true);
    try {
      for (const sign of signs) {
        const quote = await getApiClient().quote({
          productId: sign.productId,
          material: sign.material,
          dimensions: sign.size,
          finishing: sign.finishing,
          quantity: sign.quantity,
        });
        const line = quote.lines[0];
        if (!line || !quote.eligible) continue;
        const signConfig = PRODUCTS[sign.productId];
        addLine({
          id: `cart_${Date.now()}_${sign.id}`,
          product: signConfig.slug,
          productId: sign.productId,
          material: sign.material,
          dimensions: sign.size,
          finishing: sign.finishing,
          quantity: sign.quantity,
          artworkId: sign.artworkId!,
          quoteId: quote.quoteId,
          quoteValidUntil: quote.validUntil,
          currency: quote.currency,
          unitProduct: line.unitProduct,
          addons: line.addons,
          productSubtotal: line.productSubtotal,
          shipping: line.shipping,
          totalBeforeTax: line.totalBeforeTax,
          billableSqFt: line.billableSqFt,
          billableDims: line.billableDims,
          display: {
            requestedLabel:
              signConfig.sizeMode === "fixed"
                ? '33.5" × 80"'
                : `${sign.size.widthFt}' ${sign.size.widthIn}" × ${sign.size.heightFt}' ${sign.size.heightIn}"`,
            billableLabel: signConfig.sizeMode === "fixed" ? "Fixed size" : `${line.billableDims.widthFt}' × ${line.billableDims.heightFt}'`,
          },
        });
      }
      openDrawer();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div data-testid="price-hero" className="rounded-feature border border-line bg-surface p-md shadow-sm">
      <p className="text-xs uppercase tracking-widest text-ink-muted">Live price</p>
      <p
        data-testid="price-total"
        className="font-display text-3xl font-bold text-success mt-xs tabular-nums transition-opacity duration-200"
      >
        {formatUsd(displayTotal)}
        {isFetching && <span className="ml-2 text-body-sm text-ink-muted font-body font-normal">updating…</span>}
      </p>
      <p className="text-body-sm text-ink-muted mt-xs">
        {config.sizeMode === "fixed"
          ? `${quantity} item${quantity === 1 ? "" : "s"} · ${config.title}`
          : `${billableSqFt} sq ft · ${materialLabel(material)}`}
      </p>

      {cutoff && (
        <div className="mt-md p-sm rounded-card bg-soft-accent text-center">
          <p className="text-[10px] uppercase tracking-widest text-ink-muted">Order within</p>
          <p className="font-display text-xl font-bold tabular-nums text-strong-accent leading-none mt-1">{padded}</p>
          <p className="text-xs text-ink mt-sm flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            Delivery by {cutoff.guaranteedDeliveryDow} noon
          </p>
        </div>
      )}

      {productId === "HD_BANNER" ? (
        <RateMatrix
          material={material}
          showShippingNote
          className="mt-md hidden min-[901px]:block"
          title="Rates / sq ft"
        />
      ) : config.sizeMode === "custom" ? (
        <p data-testid="rate-single" className="mt-md hidden min-[901px]:block text-[11px] text-ink-muted">
          ${config.ratePerSqFt(material).toFixed(2)} / sq ft · Shipping ${SHIPPING_FLAT_PER_UNIT_USD.toFixed(0)} / banner
        </p>
      ) : null}

      <Button
        type="button"
        variant="cta"
        size="block"
        className="mt-md w-full"
        data-testid="add-to-cart"
        onClick={handleAddAll}
        disabled={!eligible || adding || signs.some((sign) => !sign.artworkId)}
      >
        <ShoppingCart className="mr-sm h-5 w-5" aria-hidden />
        {signs.length > 1 ? `Add ${signs.length} signs to cart` : "Add to cart"}
      </Button>
      {signs.some((sign) => !sign.artworkId) && (
        <p className="mt-sm text-sm text-danger text-center" role="alert">
          Select JPEG, PNG, or PDF artwork for every sign before adding to cart.
        </p>
      )}
      {!eligible && (
        <p className="mt-sm text-sm text-danger text-center">
          {ineligibilityReason ?? "This size exceeds the 10′ maximum."}
        </p>
      )}
    </div>
  );
}
