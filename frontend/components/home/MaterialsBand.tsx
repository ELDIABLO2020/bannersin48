import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders, type PlaceholderKey } from "@/content/placeholders";

const MATERIALS: ReadonlyArray<{
  name: string;
  label?: string;
  description: string;
  imageKey: PlaceholderKey;
  points: readonly string[];
}> = [
  {
    name: "13 oz Vinyl",
    label: "Most ordered",
    description: "Standard indoor and outdoor vinyl for events, retail, contractors, and general signage.",
    imageKey: "material13oz",
    points: ["Water resistant", "Strong color", "Great everyday durability"],
  },
  {
    name: "15 oz Premium Vinyl",
    description: "A heavier option when the banner needs a more substantial outdoor feel.",
    imageKey: "material15oz",
    points: ["Thicker hand feel", "Premium finish", "Outdoor-ready"],
  },
  {
    name: "18 oz Blockout",
    description: "Heavy-duty opaque vinyl and the material option for double-sided work.",
    imageKey: "material18oz",
    points: ["Opaque construction", "Double-sided available", "Maximum durability"],
  },
];

export function MaterialsBand() {
  return (
    <section
      className="bg-[linear-gradient(180deg,var(--color-bg-lightest)_0%,var(--color-bg-soft-accent)_100%)]"
      aria-labelledby="materials-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="mb-2xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="materials-h"
              className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
            >
              Choose the right material
            </h2>
            <p className="text-body text-ink-muted mt-md max-w-2xl font-body">
              Durable vinyl options for different environments, visibility needs, and handling.
            </p>
          </div>
          <Link
            href="/order/vinyl"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            Compare materials
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {MATERIALS.map((material) => {
            const image = placeholders[material.imageKey];
            return (
              <article
                key={material.name}
                className="overflow-hidden rounded-card border border-line bg-surface shadow-elev-1"
              >
                <div className="relative h-40 overflow-hidden">
                  <PlaceholderImage
                    src={image.src}
                    alt={image.alt}
                    width={image.width}
                    height={image.height}
                    sizes="(max-width: 768px) 100vw, 33vw"
                  />
                  {material.label && (
                    <span className="absolute bottom-md right-md rounded-pill bg-strong-accent px-md py-sm text-xs font-bold text-strong-accent-text font-body">
                      {material.label}
                    </span>
                  )}
                </div>
                <div className="p-lg">
                  <h3 className="font-bold text-heading-h4 text-ink font-body">{material.name}</h3>
                  <p className="mt-sm text-sm text-ink-muted leading-relaxed font-body">
                    {material.description}
                  </p>
                  <ul className="mt-md space-y-xs text-sm text-ink font-body">
                    {material.points.map((point) => (
                      <li key={point} className="flex items-center gap-xs">
                        <CheckCircle2 className="h-4 w-4 text-strong-accent" aria-hidden />
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
