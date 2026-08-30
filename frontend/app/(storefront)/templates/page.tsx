import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Banner templates unavailable",
  robots: { index: false, follow: false, noarchive: true },
};

export default function TemplatesPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-md lg:px-2xl py-3xl text-center">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2">
          Templates are not available
        </h1>
        <p className="text-body text-ink-muted mt-md">
          This internal version accepts completed JPEG, PNG, or PDF artwork during product
          configuration. It does not include a template library.
        </p>
        <Link
          href="/order"
          className="inline-block mt-2xl bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover"
        >
          Choose a product <ChevronRight className="inline h-4 w-4" aria-hidden />
        </Link>
      </div>
    </div>
  );
}
