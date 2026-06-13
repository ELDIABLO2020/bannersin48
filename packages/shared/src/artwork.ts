import { z } from "zod";
import { ARTWORK_MIME_TYPES, ARTWORK_MAX_BYTES_DEFAULT } from "./constants";

/**
 * Artwork upload rules from the plan §11.1.
 * PDF, JPG, JPEG only. Max size and DPI configurable in admin.
 */
export const artworkMimeTypeSchema = z.enum(ARTWORK_MIME_TYPES);

export const artworkUploadMetaSchema = z
  .object({
    mimeType: artworkMimeTypeSchema,
    sizeBytes: z.number().int().positive(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
  })
  .strict();

export type ArtworkMimeType = z.infer<typeof artworkMimeTypeSchema>;
export type ArtworkUploadMeta = z.infer<typeof artworkUploadMetaSchema>;

export interface ArtworkConfig {
  maxBytes: number;
  acceptedMimeTypes: ReadonlyArray<ArtworkMimeType>;
  recommendedDpi: number;
}

export const DEFAULT_ARTWORK_CONFIG: ArtworkConfig = {
  maxBytes: ARTWORK_MAX_BYTES_DEFAULT,
  acceptedMimeTypes: ARTWORK_MIME_TYPES,
  recommendedDpi: 150,
};

export function isAcceptedMimeType(mime: string, accepted: ReadonlyArray<ArtworkMimeType>): mime is ArtworkMimeType {
  return (accepted as ReadonlyArray<string>).includes(mime);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
