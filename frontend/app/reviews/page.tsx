import Link from "next/link";
import { testimonials } from "@/content/testimonials";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Customer testimonials — Banners In 48",
  description: "Verified customer stories from Banners In 48 orders.",
};

export default function ReviewsPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md text-center">
          Customer testimonials
        </h1>
        <p className="text-body text-ink-muted text-center mb-2xl max-w-2xl mx-auto">
          Real feedback from verified customers. We only publish sourced quotes.
        </p>

        {testimonials.length === 0 ? (
          <div className="max-w-xl mx-auto text-center rounded-card border border-line bg-surface p-xl">
            <p className="text-body text-ink-muted">
              Verified customer stories will appear here as they become available.
            </p>
            <Link href="/order/vinyl" className="inline-block mt-xl">
              <Button variant="cta" size="lg">
                Start your order
                <ChevronRight className="ml-sm h-5 w-5" aria-hidden />
              </Button>
            </Link>
          </div>
        ) : (
          <ul className="space-y-lg max-w-2xl mx-auto">
            {testimonials.map((t) => (
              <li
                key={t.id}
                className="rounded-card border border-line bg-surface p-xl shadow-elev-1"
              >
                <p className="text-xs font-semibold text-strong-accent uppercase tracking-wide">
                  {t.industry}
                </p>
                <blockquote className="mt-md text-body text-ink leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <p className="mt-lg text-sm font-semibold text-ink">
                  {t.name}
                  <span className="text-ink-muted font-normal"> — {t.company}</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
