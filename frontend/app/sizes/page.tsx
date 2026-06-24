import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  ChevronRight,
  Package,
  Ruler,
  Scissors,
  Truck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import {
  ADDON_RATES,
  MATERIALS,
  MATERIAL_RATES,
  MAX_BILLABLE_FT,
  MAX_QUANTITY_PER_LINE,
  MIN_BILLABLE_FT,
  POPULAR_SIZES,
  RETRACTABLE,
  SHIPPING_FLAT_PER_UNIT_USD,
  type Material,
} from "@bannersin48/shared";

export const metadata = {
  title: "Sizes & pricing — Banners In 48",
  description:
    "Transparent per-square-foot pricing for vinyl banners. Free welding and grommets, $10 flat shipping per banner, and a 10 ft × 10 ft instant-pricing ceiling.",
};

const VINYL_MATERIALS = MATERIALS.filter((m) => m.id !== "RETRACTABLE");

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
    body: "FedEx only, anywhere in the US & Canada. If we miss the 48-hour delivery, the shipping fee is refunded.",
    ref: "BI48-015",
  },
];

export default function SizesAndPricingPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">
            Home
          </Link>
          <ChevronRight className="inline h-3.5 w-3.5 mx-xs" aria-hidden />
          <span className="text-ink">Sizes &amp; pricing</span>
        </nav>

        <header className="mb-2xl">
          <h1 className="font-display text-section-h2 text-ink leading-section-h2">
            Sizes &amp; pricing
          </h1>
          <p className="text-body text-ink-muted mt-md max-w-2xl">
            Transparent per-square-foot pricing. Welding and grommets are always included, add-ons
            are listed up front, and shipping is a flat {formatUsd(SHIPPING_FLAT_PER_UNIT_USD)} per
            banner.
          </p>
        </header>

        <PricingMatrix />
        <AllSizesGrid />
        <FinishingSection />
        <RetractableSection />
        <ConstraintsSection />

        <div className="text-center mt-3xl">
          <Link href="/order/vinyl">
            <Button variant="cta" size="lg">
              Start your order <ChevronRight className="ml-sm h-5 w-5" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function SectionHeading({
  id,
  title,
  subtitle,
}: {
  id: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-xl">
      <h2
        id={id}
        className="font-display text-heading-h4 text-ink leading-heading-h4 uppercase tracking-wide"
      >
        {title}
      </h2>
      {subtitle && <p className="text-body-sm text-ink-muted mt-xs max-w-2xl">{subtitle}</p>}
    </div>
  );
}

