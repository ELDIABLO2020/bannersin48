import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CATALOG_NEEDS, catalogFilterHref } from "@bannersin48/shared";

/**
 * Compact "help me choose" selector. Server-rendered (no client JS) and
 * intentionally small — the heavy catalog comparison lives on /order and /sizes.
 */
export function HelpMeChoose() {
  return (
    <section className="bg-lightest text-ink" aria-labelledby="choose-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-2xl">
        <div className="mb-lg flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">
              Help me choose
            </p>
            <h2
              id="choose-h"
              className="font-display tracking-tight text-[clamp(28px,4vw,44px)] leading-[1.05] text-ink uppercase"
            >
              What&rsquo;s the job?
            </h2>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            See all products
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <ul className="flex flex-wrap gap-sm" aria-label="Choose by need">
          {CATALOG_NEEDS.map((need) => (
            <li key={need.id}>
              <Link
                href={catalogFilterHref(need.id)}
                className="inline-flex min-h-11 items-center rounded-pill border border-line bg-surface px-md py-sm text-sm font-semibold text-ink no-underline transition-colors hover:border-link hover:text-link"
              >
                {need.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
