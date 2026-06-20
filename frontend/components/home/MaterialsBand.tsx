import Link from "next/link";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const MATERIALS = [
  {
    name: "13 oz Vinyl",
    label: "Most ordered",
    description: "Standard indoor and outdoor vinyl for events, retail, contractors, and general signage.",
    // Ecwid-tinted vinyl swatch — green base fading to white
    texture: "bg-[linear-gradient(135deg,#002a42_0%,#002a42_48%,#eef1f3_49%,#FFFFFF_100%)]",
    points: ["Water resistant", "Strong color", "Great everyday durability"],
  },
  {
    name: "15 oz Premium Vinyl",
    label: undefined,
    description: "A heavier option when the banner needs a more substantial outdoor feel.",
    texture: "bg-[linear-gradient(135deg,#F8F9FA_0%,#E5E7EB_50%,#FFFFFF_100%)]",
    points: ["Thicker hand feel", "Premium finish", "Outdoor-ready"],
  },
  {
    name: "18 oz Blockout",
    label: undefined,
    description: "Heavy-duty opaque vinyl and the material option for double-sided work.",
    texture: "bg-[linear-gradient(135deg,#131b1f_0%,#43423e_42%,#eef1f3_43%,#FFFFFF_100%)]",
    points: ["Opaque construction", "Double-sided available", "Maximum durability"],
  },
] as const;

export function MaterialsBand() {
  return (
    <section
      className="bg-[linear-gradient(180deg,#FFFFFF_0%,#eef1f3_100%)]"
      aria-labelledby="materials-h"
    >
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="mb-2xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <h2
              id="materials-h"
              className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
            >
              Choose the right material
            </h2>
            <p className="text-body text-ink-muted mt-md max-w-2xl">
              Durable vinyl options for different environments, visibility needs, and handling.
            </p>
          </div>
          <Link
            href="/order/vinyl"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline"
          >
            Compare materials
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {MATERIALS.map((material) => (
            <article
              key={material.name}
              className="mat-card overflow-hidden rounded-card border border-line bg-surface shadow-elev-1"
            >
              <div className={`relative h-40 ${material.texture}`}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_20%,rgba(255,255,255,0.9)_0_3px,transparent_4px),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.9)_0_3px,transparent_4px)]" />
                {material.label && (
                  <span className="absolute bottom-md right-md rounded-pill bg-strong-accent px-md py-sm text-xs font-bold text-strong-accent-text">
                    {material.label}
                  </span>
                )}
              </div>
              <div className="p-lg">
                <h3 className="font-bold text-heading-h4 text-ink">{material.name}</h3>
                <p className="mt-sm text-sm text-ink-muted leading-relaxed">
                  {material.description}
                </p>
                <ul className="mt-md space-y-xs text-sm text-ink">
                  {material.points.map((point) => (
                    <li key={point} className="flex items-center gap-xs">
                      <CheckCircle2 className="h-4 w-4 text-strong-accent" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
