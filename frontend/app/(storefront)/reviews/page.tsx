import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Customer reviews unavailable",
  description: "Customer review content is not currently published.",
  robots: { index: false, follow: false, noarchive: true },
};

export default function ReviewsPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-xl px-md lg:px-2xl py-3xl text-center">
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          Customer reviews are not published
        </h1>
        <p className="text-body text-ink-muted">
          We do not currently have approved customer quotes to display. This page will remain
          unavailable unless sourced reviews and publication permission are recorded.
        </p>
        <Link href="/order" className="inline-block mt-xl">
          <Button variant="cta" size="lg">
            Browse banner products
            <ChevronRight className="ml-sm h-5 w-5" aria-hidden />
          </Button>
        </Link>
      </div>
    </div>
  );
}
