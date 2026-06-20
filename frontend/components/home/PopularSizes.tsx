"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { formatUsd } from "@/lib/utils/format";
import { ArrowRight, BadgeCheck, Truck } from "lucide-react";

const FALLBACK_SIZES = [
  {
    id: "fallback-2x4",
    label: "2' x 4'",
    widthFt: 2,
    heightFt: 4,
    sqFt: 8,
    total: 42,
    note: "Small events and announcements",
  },
  {
    id: "fallback-3x6",
    label: "3' x 6'",
    widthFt: 3,
    heightFt: 6,
    sqFt: 18,
    total: 82,
    note: "Storefronts and booth displays",
  },
  {
    id: "fallback-4x8",
    label: "4' x 8'",
    widthFt: 4,
    heightFt: 8,
    sqFt: 32,
    total: 138,
    note: "High-visibility promotions",
  },
  {
    id: "fallback-2x8",
    label: "2' x 8'",
    widthFt: 2,
    heightFt: 8,
    sqFt: 16,
    total: 74,
    note: "Long and narrow storefront spaces",
  },
  {
    id: "fallback-custom",
    label: "Custom",
    widthFt: 0,
    heightFt: 0,
    sqFt: 0,
    total: 0,
    note: "Any size up to 10' x 10'",
  },
] as const;

type SizeCard = {
  id: string;
  label: string;
  widthFt: number;
  heightFt: number;
  sqFt: number;
  total: number;
  note?: string;
};

export function PopularSizes() {
  const { data, isLoading } = useQuery({
    queryKey: ["popular-sizes"],
    queryFn: () => getApiClient().getPopularSizes(),
    staleTime: 5 * 60_000,
  });

  const apiSizes = (data ?? []).slice(0, 5).map((s) => ({
    ...s,
    note: s.sqFt >= 30 ? "High-visibility promotions" : "Fast-turn banner projects",
  }));
  const sizes: readonly SizeCard[] = apiSizes.length > 0 ? apiSizes : FALLBACK_SIZES;
  const getLabel = (size: SizeCard) =>
    size.widthFt > 0 && size.heightFt > 0 ? `${size.widthFt}' x ${size.heightFt}'` : size.label;

  return (
    <section className="bg-surface" aria-labelledby="popular-sizes-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="mb-2xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="popular-sizes-h"
              className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink uppercase"
            >
              Popular sizes &amp; pricing
            </h2>
            <p className="text-body text-ink-muted mt-md max-w-2xl">
              High quality, fast turnaround, and clear pricing before checkout.
            </p>
          </div>
          <Link
            href="/sizes"
            className="inline-flex items-center gap-xs text-sm font-semibold text-strong-accent no-underline hover:underline"
          >
            View all sizes
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-md">
          {sizes.map((s, idx) => {
            const isCustom = s.label.toLowerCase() === "custom";
            return (
              <Link
                key={s.id}
                href={isCustom ? "/order/vinyl" : `/order/vinyl?w=${s.widthFt}&h=${s.heightFt}`}
                className="ps-card group block no-underline"
              >
                <article
                  className={`relative flex min-h-[240px] flex-col rounded-card border bg-surface p-lg shadow-elev-1 transition-all hover:-translate-y-1 hover:shadow-elev-2 ${
                    idx === 0 ? "border-strong-accent ring-1 ring-strong-accent" : "border-line hover:border-strong-accent"
                  }`}
                >
                  {idx === 0 && (
                    <span className="absolute -top-sm left-lg rounded-sm bg-strong-accent px-sm py-xs text-[11px] font-bold uppercase text-strong-accent-text">
                      Quick pick
                    </span>
                  )}
                  <h3 className="font-display font-extrabold tracking-tight text-[28px] leading-none text-ink">
                    {getLabel(s)}
                  </h3>
                  <p className="mt-md min-h-[44px] text-sm text-ink-muted">{s.note}</p>
                  <div className="mt-auto pt-lg">
                    {isCustom ? (
                      <p className="text-heading-h4 font-bold text-ink">Built to fit</p>
                    ) : (
                      <>
                        <p className="text-sm text-ink-muted">{s.sqFt} sq ft</p>
                        <p className="mt-xs text-heading-h4 font-bold text-ink">
                          {formatUsd(s.total)}
                        </p>
                      </>
                    )}
                    <span className="mt-md inline-flex w-full items-center justify-center gap-xs rounded-btn bg-strong-accent px-md py-sm text-sm font-bold text-strong-accent-text transition-colors group-hover:bg-strong-accent-hover">
                      {isCustom ? "Get a quote" : "Order now"}
                      <ArrowRight className="h-4 w-4" aria-hidden />
                    </span>
                  </div>
                </article>
              </Link>
            );
          })}
        </div>

        <div className="mt-xl flex flex-col gap-sm text-sm text-ink-muted sm:flex-row sm:items-center sm:justify-center">
          <span className="inline-flex items-center justify-center gap-xs">
            <Truck className="h-4 w-4 text-strong-accent" aria-hidden />
            Delivery promise shown before checkout
          </span>
          <span className="hidden sm:inline text-ink-muted">|</span>
          <span className="inline-flex items-center justify-center gap-xs">
            <BadgeCheck className="h-4 w-4 text-strong-accent" aria-hidden />
            Proof approval starts production
          </span>
        </div>
      </div>
    </section>
  );
}
