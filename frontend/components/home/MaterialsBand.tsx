"use client";

import { useRef } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatUsdFromMajor } from "@/lib/utils/format";
import { useGSAP } from "@gsap/react";
import { slideInLeft } from "@/lib/gsap/registry";

const MATERIALS = [
  {
    name: "13 oz Vinyl",
    pricePerSqFt: 4.0,
    description: "Standard indoor and outdoor. The workhorse.",
    singleSided: true,
  },
  {
    name: "15 oz Premium Vinyl",
    pricePerSqFt: 4.75,
    description: "Heavier, more durable, premium outdoor feel.",
    singleSided: true,
  },
  {
    name: "18 oz Heavy-Duty Blockout",
    pricePerSqFt: 5.25,
    description: "Heavy-duty, opaque. The only material available double-sided.",
    singleSided: true,
    doubleSidedAvailable: true,
  },
];

export function MaterialsBand() {
  const sectionRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!sectionRef.current) return;
      slideInLeft({
        target: sectionRef.current.querySelectorAll(".mat-card"),
        stagger: 0.15,
      });
    },
    { scope: sectionRef },
  );

  return (
    <section ref={sectionRef} className="bg-surface" aria-labelledby="materials-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <h2 id="materials-h" className="font-display text-section-h2 text-ink text-center leading-section-h2">
          Premium vinyl, three weights
        </h2>
        <p className="text-body text-ink-muted text-center mt-md max-w-2xl mx-auto">
          Every banner is printed on heavy-duty vinyl, finished with welded seams and grommets by default.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg mt-2xl">
          {MATERIALS.map((m) => (
            <Card key={m.name} variant="feature" className="mat-card h-full flex flex-col">
              <h3 className="font-bold text-heading-h4 text-ink">{m.name}</h3>
              <p className="text-heading-h4 font-bold text-cta mt-md">
                {formatUsdFromMajor(m.pricePerSqFt)}
                <span className="text-body-sm font-normal text-ink-muted"> / sq ft</span>
              </p>
              <p className="text-body-sm text-ink-muted mt-md flex-1">{m.description}</p>
              {m.doubleSidedAvailable && (
                <div className="mt-md">
                  <Badge variant="success">Double-sided available</Badge>
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
