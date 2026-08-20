import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ScrollReveal } from "@/components/animations/ScrollReveal";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";
import { getCarouselTestimonials, getFeaturedTestimonial } from "@/content/testimonials";

export function Testimonials() {
  const featured = getFeaturedTestimonial();
  const carousel = getCarouselTestimonials();

  if (!featured && carousel.length === 0) return null;

  const imageSrc = featured?.imageUrl ?? placeholders.testimonialFeatured.src;
  const imageAlt = placeholders.testimonialFeatured.alt;

  return (
    <section className="bg-darkest text-white" aria-labelledby="testimonials-carousel-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        {featured ? (
          <ScrollReveal className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center mb-3xl">
            <div className="relative aspect-[4/5] max-h-[420px] overflow-hidden lg:aspect-video lg:max-h-none">
              <PlaceholderImage
                src={imageSrc}
                alt={imageAlt}
                width={placeholders.testimonialFeatured.width}
                height={placeholders.testimonialFeatured.height}
                framed
                overlay
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
            <div>
              <p className="text-strong-accent-on-dark font-semibold text-sm mb-md font-body">
                {featured.industry}
              </p>
              <blockquote
                id="featured-testimonial-h"
                className="font-display text-[clamp(28px,3.5vw,40px)] leading-tight tracking-tight uppercase"
              >
                &ldquo;{featured.quote}&rdquo;
              </blockquote>
              <p className="mt-lg text-body text-white/80 font-body">
                <span className="font-semibold text-white">{featured.name}</span>
                {" | "}
                {featured.company}
              </p>
              {featured.metrics && featured.metrics.length > 0 && (
                <div className="mt-lg flex flex-wrap gap-md">
                  {featured.metrics.map((m) => (
                    <div key={m.label} className="rounded-card bg-white/10 px-lg py-md">
                      <p className="font-display text-2xl text-strong-accent-on-dark uppercase">{m.value}</p>
                      <p className="text-xs text-white/70 mt-xs font-body">{m.label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollReveal>
        ) : null}

        <ScrollReveal className="flex flex-col gap-md md:flex-row md:items-end md:justify-between mb-2xl">
          <h2
            id="testimonials-carousel-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-white uppercase"
          >
            Hear from Banners In 48 customers
          </h2>
          <Link
            href="/reviews"
            className="inline-flex items-center gap-xs text-sm font-semibold text-strong-accent-on-dark no-underline hover:underline"
          >
            View all testimonials
            <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </ScrollReveal>

        {carousel.length > 0 ? (
          <ScrollReveal className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-lg">
            {carousel.map((t) => (
              <article
                key={t.id}
                className="rounded-card border border-white/15 bg-white/5 p-xl shadow-elev-1"
              >
                <p className="text-xs font-semibold text-white/60 uppercase tracking-wide">
                  {t.industry}
                </p>
                <blockquote className="mt-md text-body text-white/90 leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="mt-lg text-sm font-semibold text-white">
                  {t.name}
                  <span className="text-white/60 font-normal"> — {t.company}</span>
                </p>
                {t.metrics && t.metrics.length > 0 && (
                  <div className="mt-md flex flex-wrap gap-sm">
                    {t.metrics.map((m) => (
                      <div
                        key={m.label}
                        className="rounded-pill bg-white/10 border border-white/15 px-md py-xs text-xs"
                      >
                        <span className="font-bold text-white">{m.value}</span>
                        <span className="text-white/60"> {m.label}</span>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </ScrollReveal>
        ) : null}
      </div>
    </section>
  );
}
