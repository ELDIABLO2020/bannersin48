import { z } from "zod";
import { ARTWORK_MIME_TYPES, ARTWORK_MAX_BYTES_DEFAULT, ARTWORK_DEFAULT_DPI } from "./constants";

/**
 * Artwork upload rules — PDF, JPG/JPEG, PNG. Max size and DPI configurable.
 */

export const artworkMimeTypeSchema = z.enum(ARTWORK_MIME_TYPES);

export const artworkUploadMetaSchema = z
  .object({
    mimeType: artworkMimeTypeSchema,
    sizeBytes: z.number().int().positive(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    dpi: z.number().positive().optional(),
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
  recommendedDpi: ARTWORK_DEFAULT_DPI,
};

export const colorMatchingSchema = z
  .object({
    pmsNotes: z.string().max(2000),
  })
  .strict();

export type ColorMatching = z.infer<typeof colorMatchingSchema>;

/** Library item shape used by Image Zone + MSW fixtures. */
export const artworkLibraryItemSchema = z
  .object({
    id: z.string(),
    folderId: z.string(),
    filename: z.string(),
    previewUrl: z.string(),
    mimeType: artworkMimeTypeSchema,
    sizeBytes: z.number().int().nonnegative(),
    widthPx: z.number().int().positive().optional(),
    heightPx: z.number().int().positive().optional(),
    dpi: z.number().positive().optional(),
  })
  .strict();

export type ArtworkLibraryItem = z.infer<typeof artworkLibraryItemSchema>;

export const artworkFolderSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    parentId: z.string().nullable(),
  })
  .strict();

export type ArtworkFolder = z.infer<typeof artworkFolderSchema>;

export function isAcceptedMimeType(mime: string, accepted: ReadonlyArray<ArtworkMimeType>): mime is ArtworkMimeType {
  return (accepted as ReadonlyArray<string>).includes(mime);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export interface PrintSizeInches {
  widthIn: number;
  heightIn: number;
}

export interface PrintSizeFtIn {
  widthFt: number;
  widthIn: number;
  heightFt: number;
  heightIn: number;
}

/**
 * Convert pixel dimensions + DPI to print size in inches.
 * Falls back to recommended DPI when dpi is missing.
 */
export function pixelsToPrintInches(
  widthPx: number,
  heightPx: number,
  dpi: number = ARTWORK_DEFAULT_DPI,
): PrintSizeInches {
  const safeDpi = dpi > 0 ? dpi : ARTWORK_DEFAULT_DPI;
  return {
    widthIn: widthPx / safeDpi,
    heightIn: heightPx / safeDpi,
  };
}

/** Split total inches into whole feet + leftover inches (0–11). */
export function inchesToFtIn(totalInches: number): { ft: number; inches: number } {
  const clamped = Math.max(0, totalInches);
  let ft = Math.floor(clamped / 12);
  let inches = Math.round(clamped - ft * 12);
  if (inches >= 12) {
    ft += 1;
    inches = 0;
  }
  return { ft, inches };
}

/**
 * Auto-size helper: print inches → Dimensions-compatible ft/in.
 * Clamps each axis to at least 1 ft for schema compatibility.
 */
export function printInchesToDimensions(widthIn: number, heightIn: number): PrintSizeFtIn {
  const w = inchesToFtIn(Math.max(12, widthIn));
  const h = inchesToFtIn(Math.max(12, heightIn));
  return {
    widthFt: Math.max(1, w.ft),
    widthIn: w.inches,
    heightFt: Math.max(1, h.ft),
    heightIn: h.inches,
  };
}

/** Convenience: pixels + dpi → Dimensions fields. */
export function pixelsToDimensions(
  widthPx: number,
  heightPx: number,
  dpi: number = ARTWORK_DEFAULT_DPI,
): PrintSizeFtIn {
  const inches = pixelsToPrintInches(widthPx, heightPx, dpi);
  return printInchesToDimensions(inches.widthIn, inches.heightIn);
}
