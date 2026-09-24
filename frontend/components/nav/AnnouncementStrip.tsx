"use client";

import Image from "next/image";
import Link from "next/link";
import { Truck } from "lucide-react";
import { useCutoffCountdown } from "@/lib/hooks/useCutoffCountdown";
import { isInternalManualCommerce } from "@/lib/config/commerce-mode";
import { SiteContentStrip } from "@/components/nav/SiteContentStrip";

export function AnnouncementStrip() {
  const { padded } = useCutoffCountdown();

  return (
    <div className="bg-darkest text-white text-sm" role="region" aria-label="Announcement">
      {isInternalManualCommerce && (
        <div
          role="status"
          className="bg-warning-bg px-md py-xs text-center text-xs font-bold text-ink"
        >
          <span className="hidden sm:inline">
            Internal platform test · Orders use manual payment · No online payment is collected
          </span>
          <span className="sm:hidden">Internal test · Manual payment only</span>
        </div>
      )}
      {/* Below lg: one white row with the logo and the delivery note. */}
      <div className="lg:hidden bg-surface text-ink border-b border-line">
        <div className="mx-auto max-w-content px-md h-14 flex items-center justify-between gap-sm">
          <Link
            href="/"
            className="inline-flex shrink-0 items-center no-underline"
            aria-label="Banners In 48 home"
          >
            <Image
              src="/images/logo.png"
              alt="Banners In 48"
              width={502}
              height={116}
              priority
              className="h-7 min-[360px]:h-8 w-auto"
            />
          </Link>
          <p className="flex items-center gap-xs text-xs leading-tight text-ink-muted max-w-[12rem] sm:max-w-none">
            <Truck className="hidden min-[360px]:block h-4 w-4 shrink-0 text-strong-accent" aria-hidden />
            <span>
              <span className="sm:hidden">Timing starts once payment is confirmed. USA only.</span>
              <span className="hidden sm:inline">
                Delivery timing begins after order submission and manual payment confirmation. USA only.
              </span>
            </span>
          </p>
        </div>
      </div>
      <div className="hidden lg:flex mx-auto max-w-content px-2xl h-[50px] items-center justify-center gap-md">
        <Truck className="h-4 w-4 text-strong-accent" aria-hidden />
        <p className="text-center font-medium">
          Delivery timing begins after order submission and manual payment confirmation. USA only.
        </p>
        <span
          aria-live="polite"
          className="inline-flex items-center gap-1 px-sm py-xs rounded-pill bg-strong-accent text-strong-accent-text tabular-nums text-xs font-bold"
        >
          {padded ?? "-- : -- : --"}
        </span>
      </div>
      <SiteContentStrip />
    </div>
  );
}
