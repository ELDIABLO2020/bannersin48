"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, X } from "lucide-react";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { HUB_TITLE, HUB_SUBTITLE } from "@bannersin48/shared";

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

function OrderHub() {
  const { data: cards = [], isLoading } = useQuery({
    queryKey: ["banner-catalog"],
    queryFn: () => getApiClient().getBannerCatalog(),
    retry: 8,
    retryDelay: 250,
  });
  const [infoSlug, setInfoSlug] = useState<string | null>(null);

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
        <p className="text-body text-ink-muted mt-sm mb-xl max-w-2xl">{HUB_SUBTITLE}</p>

        {isLoading && <p className="text-body text-ink-muted">Loading catalog…</p>}

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
                    onClick={() => setInfoSlug(card.slug)}
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
      </div>

      {infoSlug && <MoreInfoModal slug={infoSlug} onClose={() => setInfoSlug(null)} />}
    </div>
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
