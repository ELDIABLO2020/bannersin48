"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useConfigurator } from "@/lib/stores/configurator";
import { SizeStep } from "@/components/configurator/SizeStep";
import { MaterialStep } from "@/components/configurator/MaterialStep";
import { FinishingStep } from "@/components/configurator/FinishingStep";
import { QuantityStep } from "@/components/configurator/QuantityStep";
import { PriceSummary } from "@/components/configurator/PriceSummary";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function VinylConfiguratorPage() {
  return (
    <Suspense fallback={<ConfiguratorSkeleton />}>
      <VinylConfigurator />
    </Suspense>
  );
}

function ConfiguratorSkeleton() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <div className="h-12 w-64 bg-line rounded animate-pulse-slow mb-md" />
        <div className="h-6 w-96 bg-line rounded animate-pulse-slow mb-2xl" />
      </div>
    </div>
  );
}

function VinylConfigurator() {
  const search = useSearchParams();
  const setProduct = useConfigurator((s) => s.setProduct);
  const applySize = useConfigurator((s) => s.applySize);

  useEffect(() => {
    setProduct("vinyl");
    const w = search.get("w");
    const h = search.get("h");
    if (w && h) {
      const wf = parseInt(w);
      const hf = parseInt(h);
      if (!Number.isNaN(wf) && !Number.isNaN(hf)) applySize(wf, hf);
    }
  }, [setProduct, applySize, search]);

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">Home</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <Link href="/order/vinyl" className="hover:text-link no-underline">Vinyl banners</Link>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          Order a vinyl banner
        </h1>
        <p className="text-body text-ink-muted mb-2xl max-w-2xl">
          Build your banner in under 3 minutes. Live price and delivery date update as you go.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <div className="lg:col-span-7 space-y-2xl">
            <SizeStep />
            <MaterialStep />
            <FinishingStep />
            <QuantityStep />
            <div>
              <Link
                href="/order/artwork"
                className="inline-block bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
              >
                Continue to artwork upload &rarr;
              </Link>
              <p className="text-body-sm text-ink-muted mt-xs">
                Or jump straight to the cart and upload on the next step.
              </p>
            </div>
          </div>
          <div className="lg:col-span-5">
            <PriceSummary />
          </div>
        </div>
      </div>
    </div>
  );
}
