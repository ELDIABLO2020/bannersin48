"use client";

import Image from "next/image";
import { useEffect } from "react";
import { useConfigurator } from "@/lib/stores/configurator";
import { useCart } from "@/lib/stores/cart";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { RETRACTABLE, MAX_QUANTITY_PER_LINE } from "@bannersin48/shared";
import { Minus, Plus, ShoppingCart } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RetractableConfiguratorPage() {
  const setProduct = useConfigurator((s) => s.setProduct);
  const setMaterial = useConfigurator((s) => s.setMaterial);
  const setQuantity = useConfigurator((s) => s.setQuantity);
  const quantity = useConfigurator((s) => s.quantity);
  const addLine = useCart((s) => s.addLine);
  const router = useRouter();

  useEffect(() => {
    setProduct("retractable");
    setMaterial("RETRACTABLE");
  }, [setProduct, setMaterial]);

  const unitPrice = RETRACTABLE.priceUsd;
  const shipping = 10 * quantity;
  const total = unitPrice * quantity + shipping;

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">Home</Link>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          Retractable banner
        </h1>
        <p className="mb-xl max-w-2xl text-body text-ink-muted">
          A portable, professional display for trade shows, retail spaces, presentations, and
          events. The stand, printed graphic, and carrying case are included.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-7 space-y-lg">
            <ProductGallery />

            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-sm">Specifications</h2>
              <dl className="text-body-sm space-y-xs">
                <Row label="Size" value={`${RETRACTABLE.widthIn}" × ${RETRACTABLE.heightIn}"`} />
                <Row label="Hardware" value="Retractable stand + carrying case (included)" />
                <Row label="Artwork" value="PDF or JPEG only" />
                <Row label="Delivery" value="By 12:00 PM, 48 business hours" />
              </dl>
            </Card>

            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-sm">Quantity</h2>
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
                <Row label={`Shipping (${quantity} × $10)`} value={formatUsd(shipping)} />
                <div className="border-t border-line my-sm" />
                <Row label="Total before tax" value={formatUsd(total)} bold />
              </dl>
              <Button
                variant="cta"
                size="block"
                className="mt-lg w-full"
                onClick={() => {
                  addLine({
                    id: `cart_${Date.now()}`,
                    product: "retractable",
                    material: "RETRACTABLE",
                    dimensions: { widthFt: 0, widthIn: 0, heightFt: 0, heightIn: 0 },
                    finishing: { welding: false, grommets: false, windSlits: false, polePockets: false },
                    quantity,
                    unitProduct: unitPrice,
                    addons: 0,
                    productSubtotal: unitPrice * quantity,
                    shipping,
                    totalBeforeTax: total,
                    billableSqFt: 0,
                    billableDims: { widthFt: 0, heightFt: 0 },
                    display: {
                      requestedLabel: `${RETRACTABLE.widthIn}" × ${RETRACTABLE.heightIn}"`,
                      billableLabel: "Fixed size",
                    },
                  });
                  router.push("/cart");
                }}
              >
                <ShoppingCart className="mr-sm h-5 w-5" aria-hidden />
                Add to cart
              </Button>
            </Card>
          </div>
        </div>
      </div>
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

      <div className="relative aspect-[16/9] min-h-[260px] overflow-hidden">
        <Image
          src="/images/placeholders/industry-events.jpg"
          alt="Large printed banner display welcoming guests to a professional event"
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 58vw"
          className="object-cover object-[65%_center]"
        />
        <div className="absolute inset-x-md bottom-md max-w-sm rounded-card bg-navy-base/90 p-md text-ink-light backdrop-blur-sm">
          <p className="font-display text-heading-h4 font-bold uppercase">Made to stand out</p>
          <p className="mt-xs text-body-sm text-ink-light/80">
            Portable full-height event display.
          </p>
        </div>
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
            <p className="font-bold text-ink">Artwork checked</p>
            <p className="mt-xs text-body-sm text-ink-muted">PDF or JPEG files accepted.</p>
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
