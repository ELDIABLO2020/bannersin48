import type { ArtworkUploadMeta } from "@bannersin48/shared";

/**
 * Artwork file inspection — magic-byte MIME detection (never trusts the
 * client-supplied Content-Type) plus best-effort pixel dimensions & DPI.
 * Pure functions so they are trivially unit-testable.
 */

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export type AllowedMimeType = (typeof ALLOWED_MIME_TYPES)[number];

export interface SniffResult {
  mime: AllowedMimeType | null;
}

export interface DimsResult {
  widthPx?: number;
  heightPx?: number;
  dpi?: number;
  /** Extra info for the dpi_report JSONB column. */
  report: Record<string, unknown>;
}

/** Detect the real file type from leading magic bytes. */
export function sniffMime(buf: Buffer): AllowedMimeType | null {
  if (buf.length < 4) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  ) {
    return "image/png";
  }
  // PDF: "%PDF-"
  if (buf.subarray(0, 5).toString("latin1") === "%PDF-") return "application/pdf";
  return null;
}

function ppmToDpi(ppm: number): number {
  return Math.round(ppm * 0.0254);
}

function parsePng(buf: Buffer): DimsResult {
  const report: Record<string, unknown> = { source: "png" };
  let widthPx: number | undefined;
  let heightPx: number | undefined;
  let dpi: number | undefined;
  try {
    // IHDR is the first chunk: length(4) "IHDR"(4) width(4) height(4).
    widthPx = buf.readUInt32BE(16);
    heightPx = buf.readUInt32BE(20);
    // Walk chunks for pHYs (pixels per metre).
    let offset = 8;
    while (offset + 12 <= buf.length) {
      const length = buf.readUInt32BE(offset);
      const type = buf.subarray(offset + 4, offset + 8).toString("latin1");
      if (type === "pHYs" && length >= 9) {
        const xPpm = buf.readUInt32BE(offset + 8);
        const yPpm = buf.readUInt32BE(offset + 12);
        if (xPpm > 0 && xPpm === yPpm) {
          dpi = Math.min(2400, ppmToDpi(xPpm));
          report.dpiSource = "png_phys";
        }
        break;
      }
      if (type === "IDAT") break; // pHYs always precedes IDAT
      offset += 12 + length;
    }
  } catch {
    // best-effort only
  }
  if (widthPx && heightPx) {
    report.widthPx = widthPx;
    report.heightPx = heightPx;
  }
  if (dpi) report.dpi = dpi;
  return { widthPx, heightPx, dpi, report };
}

function parseJpeg(buf: Buffer): DimsResult {
  const report: Record<string, unknown> = { source: "jpeg" };
  let widthPx: number | undefined;
  let heightPx: number | undefined;
  let dpi: number | undefined;
  try {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) break; // lost sync — give up
      const marker = buf[offset + 1];
      const length = buf.readUInt16BE(offset + 2);
      // APP0 JFIF: density available
      if (marker === 0xe0 && buf.subarray(offset + 4, offset + 9).toString("latin1") === "JFIF\0") {
        const units = buf[offset + 11];
        const xDensity = buf.readUInt16BE(offset + 12);
        if (units === 1 && xDensity >= 10 && xDensity <= 2400) {
          dpi = xDensity;
          report.dpiSource = "jfif_dpi";
        } else if (units === 2 && xDensity >= 10 && xDensity <= 945) {
          dpi = Math.round(xDensity * 2.54);
          report.dpiSource = "jfif_dpcm";
        }
      }
      // SOF0/1/2/…15 (C0–CF except C4 DHT, C8 JPG, CC DAC) carry dimensions.
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        heightPx = buf.readUInt16BE(offset + 5);
        widthPx = buf.readUInt16BE(offset + 7);
        break;
      }
      offset += 2 + length;
    }
  } catch {
    // best-effort only
  }
  if (widthPx && heightPx) {
    report.widthPx = widthPx;
    report.heightPx = heightPx;
  }
  if (dpi) report.dpi = dpi;
  return { widthPx, heightPx, dpi, report };
}

const TIFF_TYPE_SIZES: Record<number, number> = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8 };

