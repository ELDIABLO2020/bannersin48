import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, CheckCircle2 } from "lucide-react";

export const metadata = {
  title: "How it works — Banners In 48",
  description: "Order a custom banner in under 3 minutes with our 48-hour delivery promise.",
};

const STEPS = [
  { n: 1, title: "Pick your size & material", body: "Use a quick-pick or enter custom feet & inches. We round up to billable size and show the live price." },
  { n: 2, title: "Upload your artwork", body: "PDF, JPG, or JPEG. We'll show an instant proof — what you upload is what we print." },
  { n: 3, title: "Approve your instant proof", body: "Five quick acknowledgements. A 10-minute cancellation window starts after approval." },
  { n: 4, title: "Delivered by noon, guaranteed", body: "FedEx only, anywhere in the US & Canada. If we miss, the $10 shipping fee is refunded." },
];

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
        <ol className="space-y-lg max-w-2xl mx-auto">
          {STEPS.map((s) => (
            <li key={s.n} className="flex items-start gap-md bg-surface rounded-card p-lg shadow-elev-1">
              <div
                className="inline-flex items-center justify-center w-10 h-10 rounded-pill font-bold text-body bg-link text-white shrink-0"
                aria-hidden
              >
                {s.n}
              </div>
              <div>
                <h2 className="font-bold text-heading-h4 text-ink">{s.title}</h2>
                <p className="text-body text-ink-muted mt-xs">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="text-center mt-2xl">
          <Link href="/order/vinyl">
            <Button variant="cta" size="lg">
              Start an order <ChevronRight className="ml-sm h-5 w-5" aria-hidden />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
