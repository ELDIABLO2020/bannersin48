import { ArtworkUploader } from "@/components/upload/ArtworkUploader";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function ArtworkPage() {
  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-2xl px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">Home</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <Link href="/order/vinyl" className="hover:text-link no-underline">Vinyl banners</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Upload artwork</span>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">
          Upload your artwork
        </h1>
        <p className="text-body text-ink-muted mb-2xl">
          We print exactly what you upload. Make sure it&rsquo;s print-ready before approving the proof.
        </p>
        <ArtworkUploader />
      </div>
    </div>
  );
}
