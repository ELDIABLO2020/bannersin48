import { EmailCtaForm } from "@/components/marketing/EmailCtaForm";
import { PlaceholderImage } from "@/components/ui/PlaceholderImage";
import { placeholders } from "@/content/placeholders";

export function ProductShowcase() {
  const desktop = placeholders.showcaseDesktop;
  const mobile = placeholders.showcaseMobile;

  return (
    <section className="bg-surface" aria-labelledby="showcase-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2
            id="showcase-h"
            className="font-display tracking-tight text-[clamp(34px,4.5vw,68px)] leading-[1.05] text-ink uppercase"
          >
            Top-rated banners for the trades
          </h2>
          <p className="mt-md text-body text-ink-muted max-w-2xl mx-auto font-body">
            Trusted by contractors, schools, and events for durable vinyl signage that ships fast.
          </p>
        </div>

        <div className="relative mx-auto max-w-4xl mb-2xl min-h-[320px] md:min-h-[420px]">
          <div className="relative rounded-card shadow-elev-3 bg-soft-accent border border-line overflow-hidden aspect-[16/10]">
            <div className="absolute inset-[8%] md:inset-[10%] lg:left-[6%] lg:right-[28%] lg:top-[8%] lg:bottom-[8%]">
              <PlaceholderImage
                src={desktop.src}
                alt={desktop.alt}
                width={desktop.width}
                height={desktop.height}
                sizes="(max-width: 768px) 90vw, 720px"
                className="shadow-elev-2"
              />
            </div>
            <div className="absolute right-[6%] bottom-[6%] w-[28%] max-w-[180px] rounded-modal border border-line bg-white shadow-elev-3 overflow-hidden aspect-[9/16] hidden sm:block">
              <PlaceholderImage
                src={mobile.src}
                alt={mobile.alt}
                width={mobile.width}
                height={mobile.height}
                sizes="180px"
              />
            </div>
          </div>
        </div>

        <div className="max-w-xl mx-auto">
          <EmailCtaForm buttonLabel="Start your order" />
        </div>
      </div>
    </section>
  );
}
