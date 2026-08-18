"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, X } from "lucide-react";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HUB_TITLE,
  HUB_SUBTITLE,
  PRODUCTS,
  CATALOG_NEEDS,
  CATALOG_COMPARISONS,
  catalogFilterHref,
  catalogFilterLabel,
  catalogFilterProductIds,
  isStandProduct,
  productOrderHref,
  type ProductId,
} from "@bannersin48/shared";
import type { BannerCatalogCard } from "@bannersin48/api-client";

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
      <div className="mx-auto max-w-content px-md py-xl">
        <div className="h-10 w-64 bg-line rounded animate-pulse-slow mb-md" />
        <div className="h-64 bg-line rounded animate-pulse-slow" />
      </div>
    </div>
  );
}

function retractableCard(): BannerCatalogCard {
  const p = PRODUCTS.RETRACTABLE;
  return {
    id: p.id,
    slug: p.slug,
    title: p.title,
    subtitle: p.subtitle,
    hasMoreInfo: p.hasMoreInfo,
    route: productOrderHref("RETRACTABLE"),
  };
}

function OrderHub() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const need = searchParams.get("need");
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["banner-catalog"],
    queryFn: () => getApiClient().getBannerCatalog(),
    retry: 8,
    retryDelay: 250,
  });
  const [infoSlug, setInfoSlug] = useState<string | null>(null);

  const allowedIds = catalogFilterProductIds(need);
  const filterLabel = catalogFilterLabel(need);

  const allCards = useMemo(() => {
    const withRetractable = cards.some((c) => c.slug === "retractable")
      ? cards
      : [...cards, retractableCard()];
    if (!allowedIds) return withRetractable;
    return withRetractable.filter((c) => allowedIds.includes(c.id as ProductId));
  }, [cards, allowedIds]);

  const bannerCards = allCards.filter((c) => !isStandProduct(c.id as ProductId));
  const standCards = allCards.filter((c) => isStandProduct(c.id as ProductId));

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
            onClick={() => router.push("/order")}
            testId="hub-filter-all"
          >
            All
          </Chip>
          {CATALOG_NEEDS.map((chip) => (
            <Chip
              key={chip.id}
              active={need === chip.id}
              onClick={() => router.push(catalogFilterHref(chip.id))}
              testId={`hub-filter-${chip.id}`}
            >
              {chip.label}
            </Chip>
          ))}
        </div>

        {filterLabel && (
          <p className="text-body-sm text-ink-muted mb-lg" data-testid="hub-filter-label">
            Showing products for <span className="font-semibold text-ink">{filterLabel}</span>.{" "}
            <button type="button" className="text-link hover:underline" onClick={() => router.push("/order")}>
              Clear filter
            </button>
          </p>
        )}

        {isLoading && <p className="text-body text-ink-muted">Loading catalog…</p>}

        {bannerCards.length > 0 && (
          <CardGrid cards={bannerCards} onMoreInfo={setInfoSlug} />
        )}

        {standCards.length > 0 && (
          <div className="mt-2xl">
            <h2 className="font-display text-heading-h4 text-ink mb-md">Banner stands</h2>
            <CardGrid cards={standCards} onMoreInfo={setInfoSlug} />
          </div>
        )}

        {!isLoading && allCards.length === 0 && (
          <p className="text-body text-ink-muted">No products match this filter.</p>
        )}

        {!need && <ComparisonStrip />}
      </div>

      {infoSlug && <MoreInfoModal slug={infoSlug} onClose={() => setInfoSlug(null)} />}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
  testId,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`rounded-pill border px-md py-xs text-sm font-semibold font-body transition-colors ${
        active
          ? "border-strong-accent bg-strong-accent text-strong-accent-text"
          : "border-line bg-surface text-ink hover:border-link hover:text-link"
      }`}
    >
      {children}
    </button>
  );
}

function CardGrid({
  cards,
  onMoreInfo,
}: {
  cards: BannerCatalogCard[];
  onMoreInfo: (slug: string) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
      {cards.map((card) => (
        <Card key={card.slug} data-testid={`hub-card-${card.slug}`} className="bg-surface flex flex-col">
          <h2 className="font-display text-heading-h4 text-ink">{card.title}</h2>
          <p className="text-body-sm text-ink-muted mt-xs flex-1">{card.subtitle}</p>
          <div className="flex flex-wrap gap-sm mt-lg">
            {card.hasMoreInfo && (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid={`hub-more-info-${card.slug}`}
                onClick={() => onMoreInfo(card.slug)}
              >
                More info
              </Button>
            )}
            <Link href={card.route} data-testid={`hub-order-${card.slug}`}>
              <Button variant="cta" size="sm">
                Order
              </Button>
            </Link>
          </div>
        </Card>
      ))}
    </div>
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
                  <Link href={productOrderHref(item.productId)} className="text-link no-underline hover:underline">
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
  const { data, isFetching } = useQuery({
    queryKey: ["banner-catalog-info", slug],
    queryFn: () => getApiClient().getBannerCatalogInfo(slug),
  });

  return (
    <div
      data-testid="hub-info-modal"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="hub-info-title"
    >
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-feature border border-line bg-surface shadow-lg">
        <div className="flex items-center justify-between border-b border-line px-md py-sm">
          <h2 id="hub-info-title" className="font-display text-heading-h4 text-ink">
            {data?.title ?? "More information"}
          </h2>
          <button type="button" aria-label="Close" onClick={onClose} className="p-1 text-ink-muted hover:text-ink">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="p-md space-y-md">
          {isFetching && <p className="text-sm text-ink-muted">Loading…</p>}
          {data && (
            <>
              <p className="text-body text-ink-muted">{data.subtitle}</p>
              <Section heading="Common uses" items={data.commonUses} />
              <Section heading="Environment" items={data.environment} />
              <Section heading="Options" items={data.options} />
              <Link href={`/order/${data.slug}`} onClick={onClose}>
                <Button variant="cta" size="md">
                  Order
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
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
