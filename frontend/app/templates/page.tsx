import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronRight } from "lucide-react";

export const metadata = {
  title: "Banner templates — Banners In 48",
  robots: { index: false, follow: true },
};

const CATEGORIES = [
  "Business", "Restaurant", "Contractor", "School & Sports", "Events", "Real Estate",
];

export default function TemplatesPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-md lg:px-2xl py-xl text-center">
        <Badge variant="warning" className="mb-md">Coming soon</Badge>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2">
          Template library
        </h1>
        <p className="text-body text-ink-muted mt-md">
          We&rsquo;re launching with ~100 templates across six categories.
          Admin can add templates without code changes. Logo, photo, and text replacement
          arrives with Phase 2.
        </p>

        <ul className="grid grid-cols-2 sm:grid-cols-3 gap-sm mt-2xl">
          {CATEGORIES.map((c) => (
            <li key={c}>
              <Card className="bg-surface">
                <p className="font-bold text-sm text-ink">{c}</p>
                <p className="text-body-sm text-ink-muted">Soon</p>
              </Card>
            </li>
          ))}
        </ul>

        <Link
          href="/order/vinyl"
          className="inline-block mt-2xl bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
        >
          Upload your own artwork <ChevronRight className="inline h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
