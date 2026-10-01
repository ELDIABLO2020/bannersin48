"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useConfigurator } from "@/lib/stores/configurator";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { useCart } from "@/lib/stores/cart";
import { useCartDrawer } from "@/lib/stores/cart-drawer";
import { formatUsd } from "@/lib/utils/format";
import { useCutoffCountdown } from "@/lib/hooks/useCutoffCountdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils/cn";
import { Bookmark, Clock, Image as ImageIcon, ShoppingCart } from "lucide-react";
import { materialLabel } from "./builderRules";
import { useBuilderQuote } from "./useBuilderQuote";
import {
  PRODUCTS,
} from "@bannersin48/shared";
import { cartLineFromQuote } from "@/lib/cart/quoteState";

/** "4′ × 8′" / "4′ 6″ × 8′" for a default design name. */
function sizeLabel(size: { widthFt: number; widthIn: number; heightFt: number; heightIn: number }): string {
  const axis = (ft: number, inches: number) => `${ft}′${inches ? ` ${inches}″` : ""}`;
  return `${axis(size.widthFt, size.widthIn)} × ${axis(size.heightFt, size.heightIn)}`;
}

export function PriceHero() {
  const signs = useConfigurator((s) => s.signs);
  const activeSignId = useConfigurator((s) => s.activeSignId);
  const productId = useConfigurator((s) => s.productId);
  const material = useConfigurator((s) => s.material);
  const quantity = useConfigurator((s) => s.quantity);
  const addLine = useCart((s) => s.addLine);
  const openDrawer = useCartDrawer((s) => s.open);
  const selectSign = useConfigurator((s) => s.selectSign);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);
  const user = useAuth((s) => s.user);
  const pathname = usePathname();
  const config = PRODUCTS[productId];

  const { displayTotal, eligible, billableSqFt, isFetching, ineligibilityReason } = useBuilderQuote();

  const { padded, deliveryDow } = useCutoffCountdown();

  const [adding, setAdding] = useState(false);

  // "Save design" keeps the active sign's configuration in the account
  // (POST /designs); artwork is attached when the sign has one, but is not
  // required, so a layout can be saved before the file is ready.
  const activeSign = signs.find((sign) => sign.id === activeSignId) ?? signs[0];
  const [saveOpen, setSaveOpen] = useState(false);
  const [designName, setDesignName] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

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

  function openSaveDialog() {
    if (!activeSign) return;
    const product = PRODUCTS[activeSign.productId];
    setDesignName(product.sizeMode === "fixed" ? product.title : `${product.title} ${sizeLabel(activeSign.size)}`);
    setSaveError(null);
    setSavedNotice(null);
    setSaveOpen(true);
  }

  async function handleSaveDesign(e: FormEvent) {
    e.preventDefault();
    if (!activeSign) return;
    const name = designName.trim();
    if (!name) {
      setSaveError("Give the design a name.");
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      await getApiClient().createDesign({
        name,
        productId: activeSign.productId,
        config: {
          material: activeSign.material,
          dimensions: activeSign.size,
          finishing: activeSign.finishing,
          quantity: activeSign.quantity,
        },
        ...(activeSign.artworkId ? { artworkFileId: activeSign.artworkId } : {}),
      });
      setSaveOpen(false);
      setSavedNotice(`“${name}” is saved to your account.`);
    } catch (err) {
      setSaveError((err as Error).message || "The design could not be saved. Try again.");
    } finally {
      setSaving(false);
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

      {/* Save for later: outside the pinned action bar so it stays in the card flow on phones. */}
      <div className="mt-md border-t border-line pt-md text-center" data-testid="save-design">
        {user ? (
          <>
            <button
              type="button"
              onClick={openSaveDialog}
              disabled={!eligible || !activeSign}
              className="inline-flex min-h-11 items-center gap-xs text-body-sm text-link underline bg-transparent border-none cursor-pointer disabled:cursor-not-allowed disabled:text-ink-muted disabled:no-underline"
              data-testid="save-design-open"
            >
              <Bookmark className="h-4 w-4" aria-hidden />
              {signs.length > 1 ? "Save selected sign as a design" : "Save design for later"}
            </button>
            {savedNotice && (
              <p role="status" className="mt-xs text-body-sm text-ink-muted" data-testid="save-design-notice">
                {savedNotice}{" "}
                <Link href="/account/designs" className="text-link underline">
                  View saved designs
                </Link>
              </p>
            )}
          </>
        ) : (
          <Link
            href={`/login?next=${encodeURIComponent(pathname)}`}
            className="inline-flex min-h-11 items-center gap-xs text-body-sm text-link underline"
            data-testid="save-design-signin"
          >
            <Bookmark className="h-4 w-4" aria-hidden />
            Sign in to save this design for later
          </Link>
        )}
      </div>

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent className="p-lg" hideClose>
          <form onSubmit={handleSaveDesign} className="space-y-md">
            <DialogTitle>Save this design</DialogTitle>
            <DialogDescription>
              Keeps the size, material, finishing and quantity
              {activeSign?.artworkId ? ", plus the artwork," : ""} in your account so you can order it again at
              that day&rsquo;s price.
            </DialogDescription>
            <label className="block" htmlFor="save-design-name">
              <span className="text-body-sm text-ink-muted block mb-xs">Design name</span>
              <Input
                id="save-design-name"
                value={designName}
                onChange={(e) => setDesignName(e.target.value)}
                maxLength={80}
                autoComplete="off"
                autoFocus
                data-testid="save-design-name"
              />
            </label>
            {saveError && (
              <p role="alert" className="text-body-sm text-danger" data-testid="save-design-error">
                {saveError}
              </p>
            )}
            <div className="flex justify-end gap-sm">
              <Button type="button" variant="secondary" onClick={() => setSaveOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving} data-testid="save-design-submit">
                {saving ? "Saving…" : "Save design"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
