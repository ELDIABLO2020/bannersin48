"use client";

import { useQuery } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { isExpiredSignedUrl } from "@/lib/api/signedUrls";

/**
 * The builder keeps the preview URL it got at upload time (also in sessionStorage),
 * but signed links only last 5 minutes. Once the stored one has expired, mint a
 * fresh preview link for the same artwork instead of rendering a dead image.
 */
export function useArtworkPreviewUrl(artworkId: string | null | undefined, storedUrl: string | null | undefined): string | null {
  const expired = Boolean(storedUrl && isExpiredSignedUrl(storedUrl));
  const { data } = useQuery({
    queryKey: ["artwork-preview-url", artworkId],
    queryFn: () => getApiClient().artworkDownloadUrl(artworkId!, "preview"),
    enabled: Boolean(artworkId) && expired,
    staleTime: 4 * 60_000,
    gcTime: 4 * 60_000,
    retry: false,
  });
  if (!storedUrl) return null;
  if (!expired) return storedUrl;
  return data && !isExpiredSignedUrl(data.url) ? data.url : null;
}
