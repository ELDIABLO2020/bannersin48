"use client";

import { useConfigurator } from "@/lib/stores/configurator";
import { MATERIALS, type Material } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";
import { formatUsdFromMajor } from "@/lib/utils/format";

export function MaterialStep() {
  const material = useConfigurator((s) => s.material);
  const setMaterial = useConfigurator((s) => s.setMaterial);

  return (
    <section aria-labelledby="material-h">
      <h2 id="material-h" className="font-bold text-heading-h4 text-ink mb-md">
        2. Choose your material
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
        {MATERIALS.filter((m) => m.id !== "RETRACTABLE").map((m) => {
          const active = material === m.id;
          return (
            <button
              key={m.id}
              type="button"
              onClick={() => setMaterial(m.id as Material)}
              className="text-left"
              aria-pressed={active}
            >
              <Card
                className={cn(
                  "h-full transition-all",
                  active
                    ? "bg-info-tint border border-link"
                    : "hover:border-link hover:border",
                )}
              >
                <div className="flex items-start justify-between gap-sm">
                  <div>
                    <h3 className="font-bold text-body text-ink">{m.shortName}</h3>
                    <p className="text-body-sm text-ink-muted mt-xs">{m.description}</p>
                  </div>
                  {m.id === "VINYL_18OZ_DOUBLE" && (
                    <Badge variant="info">Double-sided</Badge>
                  )}
                </div>
                <p className="text-heading-h4 font-bold text-cta mt-md">
                  {formatUsdFromMajor(m.ratePerSqFt)}
                  <span className="text-body-sm font-normal text-ink-muted"> / sq ft</span>
                </p>
              </Card>
            </button>
          );
        })}
      </div>
    </section>
  );
}
