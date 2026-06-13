import { Card } from "@/components/ui/card";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const REVIEWS = [
  {
    name: "Jamie R.",
    location: "Dallas, TX",
    quote: "Ordered Friday at 8 PM, banner landed at the shop by Tuesday lunch. The price beat every other quote I got.",
  },
  {
    name: "Sam T.",
    location: "Chicago, IL",
    quote: "We needed a graduation banner in two days. Banners In 48 actually did it. FedEx driver even called on arrival.",
  },
  {
    name: "Morgan K.",
    location: "Toronto, ON",
    quote: "The instant proof is exactly what I uploaded. No surprises. Will reorder for the next event.",
  },
] as const;

export function Reviews() {
  return (
    <section className="bg-surface" aria-labelledby="reviews-h">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-3xl">
        <div className="text-center mb-2xl">
          <h2 id="reviews-h" className="font-display text-section-h2 text-ink leading-section-h2">
            What customers say
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-lg">
          {REVIEWS.map((r) => (
            <Card key={r.name} variant="default" className="h-full flex flex-col">
              <div className="flex items-center gap-xs mb-md" aria-label="5 out of 5 stars">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-4 w-4 text-cta fill-current" aria-hidden />
                ))}
              </div>
              <p className="text-body text-ink leading-relaxed flex-1">&ldquo;{r.quote}&rdquo;</p>
              <div className="mt-lg pt-md border-t border-line">
                <p className="text-sm font-bold text-ink">{r.name}</p>
                <p className="text-body-sm text-ink-muted">{r.location}</p>
                <Badge variant="neutral" className="mt-xs">Sample review</Badge>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