function parseTiff(buf: Buffer): DimsResult {
  const report: Record<string, unknown> = { source: "tiff" };
  try {
    const little = buf[0] === 0x49;
    const readU16 = (o: number) => (little ? buf.readUInt16LE(o) : buf.readUInt16BE(o));
    const readU32 = (o: number) => (little ? buf.readUInt32LE(o) : buf.readUInt32BE(o));
    const ifdOffset = readU32(4);
    const count = readU16(ifdOffset);
    let widthPx: number | undefined;
    let heightPx: number | undefined;
    let xRes: { num: number; den: number } | undefined;
    let resolutionUnit = 2; // default inches
    for (let i = 0; i < count; i++) {
      const entry = ifdOffset + 2 + i * 12;
      const tag = readU16(entry);
      const type = readU16(entry + 2);
      const valueCount = readU32(entry + 4);
      const size = TIFF_TYPE_SIZES[type] ?? 1;
      if (size * valueCount > 4) continue; // value out of line — skip (rare for our tags)
      const valueOffset = entry + 8;
      switch (tag) {
        case 256: // ImageWidth
          widthPx = type === 3 ? readU16(valueOffset) : readU32(valueOffset);
          break;
        case 257: // ImageLength
          heightPx = type === 3 ? readU16(valueOffset) : readU32(valueOffset);
          break;
        case 282: // XResolution RATIONAL (offset to two LONGs)
          if (type === 5) {
            const rationalAt = readU32(valueOffset);
            xRes = { num: readU32(rationalAt), den: readU32(rationalAt + 4) };
          }
          break;
        case 296: // ResolutionUnit
          resolutionUnit = readU16(valueOffset);
          break;
      }
    }
    let dpi: number | undefined;
    if (widthPx) report.widthPx = widthPx;
    if (heightPx) report.heightPx = heightPx;
    if (xRes && xRes.den > 0) {
      const res = xRes.num / xRes.den;
      if (resolutionUnit === 2 && res >= 10 && res <= 2400) {
        dpi = Math.round(res);
        report.dpiSource = "tiff_xresolution";
      } else if (resolutionUnit === 3 && res >= 10 && res <= 945) {
        dpi = Math.round(res * 2.54);
        report.dpiSource = "tiff_xresolution_cm";
      }
    }
    if (dpi) report.dpi = dpi;
    return { widthPx, heightPx, dpi, report };
  } catch {
    return { report };
  }
}

function parseEps(buf: Buffer): DimsResult {
  const report: Record<string, unknown> = { source: "eps" };
  try {
    const head = buf.subarray(0, Math.min(buf.length, 64 * 1024)).toString("latin1");
    const match = head.match(/%%BoundingBox:\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s+(-?\d+)/);
    if (match) {
      const widthPt = Math.abs(Number(match[3]) - Number(match[1]));
      const heightPt = Math.abs(Number(match[4]) - Number(match[2]));
      report.widthPt = widthPt;
      report.heightPt = heightPt;
    }
  } catch {
    // best-effort only
  }
  return { report };
}

function parsePdf(buf: Buffer): DimsResult {
  const report: Record<string, unknown> = { source: "pdf" };
  try {
    const head = buf.subarray(0, Math.min(buf.length, 256 * 1024)).toString("latin1");
    const match = head.match(/MediaBox\s*\[\s*([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)\s+([\d.-]+)/);
    if (match) {
      const widthPt = Math.abs(Number(match[3]) - Number(match[1]));
      const heightPt = Math.abs(Number(match[4]) - Number(match[2]));
      report.widthPt = Math.round(widthPt * 100) / 100;
      report.heightPt = Math.round(heightPt * 100) / 100;
    }
  } catch {
    // best-effort only
  }
  return { report };
}

/** Best-effort dimension/DPI extraction per detected type. */
export function inspectDimensions(mime: AllowedMimeType, buf: Buffer): DimsResult {
  switch (mime) {
    case "image/png":
      return parsePng(buf);
    case "image/jpeg":
      return parseJpeg(buf);
    case "application/pdf":
      return parsePdf(buf);
  }
}

export interface InspectedArtwork extends ArtworkUploadMeta {
  sha256: string;
  dpiReport: Record<string, unknown>;
}
