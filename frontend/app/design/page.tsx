import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Online design unavailable",
  robots: { index: false, follow: false, noarchive: true },
};

export default function DesignPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-md lg:px-2xl py-3xl text-center">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2">
          Online design is not available
        </h1>
        <p className="text-body text-ink-muted mt-md">
          Upload completed JPEG, PNG, or PDF artwork while configuring a product. This internal
          version does not provide an online editor or designer-created proof.
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
