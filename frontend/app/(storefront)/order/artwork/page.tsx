"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Artwork is handled in-builder. Send legacy /order/artwork to the catalog hub
 * so the shopper picks a product first.
 */
export default function ArtworkPage() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/order");
  }, [router]);

  return (
    <div className="bg-surface-tint min-h-[40vh] flex items-center justify-center">
      <p className="text-body text-ink-muted">Opening the product catalog…</p>
    </div>
  );
}
