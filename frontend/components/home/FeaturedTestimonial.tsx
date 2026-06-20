import { getFeaturedTestimonial } from "@/content/testimonials";

export function FeaturedTestimonial() {
  const testimonial = getFeaturedTestimonial();
  if (!testimonial) return null;

  return (
    <section className="bg-darkest text-white" aria-labelledby="featured-testimonial-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2xl items-center">
          <div
            className="rounded-card aspect-video bg-white/10 border border-white/15 flex items-center justify-center"
            aria-hidden
          >
            {testimonial.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={testimonial.imageUrl}
                alt=""
                className="w-full h-full object-cover rounded-card"
              />
            ) : (
              <span className="text-white/50 text-sm">Customer story</span>
            )}
          </div>
          <div>
            <p className="text-strong-accent font-semibold text-sm mb-md">{testimonial.industry}</p>
            <blockquote
              id="featured-testimonial-h"
              className="font-display font-extrabold text-[clamp(28px,3.5vw,40px)] leading-tight tracking-tight"
            >
              &ldquo;{testimonial.quote}&rdquo;
            </blockquote>
            <p className="mt-lg text-body text-white/80">
              <span className="font-semibold text-white">{testimonial.name}</span>
              {" | "}
              {testimonial.company}
            </p>
            {testimonial.metrics && testimonial.metrics.length > 0 && (
              <div className="mt-lg flex flex-wrap gap-md">
                {testimonial.metrics.map((m) => (
                  <div key={m.label} className="rounded-card bg-white/10 px-lg py-md">
                    <p className="font-display font-extrabold text-2xl text-strong-accent">{m.value}</p>
                    <p className="text-xs text-white/70 mt-xs">{m.label}</p>
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
