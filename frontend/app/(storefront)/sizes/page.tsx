import { PageHeader } from "@/components/ui/page-header";
import { SectionHeading } from "@/components/ui/section-heading";
import Link from "next/link";
import {
  BadgeCheck,
  Package,
  Scissors,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { catalogImage } from "@/content/catalogImages";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";
import { formatUsd } from "@/lib/utils/format";
import {
  ADDON_RATES,
  MATERIALS,
  MATERIAL_RATES,
  MAX_BILLABLE_FT,
  MAX_QUANTITY_PER_LINE,
  MIN_BILLABLE_FT,
  POPULAR_SIZES,
  PRODUCTS,
  ECONOSTAND_FLAT_USD,
  RETRACTABLE,
  SHIPPING_FLAT_PER_UNIT_USD,
  isVinyl,
  productOrderHref,
  type ProductId,
} from "@bannersin48/shared";

export const metadata = {
  title: "Sizes & pricing — Banners In 48",
  description:
    "Transparent pricing for HD vinyl, mesh, HDPE, poster, canvas, no-curl, and banner stands. $10 flat shipping per banner.",
};

const VINYL_MATERIALS = MATERIALS.filter((m) => isVinyl(m.id));

const SQFT_PRODUCTS: ReadonlyArray<ProductId> = ["HDPE", "MESH", "POSTER", "NO_CURL", "CANVAS"];

const FINISHING_ADDONS = [
  {
    name: "Welding",
    price: "Included",
    description: "Clean, durable heat-welded edges. Customer can choose welding or no welding.",
  },
  {
    name: "Grommets (any placement & spacing)",
    price: "Included",
    description: "Metal rings for hanging. Every placement and spacing option is free.",
  },
  {
    name: "Wind slits",
    price: `+${formatUsd(ADDON_RATES.WIND_SLITS_PER_SQFT)} / sq ft`,
    description: "Optional wind-relief cuts for outdoor installs.",
  },
  {
    name: "Pole pockets",
    price: `+${formatUsd(ADDON_RATES.POLE_POCKETS_PER_SQFT)} / sq ft`,
    description:
      "Top, bottom, top & bottom, left, right, or left & right. Selecting pole pockets automatically removes grommets and welding.",
  },
];

const MATERIAL_GUIDE: ReadonlyArray<{
  name: string;
  imageKey: PlaceholderKey;
  price: string;
  description: string;
}> = [
  {
    name: "13 oz vinyl",
    imageKey: "material13oz",
    price: `${formatUsd(MATERIAL_RATES.VINYL_13OZ_SINGLE)} / sq ft`,
    description: "The everyday choice for events, retail, contractors, and general signage.",
  },
  {
    name: "15 oz premium",
    imageKey: "material15oz",
    price: `${formatUsd(MATERIAL_RATES.VINYL_15OZ_SINGLE)} / sq ft`,
    description: "A heavier, more substantial option for demanding outdoor displays.",
  },
  {
    name: "18 oz blockout",
    imageKey: "material18oz",
    price: `From ${formatUsd(MATERIAL_RATES.VINYL_18OZ_SINGLE)} / sq ft`,
    description: "Maximum durability and opacity, with single- or double-sided printing.",
  },
];

const CONSTRAINTS = [
  {
    label: `Minimum ${MIN_BILLABLE_FT}' × ${MIN_BILLABLE_FT}'`,
    body: "Smallest billable banner footprint.",
    ref: "BI48-012",
  },
  {
    label: `Maximum ${MAX_BILLABLE_FT}' × ${MAX_BILLABLE_FT}'`,
    body: "Largest size eligible for guaranteed flat-shipping pricing. Larger sizes need a custom quote.",
    ref: "BI48-012",
  },
  {
    label: "Inches round up to the next whole foot",
    body: "Each dimension rounds up separately. A 4'6\" × 8'0\" banner is billed as 5' × 8' = 40 sq ft.",
    ref: "BI48-011",
  },
  {
    label: `Max ${MAX_QUANTITY_PER_LINE} per configuration`,
    body: "Need more? Add another line item in the cart — there's no order-wide limit.",
    ref: "BI48-014",
  },
  {
    label: `${formatUsd(SHIPPING_FLAT_PER_UNIT_USD)} flat shipping per unit`,
    body: "FedEx only, within the United States. If we miss the 48-hour delivery, the shipping fee is refunded.",
    ref: "BI48-015",
  },
];

export default function SizesAndPricingPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <PageHeader
          trail={[{ href: "/", label: "Home" }]}
          title="Sizes and pricing"
          intro={
            <>
              HD Banner vinyl is priced from the table below. Other banners are priced per square
              foot, and stands are a flat price. Shipping is {formatUsd(SHIPPING_FLAT_PER_UNIT_USD)} per
              banner.
            </>
          }
        />

        <PricingMatrix />
        <MaterialGuide />
        <OtherProductsSection />
        <FinishingSection />
        <StandsSection />
        <ConstraintsSection />

        <Link href="/order" className="inline-block">
          <Button variant="cta" size="lg">
            Start your order
          </Button>
        </Link>
      </div>
    </div>
  );
}

