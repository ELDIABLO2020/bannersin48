"use client";

import { Suspense, useEffect } from "react";
import { useParams, useSearchParams, notFound } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { productBySlug, resolveSizeParams } from "@bannersin48/shared";
import { useConfigurator } from "@/lib/stores/configurator";
import { BuilderShell } from "@/components/builder/BuilderShell";
import { ItemRail } from "@/components/builder/ItemRail";
import { BuilderStage } from "@/components/builder/BuilderStage";
import { PriceHero } from "@/components/builder/PriceHero";
import { ControlDock } from "@/components/builder/ControlDock";
import { ImagePickerOverlay } from "@/components/builder/ImagePickerOverlay";
import { ColorMatchModal } from "@/components/builder/ColorMatchModal";

export default function ProductBuilderPage() {
  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <ProductBuilder />
    </Suspense>
  );
}

function BuilderSkeleton() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md py-xl">
        <div className="h-10 w-64 bg-line rounded animate-pulse-slow mb-md" />
        <div className="h-64 bg-line rounded animate-pulse-slow" />
      </div>
    </div>
  );
}

function ProductBuilder() {
  const params = useParams<{ slug: string }>();
  const search = useSearchParams();
  const config = productBySlug(params.slug);
  const setProduct = useConfigurator((s) => s.setProduct);
  const applySize = useConfigurator((s) => s.applySize);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);

  if (!config || config.id === "RETRACTABLE") {
    notFound();
  }

  useEffect(() => {
    setProduct(config.id);
    if (config.sizeMode === "custom") {
      // Canonical `width`/`height` params; legacy `w`/`h` are migrated (axes swapped).
      const resolved = resolveSizeParams({
        width: search.get("width"),
        height: search.get("height"),
        w: search.get("w"),
        h: search.get("h"),
      });
      if (resolved) applySize(resolved.widthFt, resolved.heightFt);
    }
    if (search.get("picker") === "1") {
      setPickerOpen(true);
    }
  }, [config.id, config.sizeMode, setProduct, applySize, setPickerOpen, search]);

  return (
    <>
      <div className="bg-surface-tint border-b border-line">
        <div className="mx-auto max-w-content px-md lg:px-xl pt-md pb-sm">
          <nav className="text-body-sm text-ink-muted mb-sm" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-link no-underline">
              Home
            </Link>
            <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
            <Link href="/order" className="hover:text-link no-underline">
              Order
            </Link>
            <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
            <span aria-current="page">{config.title}</span>
          </nav>
        </div>
      </div>

      <BuilderShell
        rail={<ItemRail />}
        stage={<BuilderStage />}
        price={<PriceHero />}
        dock={<ControlDock />}
      />

      <ImagePickerOverlay />
      <ColorMatchModal />
    </>
  );
}
