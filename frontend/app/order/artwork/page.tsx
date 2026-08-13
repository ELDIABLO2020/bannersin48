"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Artwork is handled in-builder. Redirect legacy /order/artwork into the vinyl
 * builder with the image picker open.
 */
export default function ArtworkPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/order/hd-banner?picker=1");
  }, [router]);

  return (
    <div className="bg-surface-tint min-h-[40vh] flex items-center justify-center">
      <p className="text-body text-ink-muted">Opening artwork library…</p>
    </div>
  );
}
