import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PRODUCTS, CATALOG_NAV_PRODUCTS, productOrderHref } from "@bannersin48/shared";

export function ProductStrip() {
  return (
    <section id="products" className="bg-surface border-b border-line" aria-labelledby="products-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <ScrollReveal className="mb-xl flex flex-col gap-md md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">Catalog</p>
            <h2
              id="products-h"
              className="font-display tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink uppercase"
            >
              Every banner we print
            </h2>
            <p className="text-body text-ink-muted mt-md max-w-2xl font-body">
              Vinyl, mesh, paper, canvas, and stands — pick the product that matches the job.
            </p>
          </div>
          <Link
            href="/order"
            className="inline-flex items-center gap-xs text-sm font-semibold text-link no-underline hover:underline font-body"
          >
            Compare all products
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>
        <ScrollReveal className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
          {CATALOG_NAV_PRODUCTS.map((id) => {
            const product = PRODUCTS[id];
            return (
              <Link
                key={id}
                href={productOrderHref(id)}
                className="group rounded-card border border-line bg-surface p-lg shadow-elev-1 no-underline transition-all hover:-translate-y-0.5 hover:border-strong-accent hover:shadow-elev-2"
              >
                <h3 className="font-bold text-ink font-body">{product.title}</h3>
                <p className="mt-xs text-sm text-ink-muted leading-relaxed font-body">{product.subtitle}</p>
                <span className="mt-md inline-flex items-center gap-xs text-sm font-semibold text-link font-body">
                  Order
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            );
          })}
        </ScrollReveal>
      </div>
    </section>
  );
}
