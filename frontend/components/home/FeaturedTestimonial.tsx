import { getFeaturedTestimonial } from "@/content/testimonials";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";

export function FeaturedTestimonial() {
  const testimonial = getFeaturedTestimonial();
  if (!testimonial) return null;

  const imageSrc = testimonial.imageUrl ?? placeholders.testimonialFeatured.src;
  const imageAlt = placeholders.testimonialFeatured.alt;

  return (
    <section className="bg-darkest text-white" aria-labelledby="featured-testimonial-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
          <div className="relative rounded-card aspect-video overflow-hidden border border-white/15 shadow-elev-3">
            <PlaceholderImage
              src={imageSrc}
              alt={imageAlt}
              width={placeholders.testimonialFeatured.width}
              height={placeholders.testimonialFeatured.height}
              sizes="(max-width: 1024px) 100vw, 560px"
            />
          </div>
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md font-body">{testimonial.industry}</p>
            <blockquote
              id="featured-testimonial-h"
              className="font-display text-[clamp(28px,3.5vw,40px)] leading-tight tracking-tight uppercase"
            >
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <p className="mt-lg text-body text-white/80 font-body">
              <span className="font-semibold text-white">{testimonial.name}</span>
              {" | "}
              {testimonial.company}
            </p>
            {testimonial.metrics && testimonial.metrics.length > 0 && (
              <div className="mt-lg flex flex-wrap gap-md">
                {testimonial.metrics.map((m) => (
                  <div key={m.label} className="rounded-card bg-white/10 px-lg py-md">
                    <p className="font-display text-2xl text-strong-accent uppercase">{m.value}</p>
                    <p className="text-xs text-white/70 mt-xs font-body">{m.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