function MaterialGuide() {
  return (
    <section className="mb-2xl sm:mb-3xl" aria-labelledby="material-guide-h">
      <SectionHeading
        level="sub"
        className="mb-lg"
        id="material-guide-h"
        title="HD Banner vinyl weights"
        intro="13, 15, and 18 oz options shown in the pricing matrix. Order HD Banner to configure finishing."
      />
      <div className="grid grid-cols-1 gap-lg md:grid-cols-3">
        {MATERIAL_GUIDE.map((material) => (
          <VisualCategoryCard
            key={material.name}
            href="/order/hd-banner"
            title={material.name}
            image={placeholders[material.imageKey]}
            footer={
              <>
                <p className="font-bold text-link">{material.price}</p>
                <p className="mt-sm text-body-sm leading-relaxed text-ink-muted">
                  {material.description}
                </p>
              </>
            }
          />
        ))}
      </div>
    </section>
  );
}

function PricingMatrix() {
  return (
    <section className="mb-2xl sm:mb-3xl" aria-labelledby="pricing-matrix-h">
      <SectionHeading
        level="sub"
        className="mb-lg"
        id="pricing-matrix-h"
        title="HD Banner pricing matrix"
        intro={`Per-unit vinyl price by size and weight. Quantity 1, no add-ons. Add ${formatUsd(
          SHIPPING_FLAT_PER_UNIT_USD,
        )} flat shipping per banner.`}
      />

      {/* Phones: one row per size with every weight's price visible, instead of
          a table whose price columns scroll out of view. */}
      <ul className="sm:hidden divide-y divide-line-subtle rounded-card border border-line-subtle bg-surface shadow-elev-1 overflow-hidden">
        {POPULAR_SIZES.map((s) => {
          const isPopular = s.id === "4x8";
          return (
            <li key={s.id} className={isPopular ? "bg-info-tint" : undefined}>
              <Link
                href={`/order/hd-banner?width=${s.widthFt}&height=${s.heightFt}`}
                className="block px-md py-md no-underline"
              >
                <span className="flex items-center justify-between gap-sm">
                  <span className="font-bold text-link">
                    {s.label}
                    {isPopular && (
                      <span className="ml-sm inline-block rounded-pill bg-strong-accent px-sm py-micro text-xs font-bold text-strong-accent-text align-middle">
                        Most popular
                      </span>
                    )}
                  </span>
                  <span className="text-body-sm text-ink-muted tabular-nums">{s.sqFt} sq ft</span>
                </span>
                <span className="mt-sm grid grid-cols-2 gap-x-md gap-y-xs text-body-sm">
                  {VINYL_MATERIALS.map((m) => (
                    <span key={m.id} className="flex justify-between gap-xs">
                      <span className="text-ink-muted">{m.shortName}</span>
                      <span className="text-ink tabular-nums">{formatUsd(s.sqFt * m.ratePerSqFt)}</span>
                    </span>
                  ))}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="hidden sm:block overflow-x-auto rounded-card border border-line-subtle bg-surface shadow-elev-1">
        <table className="w-full border-collapse text-body-sm">
          <caption className="sr-only">
            Vinyl banner product price for each popular size across four materials.
          </caption>
          <thead>
            <tr className="bg-soft-accent text-ink">
              <th
                scope="col"
                className="text-left font-bold px-lg py-md whitespace-nowrap"
              >
                Size
              </th>
              <th scope="col" className="text-right font-bold px-lg py-md whitespace-nowrap">
                Sq ft
              </th>
              {VINYL_MATERIALS.map((m) => (
                <th
                  key={m.id}
                  scope="col"
                  className="text-right font-bold px-lg py-md whitespace-nowrap"
                >
                  <span className="block">{m.shortName}</span>
                  <span className="block text-body-sm font-normal text-ink-muted">
                    {formatUsd(m.ratePerSqFt)}/sq ft
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {POPULAR_SIZES.map((s) => {
              const isPopular = s.id === "4x8";
              return (
                <tr
                  key={s.id}
                  className={`border-t border-line-subtle ${
                    isPopular ? "bg-info-tint" : "hover:bg-soft-accent"
                  }`}
                >
                  <th
                    scope="row"
                    className="text-left font-bold text-ink px-lg py-md whitespace-nowrap"
                  >
                    <Link
                      href={`/order/hd-banner?width=${s.widthFt}&height=${s.heightFt}`}
                      className="text-link no-underline hover:underline"
                    >
                      {s.label}
                    </Link>
                    {isPopular && (
                      <span className="ml-sm inline-block rounded-pill bg-strong-accent px-sm py-micro text-body-sm font-bold text-strong-accent-text align-middle">
                        Most popular
                      </span>
                    )}
                  </th>
                  <td className="text-right text-ink-muted tabular-nums px-lg py-md">{s.sqFt}</td>
                  {VINYL_MATERIALS.map((m) => (
                    <td
                      key={m.id}
                      className="text-right text-ink tabular-nums px-lg py-md whitespace-nowrap"
                    >
                      {formatUsd(s.sqFt * m.ratePerSqFt)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-body-sm text-ink-muted mt-md">
        Pick a size to open it in the builder. Need something else?{" "}
        <Link href="/order/hd-banner">Set any size up to {MAX_BILLABLE_FT}&rsquo; × {MAX_BILLABLE_FT}&rsquo;</Link>.
      </p>
    </section>
  );
}

function FinishingSection() {
  return (
    <section className="mb-2xl sm:mb-3xl" aria-labelledby="finishing-h">
      <SectionHeading
        level="sub"
        className="mb-lg"
        id="finishing-h"
        title="HD Banner and Mesh finishing"
        intro="Welding and grommets are included on HD Banner and Mesh. Paper, canvas, HDPE, and stands have no finishing dock."
      />
      <div className="rounded-card border border-line-subtle bg-surface shadow-elev-1 overflow-hidden">
        <ul className="divide-y divide-line-subtle">
          {FINISHING_ADDONS.map((a) => (
            <li
              key={a.name}
              className="flex flex-col gap-sm sm:flex-row sm:items-center sm:justify-between p-lg"
            >
              <div>
                <p className="font-bold text-ink">{a.name}</p>
                <p className="text-body-sm text-ink-muted mt-xs max-w-2xl">{a.description}</p>
              </div>
              <span
                className={`inline-flex shrink-0 items-center rounded-pill px-md py-sm text-body-sm font-bold whitespace-nowrap ${
                  a.price === "Included"
                    ? "bg-info-tint text-link"
                    : "bg-strong-accent text-strong-accent-text"
                }`}
              >
                {a.price}
              </span>
            </li>
          ))}
        </ul>
      </div>
      <p className="text-body-sm text-ink-muted mt-md flex items-center gap-xs">
        <Scissors className="h-4 w-4 text-strong-accent" aria-hidden />
        Pole pockets use a different finishing method, so grommets and welding are removed
        automatically when pole pockets are selected.
      </p>
    </section>
  );
}

function OtherProductsSection() {
  return (
    <section className="mb-2xl sm:mb-3xl" aria-labelledby="other-products-h">
      <SectionHeading
        level="sub"
        className="mb-lg"
        id="other-products-h"
        title="Other banner products"
        intro="Per-square-foot rates with product-specific size limits. Order the product to see the live quote."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
        {SQFT_PRODUCTS.map((id) => {
          const product = PRODUCTS[id];
          const rate = product.ratePerSqFt(product.materials[0]);
          const maxShort = product.limits.maxShortSideIn;
          return (
            <VisualCategoryCard
              key={id}
              href={productOrderHref(id)}
              title={product.title}
              subtitle={product.subtitle}
              image={catalogImage(id)}
              footer={
                <>
                  <p className="font-bold text-link">{formatUsd(rate)} / sq ft</p>
                  {maxShort && (
                    <p className="mt-xs text-body-sm text-ink-muted">
                      Shorter side max {maxShort}&quot;
                    </p>
                  )}
                </>
              }
            />
          );
        })}
      </div>
    </section>
  );
}

function StandsSection() {
  const stands: ReadonlyArray<{
    id: ProductId;
    price: number;
    extra: string;
  }> = [
    {
      id: "ECONOSTAND",
      price: ECONOSTAND_FLAT_USD,
      extra: "Stand and graphic included",
    },
    {
      id: "RETRACTABLE",
      price: RETRACTABLE.priceUsd,
      extra: "Stand, graphic, and carrying case included",
    },
  ];

  return (
    <section className="mb-2xl sm:mb-3xl" aria-labelledby="stands-h">
      <SectionHeading
        level="sub"
        className="mb-lg"
        id="stands-h"
        title="Banner stands"
        intro='Fixed 33.5" × 80" size. Flat price plus $10 shipping per unit.'
      />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        {stands.map((stand) => {
          const product = PRODUCTS[stand.id];
          return (
            <VisualCategoryCard
              key={stand.id}
              href={productOrderHref(stand.id)}
              title={product.title}
              image={catalogImage(stand.id)}
              footer={
                <>
                  <p className="text-body font-bold text-ink font-body">
                    {RETRACTABLE.widthIn}&rdquo; × {RETRACTABLE.heightIn}&rdquo;
                  </p>
                  <ul className="mt-md space-y-xs text-body text-ink-muted">
                    <li className="flex items-center gap-sm">
                      <Package className="h-4 w-4 text-strong-accent" aria-hidden />
                      {stand.extra}
                    </li>
                    <li className="flex items-center gap-sm">
                      <Truck className="h-4 w-4 text-strong-accent" aria-hidden />
                      {formatUsd(SHIPPING_FLAT_PER_UNIT_USD)} flat shipping per unit via FedEx
                    </li>
                    <li className="flex items-center gap-sm">
                      <BadgeCheck className="h-4 w-4 text-strong-accent" aria-hidden />
                      Same 48-hour delivery guarantee
                    </li>
                  </ul>
                  <p className="mt-lg font-display text-heading-h2 text-ink tabular-nums">
                    {formatUsd(stand.price)}
                  </p>
                </>
              }
            />
          );
        })}
      </div>
    </section>
  );
}

function ConstraintsSection() {
  return (
    <section className="mb-2xl sm:mb-3xl" aria-labelledby="constraints-h">
      <SectionHeading
        level="sub"
        className="mb-lg"
        id="constraints-h"
        title="Size limits and how billing works"
        intro="Every banner price is built from billable square footage. The rules below govern what's eligible for instant pricing."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {CONSTRAINTS.map((c) => (
          <article
            key={`${c.ref}-${c.label}`}
            className="rounded-card border border-line-subtle bg-surface p-lg shadow-elev-1"
          >
            <p className="font-bold text-ink">{c.label}</p>
            <p className="text-body-sm text-ink-muted mt-xs">{c.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
