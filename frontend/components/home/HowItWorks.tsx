import Link from "next/link";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { Button } from "@/components/ui/button";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { SectionHeading } from "@/components/ui/section-heading";
import { placeholders } from "@/content/placeholders";

const STEPS = [
  {
    title: "Pick a product",
    body: "Vinyl, mesh, paper, canvas, or a stand. Set the size and finishing, and the price updates as you go.",
  },
  {
    title: "Upload your artwork",
    body: "Send a JPEG, PNG, or PDF. You check the file against your order at checkout, before anything prints.",
  },
  {
    title: "We print and ship",
    body: "Your banner is printed, finished, checked, and sent by FedEx. You see the delivery date before you order.",
  },
] as const;

export function HowItWorks() {
  const image = placeholders.flagshipProduction;

  return (
    <section className="bg-surface-tint text-ink" aria-labelledby="how-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2xl items-center">
          <div className="lg:col-span-7">
            <SectionHeading
              id="how-h"
              title="How it works"
              intro="Three steps, all online. The 48 hours start when your order is in and staff have confirmed your payment."
            />
            <ScrollReveal as="ol" className="mt-xl space-y-lg" selector=".hw-step">
              {STEPS.map((step, i) => (
                <li key={step.title} className="hw-step grid grid-cols-[2.5rem_1fr] gap-md border-t border-line pt-lg">
                  <span className="font-display text-heading-h2 leading-none text-strong-accent tabular-nums" aria-hidden>
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-display text-heading-h3 text-ink">{step.title}</h3>
                    <p className="mt-xs text-body text-ink-muted max-w-[60ch]">{step.body}</p>
                  </div>
                </li>
              ))}
            </ScrollReveal>
            <Link href="/order" className="mt-xl inline-block">
              <Button variant="cta" size="lg">
                Start your order
              </Button>
            </Link>
          </div>

          <div className="lg:col-span-5">
            <div className="relative aspect-[4/5] overflow-hidden rounded-card">
              <PlaceholderImage
                src={image.src}
                alt={image.alt}
                fill
                rounded="none"
                sizes="(max-width: 1024px) 100vw, 480px"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
