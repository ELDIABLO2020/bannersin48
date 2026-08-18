import Link from "next/link";
import { Button } from "@/components/ui/button";
import { StepIllustration } from "@/components/how-it-works/StepIllustration";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "How it works — Banners In 48",
  description: "Pick a banner product, upload artwork, approve the proof, and get 48-hour delivery.",
};

const STEPS = [
  { n: 1, kind: "size" as const, title: "Pick your product", body: "Choose HD Banner, mesh, poster, canvas, no-curl, or a stand. Custom products take size next; stands are a fixed 33.5\" × 80\"." },
  { n: 2, kind: "upload" as const, title: "Upload your artwork", body: "PDF, JPEG, PNG, TIFF, or EPS. We'll show an instant proof — what you upload is what we print." },
  { n: 3, kind: "proof" as const, title: "Approve your instant proof", body: "Five quick acknowledgements. A 10-minute cancellation window starts after approval." },
  { n: 4, kind: "delivery" as const, title: "Delivered by noon, guaranteed", body: "FedEx only, anywhere in the US & Canada. If we miss, the $10 shipping fee is refunded." },
] as const;

export default function HowItWorksPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md text-center">
          How it works
        </h1>
        <p className="text-body text-ink-muted text-center mb-2xl max-w-2xl mx-auto">
          From cart to door in 48 business hours. FedEx only, US &amp; Canada.
        </p>
        <ol className="relative mx-auto max-w-4xl space-y-lg before:absolute before:bottom-10 before:left-[55px] before:top-10 before:hidden before:border-l-2 before:border-dashed before:border-line md:before:block">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="relative grid items-center gap-lg rounded-card border border-line-subtle bg-surface p-lg shadow-elev-1 md:grid-cols-[48px_minmax(0,1fr)_220px] md:p-xl"
            >
              <div className="order-2 flex min-w-0 items-start gap-md md:contents">
                <div
                  className="relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-pill bg-strong-accent font-bold text-body text-strong-accent-text ring-8 ring-surface"
                  aria-hidden
                >
                  {s.n}
                </div>
                <div className="min-w-0 md:pr-md">
                  <h2 className="font-bold text-heading-h4 text-ink">{s.title}</h2>
                  <p className="mt-xs text-body text-ink-muted">{s.body}</p>
                </div>
              </div>
              <div className="order-1 rounded-card bg-soft-accent-2 px-md py-sm md:order-none">
                <StepIllustration kind={s.kind} />
              </div>
            </li>
          ))}
        </ol>
        <div className="text-center mt-2xl">
          <Link href="/order">
            <Button variant="cta" size="lg">
              Start an order <ChevronRight className="ml-sm h-5 w-5" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
