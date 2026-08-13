"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useConfigurator } from "@/lib/stores/configurator";
import { BuilderShell } from "@/components/builder/BuilderShell";
import { ItemRail } from "@/components/builder/ItemRail";
import { BuilderStage } from "@/components/builder/BuilderStage";
import { PriceHero } from "@/components/builder/PriceHero";
import { ControlDock } from "@/components/builder/ControlDock";
import { ImagePickerOverlay } from "@/components/builder/ImagePickerOverlay";
import { ColorMatchModal } from "@/components/builder/ColorMatchModal";

export default function VinylBuilderPage() {
  return (
    <Suspense fallback={<BuilderSkeleton />}>
      <VinylBuilder />
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

function VinylBuilder() {
  const search = useSearchParams();
  const setProduct = useConfigurator((s) => s.setProduct);
  const applySize = useConfigurator((s) => s.applySize);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);

  useEffect(() => {
    setProduct("vinyl");
    const w = search.get("w");
    const h = search.get("h");
    if (w && h) {
      const wf = parseInt(w, 10);
      const hf = parseInt(h, 10);
      if (!Number.isNaN(wf) && !Number.isNaN(hf)) applySize(wf, hf);
    }
    if (search.get("picker") === "1") {
      setPickerOpen(true);
    }
  }, [setProduct, applySize, setPickerOpen, search]);

  return (
    <>
      <div className="bg-surface-tint border-b border-line">
        <div className="mx-auto max-w-content px-md lg:px-xl pt-md pb-sm">
          <nav className="text-body-sm text-ink-muted mb-sm" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-link no-underline">
              Home
            </Link>
            <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
            <span aria-current="page">Vinyl builder</span>
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
