"use client";

import { useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import { formatUsd } from "@/lib/utils/format";
import { useCutoffCountdown } from "@/lib/hooks/useCutoffCountdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";
import { Clock, Image as ImageIcon, ShoppingCart } from "lucide-react";
import { materialLabel } from "./builderRules";
import { useBuilderQuote } from "./useBuilderQuote";
import {
  PRODUCTS,
} from "@bannersin48/shared";
import { cartLineFromQuote } from "@/lib/cart/quoteState";

export function PriceHero() {
  const signs = useConfigurator((s) => s.signs);
  const productId = useConfigurator((s) => s.productId);
  const material = useConfigurator((s) => s.material);
  const quantity = useConfigurator((s) => s.quantity);
  const addLine = useCart((s) => s.addLine);
  const openDrawer = useCartDrawer((s) => s.open);
  const selectSign = useConfigurator((s) => s.selectSign);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);
  const config = PRODUCTS[productId];

  const { displayTotal, eligible, billableSqFt, isFetching, ineligibilityReason } = useBuilderQuote();

  const { padded, deliveryDow } = useCutoffCountdown();

  const [adding, setAdding] = useState(false);

  // Until every sign has artwork the main action opens the picker for the
  // first sign without it, rather than sitting disabled.
  const signNeedingArtwork = eligible ? signs.findIndex((sign) => !sign.artworkId) : -1;
  const needsArtwork = signNeedingArtwork !== -1;
  const sizeError = eligible ? null : ineligibilityReason ?? "This size exceeds the 10′ maximum.";

  function handleAddArtwork() {
    selectSign(signs[signNeedingArtwork].id);
    setPickerOpen(true);
  }

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
        const cartLine = cartLineFromQuote(
          `cart_${Date.now()}_${sign.id}`,
          {
            productId: sign.productId,
            material: sign.material,
            dimensions: sign.size,
            finishing: sign.finishing,
            quantity: sign.quantity,
            artworkId: sign.artworkId!,
          },
          quote,
        );
        if (cartLine) addLine(cartLine);
      }
      openDrawer();
    } finally {
      setAdding(false);
    }
  }

  return (
    <div data-testid="price-hero" className="rounded-card border border-line bg-surface p-lg">
      <p className="text-body-sm text-ink-muted">Your price, before tax</p>
      <p
        data-testid="price-total"
        className="font-display text-section-h2 leading-none text-success mt-xs tabular-nums transition-opacity duration-200"
      >
        {formatUsd(displayTotal)}
        {isFetching && <span className="ml-2 text-body-sm text-ink-muted font-body font-normal">updating…</span>}
      </p>
      <p className="text-body-sm text-ink-muted mt-xs">
        {config.sizeMode === "fixed"
          ? `${quantity} × ${config.title}, shipping included`
          : `${billableSqFt} sq ft of ${materialLabel(material)}, shipping included`}
      </p>

      {padded && (
        <div className="mt-md p-sm rounded-card bg-soft-accent text-center">
          <p className="text-body-sm text-ink-muted">Order within</p>
          <p className="font-display text-heading-h2 tabular-nums text-strong-accent leading-none mt-1">{padded}</p>
          <p className="text-xs text-ink mt-sm flex items-center justify-center gap-1">
            <Clock className="h-3 w-3" aria-hidden />
            Delivered {deliveryDow} by noon
          </p>
        </div>
      )}

      {/* Below 901px the actions pin to the bottom of the screen (in place of
          the tab bar) so price and Add to cart stay in reach while building. */}
      <div
        data-testid="price-actions"
        className="mt-md max-[900px]:fixed max-[900px]:inset-x-0 max-[900px]:bottom-0 max-[900px]:z-tab-bar max-[900px]:mt-0 max-[900px]:flex max-[900px]:items-center max-[900px]:gap-md max-[900px]:border-t max-[900px]:border-line max-[900px]:bg-surface max-[900px]:px-md max-[900px]:pt-sm max-[900px]:pb-[calc(0.5rem+env(safe-area-inset-bottom))] max-[900px]:shadow-elev-3"
      >
        <div className="min-w-0 flex-1 min-[901px]:hidden">
          <p className="font-display text-heading-h3 leading-none text-success tabular-nums">
            {formatUsd(displayTotal)}
          </p>
          <p className={cn("mt-1 truncate text-xs", sizeError ? "text-danger" : "text-ink-muted")}>
            {sizeError ? "Size too large" : needsArtwork ? "JPEG, PNG, or PDF" : "Shipping included"}
          </p>
        </div>
        {needsArtwork ? (
          <Button
            type="button"
            variant="cta"
            size="block"
            className="w-full max-[900px]:w-auto max-[900px]:shrink-0 max-[900px]:px-lg"
            data-testid="add-artwork"
            onClick={handleAddArtwork}
          >
            <ImageIcon className="mr-sm h-5 w-5" aria-hidden />
            {signs.length > 1 ? `Add artwork to sign ${signNeedingArtwork + 1}` : "Add artwork"}
          </Button>
        ) : (
          <Button
            type="button"
            variant="cta"
            size="block"
            className="w-full max-[900px]:w-auto max-[900px]:shrink-0 max-[900px]:px-lg"
            data-testid="add-to-cart"
            onClick={handleAddAll}
            disabled={!eligible || adding}
          >
            <ShoppingCart className="mr-sm h-5 w-5" aria-hidden />
            {signs.length > 1 ? `Add ${signs.length} signs to cart` : "Add to cart"}
          </Button>
        )}
        {sizeError && (
          <p className="mt-sm text-sm text-danger text-center max-[900px]:sr-only" role="alert">
            {sizeError}
          </p>
        )}
        {needsArtwork && (
          <p className="mt-sm text-sm text-ink-muted text-center max-[900px]:hidden">
            Every sign needs a JPEG, PNG, or PDF before it goes in the cart.
          </p>
        )}
      </div>
    </div>
  );
}
