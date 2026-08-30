"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ChevronRight } from "lucide-react";
import { getApiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CategoryCard } from "@/components/order/CategoryCard";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { formatUsd } from "@/lib/utils/format";
import {
  HUB_TITLE,
  HUB_SUBTITLE,
  PRODUCTS,
  CATALOG_NEEDS,
  CATALOG_COMPARISONS,
  SHIPPING_FLAT_PER_UNIT_USD,
  catalogFilterHref,
  catalogFilterLabel,
  catalogFilterProductIds,
  productOrderHref,
  type ProductId,
} from "@bannersin48/shared";

export default function OrderHubPage() {
  return (
    <Suspense fallback={<HubSkeleton />}>
      <OrderHub />
    </Suspense>
  );
}

function HubCardSkeletonGrid() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
      {Array.from({ length: 7 }, (_, i) => (
        <div key={i} className="aspect-video rounded-card bg-line animate-pulse-slow" />
      ))}
    </div>
  );
}

function HubSkeleton() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-xl py-xl">
        <div className="h-10 w-64 bg-line rounded animate-pulse-slow mb-md" />
        <HubCardSkeletonGrid />
      </div>
    </div>
  );
}

interface DecisionFacts {
  fromPrice: number;
  bestUse: string;
  environment: string;
  maxSize: string;
}

/**
 * Authoritative, server-derivable decision facts for a product card. Values
 * come from the shared product catalog (the same source the quote/catalog API
 * serves), not from a client-only guess.
 */
function productDecisionFacts(id: ProductId): DecisionFacts {
  const p = PRODUCTS[id];
  const shipping = SHIPPING_FLAT_PER_UNIT_USD;

  let fromPrice: number;
  if (p.sizeMode === "fixed") {
    fromPrice = (p.flatPriceUsd ?? 0) + shipping;
  } else {
    const minRate = Math.min(...p.materials.map((m) => p.ratePerSqFt(m)));
    // Minimum orderable size is 12" × 12" = 1 billable square foot.
    fromPrice = minRate * 1 + shipping;
  }

  const maxSize =
    p.sizeMode === "fixed"
      ? `Fixed ${p.fixedSizeIn?.widthIn ?? 33.5}" × ${p.fixedSizeIn?.heightIn ?? 80}"`
      : p.limits.maxShortSideIn
        ? `Shorter side ≤ ${p.limits.maxShortSideIn}"`
        : `Up to ${p.limits.maxBillableFt}' × ${p.limits.maxBillableFt}'`;

  return {
    fromPrice,
    bestUse: p.hubCopy.commonUses[0] ?? p.subtitle,
    environment: p.hubCopy.environment[0] ?? "Indoor and outdoor",
    maxSize,
  };
}

function FactsList({ facts }: { facts: DecisionFacts }) {
  const items: ReadonlyArray<{ label: string; value: string }> = [
    { label: "From", value: `${formatUsd(facts.fromPrice)} USD` },
    { label: "Best for", value: facts.bestUse },
    { label: "Use", value: facts.environment },
    { label: "Max size", value: facts.maxSize },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-md gap-y-sm">
      {items.map((item) => (
        <div key={item.label}>
          <dt className="text-xs font-bold uppercase tracking-wide text-ink-muted">
            {item.label}
          </dt>
          <dd className="mt-xs text-body-sm text-ink">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
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

  const hubCards = useMemo(() => {
    if (!allowedIds) return cards;
    return cards.filter((c) => allowedIds.includes(c.id as ProductId));
  }, [cards, allowedIds]);

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

        {isLoading && <HubCardSkeletonGrid />}

        {hubCards.length > 0 && (
          <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md">
            {hubCards.map((card) => {
              const facts = productDecisionFacts(card.id as ProductId);
              return (
                <div key={card.slug} className="flex flex-col gap-sm">
                  <CategoryCard card={card} onMoreInfo={setInfoSlug} />
                  <div className="rounded-card border border-line bg-surface p-md">
                    <FactsList facts={facts} />
                  </div>
                </div>
              );
            })}
          </ScrollReveal>
        )}

        {!isLoading && hubCards.length === 0 && (
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
      aria-pressed={active}
      onClick={onClick}
      className={`inline-flex min-h-11 items-center rounded-pill border px-md py-xs text-sm font-semibold font-body transition-colors ${
        active
          ? "border-strong-accent bg-strong-accent text-strong-accent-text"
          : "border-line bg-surface text-ink hover:border-link hover:text-link"
      }`}
    >
      {children}
    </button>
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
  const { data, isFetching } = useQuery({
    queryKey: ["banner-catalog-info", slug],
    queryFn: () => getApiClient().getBannerCatalogInfo(slug),
  });

  return (
    <Dialog open={Boolean(slug)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        data-testid="hub-info-modal"
        title={data?.title ?? "More information"}
        className="p-md sm:p-lg"
      >
        {isFetching && <p className="text-sm text-ink-muted">Loading…</p>}
        {data && (
          <>
            <p className="mt-sm text-body text-ink-muted">{data.subtitle}</p>
            <div className="mt-md space-y-md">
              <Section heading="Common uses" items={data.commonUses} />
              <Section heading="Environment" items={data.environment} />
              <Section heading="Options" items={data.options} />
            </div>
            <Link href={`/order/${data.slug}`} onClick={onClose} className="no-underline">
              <Button variant="cta" size="md" className="mt-lg">
                Order
              </Button>
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
