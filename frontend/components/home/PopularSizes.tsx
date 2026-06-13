"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { formatUsd } from "@/lib/utils/format";
import { ArrowRight, Star } from "lucide-react";

export function PopularSizes() {
  const { data, isLoading } = useQuery({
    queryKey: ["popular-sizes"],
    queryFn: () => getApiClient().getPopularSizes(),
    staleTime: 5 * 60_000,
  });

  // Show first 5 quick-picks on the homepage
  const sizes = (data ?? []).slice(0, 5);

  return (
    <section className="bg-surface-tint" aria-labelledby="popular-sizes-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2 id="popular-sizes-h" className="font-display text-section-h2 text-ink leading-section-h2">
            Popular banner sizes
          </h2>
          <p className="text-body text-ink-muted mt-md">
            Quick-pick 13 oz vinyl. All prices include $10 flat shipping.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-md">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Card key={i} className="animate-pulse-slow h-40" />
              ))
            : sizes.map((s, idx) => (
                <Link
                  key={s.id}
                  href={`/order/vinyl?w=${s.widthFt}&h=${s.heightFt}`}
                  className="block no-underline"
                >
                  <Card
                    className={`h-full transition-all ${
                      idx === 0
                        ? "bg-info-tint border border-link"
                        : "hover:bg-info-tint hover:border-link hover:border"
                    }`}
                  >
                    <p className="text-heading-h4 font-bold text-ink">{s.label}</p>
                    <p className="text-body-sm text-ink-muted mt-xs">{s.sqFt} sq ft</p>
                    <p className="text-heading-h4 font-bold text-ink mt-md">
                      {formatUsd(s.total)}
                    </p>
                    <p className="text-body-sm text-ink-muted mt-xs">incl. $10 shipping</p>
                    {idx === 0 && (
                      <p className="text-body-sm text-link font-bold mt-md flex items-center gap-xs">
                        <Star className="h-3 w-3 fill-current" aria-hidden /> Most popular
                      </p>
                    )}
                  </Card>
                </Link>
              ))}
        </div>
        <div className="text-center mt-2xl">
          <Link
            href="/sizes"
            className="inline-flex items-center gap-xs bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
          >
            See all sizes &amp; prices
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </div>
    </section>
  );
}
