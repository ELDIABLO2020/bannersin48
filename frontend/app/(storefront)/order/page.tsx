"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ChevronRight } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryCard } from "@/components/order/CategoryCard";
import {
  HUB_TITLE,
  HUB_SUBTITLE,
  PRODUCTS,
  CATALOG_NEEDS,
  CATALOG_NAV_PRODUCTS,
  CATALOG_COMPARISONS,
  catalogFilterHref,
  catalogFilterLabel,
  catalogFilterProductIds,
  productBySlug,
  productOrderHref,
} from "@bannersin48/shared";

export default function OrderHubPage() {
  return (
    <Suspense fallback={<HubSkeleton />}>
      <OrderHub />
    </Suspense>
  );
}

function HubSkeleton() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-xl py-xl">
        <div className="h-10 w-64 bg-line rounded animate-pulse-slow mb-md" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {Array.from({ length: 8 }, (_, i) => (
            <div key={i} className="aspect-video rounded-card bg-line animate-pulse-slow" />
          ))}
        </div>
      </div>
    </div>
  );
}

function OrderHub() {
  const searchParams = useSearchParams();
  const need = searchParams.get("need");
  const [infoSlug, setInfoSlug] = useState<string | null>(null);

  const allowedIds = catalogFilterProductIds(need);
  const filterLabel = catalogFilterLabel(need);

  const hubIds = useMemo(() => {
    if (!allowedIds) return [...CATALOG_NAV_PRODUCTS];
    return CATALOG_NAV_PRODUCTS.filter((id) => allowedIds.includes(id));
  }, [allowedIds]);

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-sm" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">
            Home
          </Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Order</span>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2">{HUB_TITLE}</h1>
        <p className="text-body text-ink-muted mt-sm mb-lg max-w-2xl">{HUB_SUBTITLE}</p>

        <div className="flex flex-wrap gap-sm mb-lg" role="group" aria-label="Filter by need">
          <Chip
            active={!need}
            href="/order"
            testId="hub-filter-all"
          >
            All
          </Chip>
          {CATALOG_NEEDS.map((chip) => (
            <Chip
              key={chip.id}
              active={need === chip.id}
              href={catalogFilterHref(chip.id)}
              testId={`hub-filter-${chip.id}`}
            >
              {chip.label}
            </Chip>
          ))}
        </div>

        {filterLabel && (
          <p className="text-body-sm text-ink-muted mb-lg" data-testid="hub-filter-label">
            Showing products for <span className="font-semibold text-ink">{filterLabel}</span>.{" "}
            <Link href="/order" scroll={false} className="text-link hover:underline">
              Clear filter
            </Link>
          </p>
        )}

        {hubIds.length > 0 && (
          <div
            data-testid="hub-product-grid"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md"
          >
            {hubIds.map((id) => (
              <CategoryCard key={id} productId={id} onMoreInfo={setInfoSlug} />
            ))}
          </div>
        )}

        {hubIds.length === 0 && (
          <p className="text-body text-ink-muted">No products match this filter.</p>
        )}

        <p className="mt-lg text-body-sm text-ink-muted font-body">
          Need a retractable stand?{" "}
          <Link
            href={productOrderHref("RETRACTABLE")}
            className="inline-flex items-center gap-xs font-semibold text-link no-underline hover:underline"
          >
            Order a retractable banner
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </p>

        {!need && <ComparisonStrip />}
      </div>

      {infoSlug && <MoreInfoModal slug={infoSlug} onClose={() => setInfoSlug(null)} />}
    </div>
  );
}

function Chip({
  active,
  href,
  children,
  testId,
}: {
  active: boolean;
  href: string;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <Link
      href={href}
      scroll={false}
      data-testid={testId}
      aria-current={active ? "true" : undefined}
      className={`inline-flex min-h-11 items-center rounded-pill border px-md py-xs text-sm font-semibold font-body no-underline transition-colors ${
        active
          ? "border-strong-accent bg-strong-accent text-strong-accent-text hover:text-strong-accent-text"
          : "border-line bg-surface text-ink hover:border-link hover:text-link"
      }`}
    >
      {children}
    </Link>
  );
}

function ComparisonStrip() {
  return (
    <section className="mt-3xl" aria-labelledby="hub-compare-h" data-testid="hub-comparison">
      <h2 id="hub-compare-h" className="font-display text-heading-h4 text-ink mb-md">
        Not sure which product?
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-md">
        {CATALOG_COMPARISONS.map((row) => (
          <article key={row.title} className="rounded-card border border-line bg-surface p-lg">
            <h3 className="font-bold text-ink mb-sm">{row.title}</h3>
            <ul className="space-y-xs text-body-sm text-ink-muted">
              {row.items.map((item) => (
                <li key={item.productId}>
                  <Link href={productOrderHref(item.productId)} className="text-link hover:underline">
                    {PRODUCTS[item.productId].title}
                  </Link>
                  {" — "}
                  {item.note}
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </section>
  );
}

function MoreInfoModal({ slug, onClose }: { slug: string; onClose: () => void }) {
  const product = productBySlug(slug);

  return (
    <Dialog open={Boolean(slug)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="hub-info-modal"
        title={product?.title ?? "More information"}
        className="p-md sm:p-lg"
      >
        {product && (
          <>
            <p className="mt-sm text-body text-ink-muted">{product.subtitle}</p>
            <div className="mt-md space-y-md">
              <Section heading="Common uses" items={product.hubCopy.commonUses} />
              <Section heading="Environment" items={product.hubCopy.environment} />
              <Section heading="Options" items={product.hubCopy.options} />
            </div>
            <Link
              href={productOrderHref(product.id)}
              className="mt-lg inline-flex h-11 items-center justify-center rounded-btn bg-strong-accent px-md text-body font-bold text-strong-accent-text no-underline hover:bg-strong-accent-hover hover:text-strong-accent-text"
            >
              Order
            </Link>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Section({ heading, items }: { heading: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div>
      <h3 className="text-xs font-bold uppercase tracking-wide text-ink-muted">{heading}</h3>
      <ul className="mt-xs list-disc pl-md text-body-sm text-ink">
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}
