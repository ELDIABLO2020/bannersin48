import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { VisualCategoryCard } from "@/components/catalog/VisualCategoryCard";
import { imageForUseCase } from "@/content/catalogImages";
import { ChevronRight } from "lucide-react";
import type { CatalogUseCaseId } from "@bannersin48/shared";

export const metadata = {
  title: "Banner templates — Banners In 48",
  robots: { index: false, follow: true },
};

const CATEGORIES: ReadonlyArray<{ label: string; useCase: CatalogUseCaseId }> = [
  { label: "Business", useCase: "business" },
  { label: "Restaurant", useCase: "restaurant" },
  { label: "Contractor", useCase: "contractor" },
  { label: "School & Sports", useCase: "school" },
  { label: "Events", useCase: "events" },
  { label: "Real Estate", useCase: "real-estate" },
];

export default function TemplatesPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl text-center">
        <Badge variant="warning" className="mb-md">Coming soon</Badge>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2">
          Template library
        </h1>
        <p className="text-body text-ink-muted mt-md mx-auto max-w-2xl">
          We&rsquo;re launching with ~100 templates across six categories.
          Admin can add templates without code changes. Logo, photo, and text replacement
          arrives with Phase 2.
        </p>

        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-md mt-2xl text-left">
          {CATEGORIES.map((c) => (
            <li key={c.useCase}>
              <VisualCategoryCard
                title={c.label}
                image={imageForUseCase(c.useCase)}
                overlayAction={
                  <span className="rounded-btn border border-white/70 bg-darkest/55 px-md py-xs text-sm font-semibold text-white font-body backdrop-blur-sm">
                    Soon
                  </span>
                }
              />
            </li>
          ))}
        </ul>

        <Link
          href="/order"
          className="inline-block mt-2xl bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
        >
          Upload your own artwork <ChevronRight className="inline h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
