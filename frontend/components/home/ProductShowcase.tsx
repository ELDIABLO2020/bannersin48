import { EmailCtaForm } from "@/components/marketing/EmailCtaForm";

export function ProductShowcase() {
  return (
    <section className="bg-surface" aria-labelledby="showcase-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2
            id="showcase-h"
            className="font-display font-extrabold tracking-tight text-[clamp(34px,4.5vw,52px)] leading-[1.05] text-ink"
          >
            Top-rated banners for the trades
          </h2>
          <p className="mt-md text-body text-ink-muted max-w-2xl mx-auto">
            Trusted by contractors, schools, and events for durable vinyl signage that ships fast.
          </p>
        </div>

        <div className="relative mx-auto max-w-4xl mb-2xl">
          <div
            className="rounded-card shadow-elev-3 bg-soft-accent border border-line p-xl aspect-[16/10] flex items-center justify-center"
            aria-hidden
          >
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-lg w-full max-w-2xl items-end">
              <div className="rounded-modal bg-darkest p-lg shadow-elev-2 aspect-[4/3] flex items-center justify-center">
                <div className="w-full h-24 rounded-sm bg-strong-accent flex items-center justify-center font-display font-bold text-strong-accent-text">
                  Storefront banner
                </div>
              </div>
              <div className="rounded-modal bg-white border border-line p-md shadow-elev-2 mx-auto w-[160px]">
                <div className="h-32 rounded-sm bg-soft-accent flex items-center justify-center text-xs text-ink-muted text-center px-sm">
                  Mobile order view
                </div>
              </div>
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