function PricingMatrix() {
  return (
    <section className="mb-3xl" aria-labelledby="pricing-matrix-h">
      <SectionHeading
        id="pricing-matrix-h"
        title="Pricing matrix"
        subtitle={`Per-unit product price by size and material. Quantity 1, no add-ons. Add ${formatUsd(
          SHIPPING_FLAT_PER_UNIT_USD,
        )} flat shipping per banner.`}
      />

      <div className="overflow-x-auto rounded-card border border-line-subtle bg-surface shadow-elev-1">
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
                      href={`/order/vinyl?w=${s.widthFt}&h=${s.heightFt}`}
                      className="text-link no-underline hover:underline"
                    >
                      {s.label}
                    </Link>
                    {isPopular && (
                      <span className="ml-sm inline-block rounded-sm bg-strong-accent px-sm py-micro text-[11px] font-bold uppercase text-strong-accent-text align-middle">
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
        Prices reflect qty 1, no add-ons, and exclude the {formatUsd(SHIPPING_FLAT_PER_UNIT_USD)}{" "}
        flat shipping fee per unit.
      </p>
    </section>
  );
}

function AllSizesGrid() {
  return (
    <section className="mb-3xl" aria-labelledby="all-sizes-h">
      <SectionHeading
        id="all-sizes-h"
        title="All standard sizes"
        subtitle="Every size below is eligible for instant pricing and the 48-hour delivery promise."
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-md">
        {POPULAR_SIZES.map((s) => (
          <Link
            key={s.id}
            href={`/order/vinyl?w=${s.widthFt}&h=${s.heightFt}`}
            className="ps-card group block no-underline"
          >
            <article
              className={`relative flex min-h-[200px] flex-col rounded-card border p-lg shadow-elev-1 transition-all hover:-translate-y-1 hover:shadow-elev-2 ${
                s.id === "4x8"
                  ? "border-strong-accent bg-surface ring-1 ring-strong-accent"
                  : "border-line bg-surface hover:border-strong-accent"
              }`}
            >
              {s.id === "4x8" && (
                <span className="absolute -top-sm left-lg rounded-sm bg-strong-accent px-sm py-micro text-[11px] font-bold uppercase text-strong-accent-text">
                  Most popular
                </span>
              )}
              <h3 className="font-display font-extrabold tracking-tight text-[24px] leading-none text-ink">
                {s.label}
              </h3>
              <p className="mt-sm text-body-sm text-ink-muted">{s.sqFt} sq ft</p>
              <div className="mt-auto pt-lg">
                <p className="text-body-sm text-ink-muted">
                  From{" "}
                  <span className="font-bold text-ink">
                    {formatUsd(s.sqFt * (MATERIAL_RATES["VINYL_13OZ_SINGLE" as Material] ?? 0))}
                  </span>
                </p>
                <span className="mt-sm inline-flex w-full items-center justify-center gap-xs rounded-btn bg-strong-accent px-md py-sm text-body-sm font-bold text-strong-accent-text transition-colors group-hover:bg-strong-accent-hover">
                  Order now <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
            </article>
          </Link>
        ))}

        <Link href="/order/vinyl" className="ps-card group block no-underline">
          <article className="relative flex min-h-[200px] flex-col rounded-card border border-navy-deep bg-navy-base p-lg shadow-elev-1 transition-all hover:-translate-y-1 hover:shadow-elev-2">
            <span className="absolute -top-sm left-lg rounded-sm bg-strong-accent px-sm py-micro text-[11px] font-bold uppercase text-strong-accent-text">
              Made to order
            </span>
            <h3 className="font-display font-extrabold tracking-tight text-[24px] leading-none text-ink-light">
              Custom
            </h3>
            <p className="mt-sm text-body-sm text-ink-light/80">
              Any size up to {MAX_BILLABLE_FT}' × {MAX_BILLABLE_FT}'.
            </p>
            <div className="mt-auto pt-lg">
              <p className="text-heading-h4 font-bold text-strong-accent">Built to fit</p>
              <span className="mt-sm inline-flex w-full items-center justify-center gap-xs rounded-btn bg-lightest px-md py-sm text-body-sm font-bold text-navy-base transition-colors group-hover:bg-ink-light">
                Configure <ArrowRight className="h-4 w-4" aria-hidden />
              </span>
            </div>
          </article>
        </Link>
      </div>
    </section>
  );
}

function FinishingSection() {
  return (
    <section className="mb-3xl" aria-labelledby="finishing-h">
      <SectionHeading
        id="finishing-h"
        title="Finishing options & add-ons"
        subtitle="Welding and grommets are always included. Charged add-ons scale with billable square footage."
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

function RetractableSection() {
  return (
    <section className="mb-3xl" aria-labelledby="retractable-h">
      <SectionHeading
        id="retractable-h"
        title="Retractable banner"
        subtitle="Fixed size, flat price. Hardware and carrying case included."
      />
      <article className="rounded-card border border-line-subtle bg-surface p-xl shadow-elev-2">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl items-center">
          <div className="lg:col-span-7">
            <p className="text-body-sm text-ink-muted uppercase tracking-widest">
              BI48-019 · Retractable banner
            </p>
            <h3 className="font-display text-2xl font-bold text-ink mt-xs">
              {RETRACTABLE.widthIn}" × {RETRACTABLE.heightIn}"
            </h3>
            <ul className="mt-md space-y-xs text-body text-ink-muted">
              <li className="flex items-center gap-sm">
                <Package className="h-4 w-4 text-strong-accent" aria-hidden />
                Hardware stand and carrying case included
              </li>
              <li className="flex items-center gap-sm">
                <Truck className="h-4 w-4 text-strong-accent" aria-hidden />
                {formatUsd(SHIPPING_FLAT_PER_UNIT_USD)} flat shipping per unit via FedEx
              </li>
              <li className="flex items-center gap-sm">
                <BadgeCheck className="h-4 w-4 text-strong-accent" aria-hidden />
                Same Banners In 48 delivery guarantee schedule
              </li>
              <li className="flex items-center gap-sm">
                <Ruler className="h-4 w-4 text-strong-accent" aria-hidden />
                Max {MAX_QUANTITY_PER_LINE} per line — add more lines for larger quantities
              </li>
            </ul>
          </div>
          <div className="lg:col-span-5 text-center lg:text-right">
            <p className="text-body-sm text-ink-muted">Price per unit</p>
            <p className="font-display text-[56px] leading-none font-bold text-ink tabular-nums">
              {formatUsd(RETRACTABLE.priceUsd)}
            </p>
            <Link href="/order/retractable" className="inline-block mt-lg">
              <Button variant="cta" size="lg">
                Order retractable <ArrowRight className="ml-sm h-4 w-4" aria-hidden />
              </Button>
            </Link>
          </div>
        </div>
      </article>
    </section>
  );
}

function ConstraintsSection() {
  return (
    <section className="mb-3xl" aria-labelledby="constraints-h">
      <SectionHeading
        id="constraints-h"
        title="Size constraints & how billing works"
        subtitle="Every banner price is built from billable square footage. The rules below govern what's eligible for instant pricing."
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        {CONSTRAINTS.map((c) => (
          <article
            key={c.ref}
            className="rounded-card border border-line-subtle bg-surface p-lg shadow-elev-1"
          >
            <div className="flex items-start justify-between gap-md">
              <p className="font-bold text-ink">{c.label}</p>
              <span className="shrink-0 rounded-sm bg-soft-accent px-sm py-micro text-[11px] font-bold uppercase text-ink-muted">
                {c.ref}
              </span>
            </div>
            <p className="text-body-sm text-ink-muted mt-xs">{c.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
