"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import { useCart } from "@/lib/stores/cart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { RETRACTABLE, MAX_QUANTITY_PER_LINE, SHIPPING_FLAT_PER_UNIT_USD, formatInchesWH } from "@bannersin48/shared";
import { cartLineFromQuote } from "@/lib/cart/quoteState";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { PageHeader } from "@/components/ui/page-header";
import { placeholders } from "@/content/placeholders";
import { getApiClient } from "@/lib/api/client";
import { ImagePickerOverlay } from "@/components/builder/ImagePickerOverlay";

export default function RetractableConfiguratorPage() {
  const setProduct = useConfigurator((s) => s.setProduct);
  const setQuantity = useConfigurator((s) => s.setQuantity);
  const quantity = useConfigurator((s) => s.quantity);
  const artworkId = useConfigurator((s) => s.artworkId);
  const artworkFileName = useConfigurator((s) => s.artworkFileName);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);
  const addLine = useCart((s) => s.addLine);
  const router = useRouter();
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    setProduct("RETRACTABLE");
  }, [setProduct]);

  const unitPrice = RETRACTABLE.priceUsd;
  const shipping = SHIPPING_FLAT_PER_UNIT_USD * quantity;
  const total = unitPrice * quantity + shipping;

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <PageHeader
          trail={[
            { href: "/", label: "Home" },
            { href: "/order", label: "Order" },
          ]}
          title="Retractable banner"
          intro="A portable full-height display for trade shows, retail, and events. The stand, printed graphic, and carrying case are included."
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-7 space-y-lg">
            <ProductGallery />

            <Card className="bg-surface">
              <h2 className="text-heading-h4 text-ink mb-sm">Specifications</h2>
              <dl className="text-body-sm space-y-xs">
                <Row label="Size" value={formatInchesWH(RETRACTABLE.widthIn, RETRACTABLE.heightIn)} />
                <Row label="Hardware" value="Retractable stand + carrying case (included)" />
                <Row label="Artwork" value="JPEG, PNG, or PDF" />
                <Row label="Delivery" value="By 12:00 PM, 48 business hours" />
              </dl>
            </Card>

            <Card className="bg-surface">
              <h2 className="text-heading-h4 text-ink mb-sm">Artwork (required)</h2>
              <p className="text-body-sm text-ink-muted mb-md">
                {artworkFileName ?? "Select the completed file to print."}
              </p>
              <Button variant="secondary" size="md" onClick={() => setPickerOpen(true)}>
                {artworkId ? "Change artwork" : "Select artwork"}
              </Button>
            </Card>

            <Card className="bg-surface">
              <h2 className="text-heading-h4 text-ink mb-sm">Quantity</h2>
              <div className="flex items-center gap-md">
                <Button
                  variant="secondary"
                  size="md"
                  aria-label="Decrease quantity"
                  onClick={() => setQuantity(quantity - 1)}
                  disabled={quantity <= 1}
                >
                  <Minus className="h-4 w-4" aria-hidden />
                </Button>
                <p className="text-3xl font-bold text-ink tabular-nums min-w-[60px] text-center">{quantity}</p>
                <Button
                  variant="secondary"
                  size="md"
                  aria-label="Increase quantity"
                  onClick={() => setQuantity(quantity + 1)}
                  disabled={quantity >= MAX_QUANTITY_PER_LINE}
                >
                  <Plus className="h-4 w-4" aria-hidden />
                </Button>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-5">
            <Card className="bg-surface sticky top-20">
              <p className="text-sm text-ink-muted">Live price</p>
              <p className="text-3xl font-bold text-ink mt-xs tabular-nums">{formatUsd(total)}</p>
              <dl className="mt-md text-sm space-y-xs">
                <Row label="Product" value={formatUsd(unitPrice * quantity)} />
                <Row label={`Shipping (${quantity} × ${formatUsd(SHIPPING_FLAT_PER_UNIT_USD)})`} value={formatUsd(shipping)} />
                <div className="border-t border-line my-sm" />
                <Row label="Total before tax" value={formatUsd(total)} bold />
              </dl>
              <Button
                variant="cta"
                size="block"
                className="mt-lg w-full"
                disabled={!artworkId || adding}
                onClick={async () => {
                  if (!artworkId) return;
                  setAdding(true);
                  try {
                    const finishing = { welding: false, grommets: false, windSlits: false, polePockets: false, rope: false, webbing: false };
                    const dimensions = { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 };
                    const quote = await getApiClient().quote({
                      productId: "RETRACTABLE",
                      material: "RETRACTABLE",
                      dimensions,
                      finishing,
                      quantity,
                    });
                    const cartLine = cartLineFromQuote(
                      `cart_${Date.now()}`,
                      { productId: "RETRACTABLE", material: "RETRACTABLE", dimensions, finishing, quantity, artworkId },
                      quote,
                    );
                    if (!cartLine) return;
                    addLine(cartLine);
                    router.push("/cart");
                  } finally {
                    setAdding(false);
                  }
                }}
              >
                <ShoppingCart className="mr-sm h-5 w-5" aria-hidden />
                {adding ? "Adding…" : "Add to cart"}
              </Button>
              {!artworkId && (
                <p className="mt-sm text-sm text-danger text-center" role="alert">
                  Select artwork before adding to cart.
                </p>
              )}
              <p className="mt-md text-body-sm text-ink-muted text-center">
                Looking for a lower-priced stand?{" "}
                <Link href="/order/econostand" className="text-link hover:underline">
                  Also consider Econostand
                </Link>
                .{" "}
                <Link href="/order" className="text-link hover:underline">
                  See all banner types
                </Link>
                .
              </p>
            </Card>
          </div>
        </div>
      </div>
      <ImagePickerOverlay />
    </div>
  );
}

function ProductGallery() {
  return (
    <section
      className="overflow-hidden rounded-card border border-line-subtle bg-surface shadow-elev-1"
      aria-labelledby="retractable-gallery-h"
    >
      <h2 id="retractable-gallery-h" className="sr-only">
        Retractable banner product gallery
      </h2>

      <div className="relative w-full aspect-[4/3] sm:aspect-[16/9] sm:min-h-[260px] overflow-hidden">
        <Image
          src={placeholders.catalogEconostand.src}
          alt="Retractable banner stand with a printed graphic in a building lobby"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="object-cover"
        />
      </div>

      <div className="grid grid-cols-1 gap-px bg-line-subtle sm:grid-cols-2">
        <figure className="bg-surface">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src="/images/placeholders/pillar-proof.jpg"
              alt="Designer reviewing banner artwork before production"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 29vw"
              className="object-cover"
            />
          </div>
          <figcaption className="p-md">
            <p className="font-bold text-ink">You check the file</p>
            <p className="mt-xs text-body-sm text-ink-muted">Upload a JPEG, PNG, or PDF and review it at checkout.</p>
          </figcaption>
        </figure>

        <figure className="bg-surface">
          <div className="relative aspect-[4/3] overflow-hidden">
            <Image
              src="/images/placeholders/flagship-production.jpg"
              alt="Colorful custom banner being printed in a production facility"
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 29vw"
              className="object-cover"
            />
          </div>
          <figcaption className="p-md">
            <p className="font-bold text-ink">Printed in-house</p>
            <p className="mt-xs text-body-sm text-ink-muted">Produced on our 48-hour schedule.</p>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between gap-md ${bold ? "font-bold text-ink" : "text-ink-muted"}`}>
      <dt>{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
