"use client";

import { AlertCircle, FileImage, FileText, RotateCw } from "lucide-react";
import type { CartLine } from "@/lib/cart/quoteState";
import {
  PRODUCTS,
  productIdForMaterial,
  finishingSummary,
  formatBytes,
  orientationLabel,
  orientationOf,
  type ArtworkLibraryItem,
  type ProductId,
} from "@bannersin48/shared";
import { materialLabel } from "@/components/builder/builderRules";

interface ArtworkReviewProps {
  lines: CartLine[];
  artworkById: Map<string, ArtworkLibraryItem>;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}

function formatLabel(mime: string): string {
  if (mime === "application/pdf") return "PDF";
  if (mime === "image/jpeg") return "JPEG";
  if (mime === "image/png") return "PNG";
  return mime.replace(/^image\//, "").toUpperCase();
}

function printSizeInches(
  line: CartLine,
  productId: ProductId,
): { widthIn: number; heightIn: number } {
  const product = PRODUCTS[productId];
  if (product.sizeMode === "fixed" && product.fixedSizeIn) {
    return product.fixedSizeIn;
  }
  return {
    widthIn: line.dimensions.widthFt * 12 + line.dimensions.widthIn,
    heightIn: line.dimensions.heightFt * 12 + line.dimensions.heightIn,
  };
}

function effectiveDpi(
  art: ArtworkLibraryItem,
  size: { widthIn: number; heightIn: number },
): number | null {
  if (!art.widthPx || !art.heightPx || size.widthIn <= 0 || size.heightIn <= 0) return null;
  return Math.floor(Math.min(art.widthPx / size.widthIn, art.heightPx / size.heightIn));
}

function dpiAdvisory(dpi: number): string {
  if (dpi >= 150) return "Sharp for large-format viewing.";
  if (dpi >= 75) return "Good for most viewing distances.";
  return "Low resolution — may appear soft up close.";
}

export function ArtworkReview({ lines, artworkById, loading, error, onRetry }: ArtworkReviewProps) {
  return (
    <section aria-labelledby="artwork-review-heading" className="space-y-md">
      <h2 id="artwork-review-heading" className="font-bold text-heading-h4 text-ink">
        Review uploaded artwork
      </h2>
      <p className="text-body-sm text-ink-muted">
        This is <strong className="text-ink">the exact file we will print</strong> — not a
        designer-created proof. We print your uploaded file as configured and do not correct
        spelling, colors, or layout.
      </p>

      {loading && (
        <p className="text-body-sm text-ink-muted" role="status">
          Loading your uploaded files…
        </p>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-sm p-md rounded-card bg-badge-error-bg">
          <AlertCircle className="h-5 w-5 text-danger shrink-0" aria-hidden />
          <p className="text-sm text-ink">
            We couldn&rsquo;t load your uploaded files.
            <button
              type="button"
              onClick={onRetry}
              className="ml-sm inline-flex items-center gap-xs text-link font-bold hover:underline"
            >
              <RotateCw className="h-3.5 w-3.5" aria-hidden /> Retry
            </button>
          </p>
        </div>
      )}

      {!loading && !error && (
        <ul className="space-y-md">
          {lines.map((line) => {
            const productId: ProductId =
              (line.productId as ProductId | undefined) ?? productIdForMaterial(line.material);
            const product = PRODUCTS[productId];
            const art = artworkById.get(line.artworkId);
            const finish = finishingSummary(productId, line.finishing);
            const mat = materialLabel(line.material);
            const size = printSizeInches(line, productId);
            const dpi = art ? effectiveDpi(art, size) : null;

            return (
              <li key={line.id} className="rounded-card border border-line bg-surface p-md">
                <div className="flex items-start gap-sm">
                  <span className="shrink-0 inline-flex items-center justify-center h-9 w-9 rounded-card bg-soft-accent text-strong-accent">
                    {art?.mimeType === "application/pdf" ? (
                      <FileText className="h-5 w-5" aria-hidden />
                    ) : (
                      <FileImage className="h-5 w-5" aria-hidden />
                    )}
                  </span>
                  <div className="min-w-0">
                    <p className="font-bold text-ink break-words">
                      {art?.filename ?? "Uploaded file unavailable"}
                    </p>
                    <p className="text-body-sm text-ink-muted">
                      {art ? (
                        <>
                          {formatLabel(art.mimeType)}
                          {art.sizeBytes ? ` · ${formatBytes(art.sizeBytes)}` : ""}
                          {" · "}
                          {orientationLabel(orientationOf(line.dimensions))}
                        </>
                      ) : (
                        "File no longer available in your library"
                      )}
                    </p>
                  </div>
                </div>

                {!art && (
                  <p className="mt-sm text-body-sm text-danger" role="alert">
                    This artwork is no longer available. Return to the builder to re-select it
                    before submitting — the order cannot be placed without it.
                  </p>
                )}

                <dl className="mt-sm grid grid-cols-2 gap-x-md gap-y-xs text-body-sm text-ink-muted">
                  <div>
                    <dt className="text-ink-muted">Print size</dt>
                    <dd className="text-ink">{line.display.requestedLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Billable</dt>
                    <dd className="text-ink">{line.display.billableLabel}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Material</dt>
                    <dd className="text-ink">{mat}</dd>
                  </div>
                  <div>
                    <dt className="text-ink-muted">Quantity</dt>
                    <dd className="text-ink">{line.quantity}</dd>
                  </div>
                  {finish && (
                    <div className="col-span-2">
                      <dt className="text-ink-muted">Finishing</dt>
                      <dd className="text-ink">{finish}</dd>
                    </div>
                  )}
                </dl>

                {art && (
                  <div className="mt-sm rounded-card bg-surface-tint p-sm text-body-sm">
                    <p className="font-bold text-ink">Print readiness (advisory)</p>
                    <ul className="mt-xs space-y-xs text-ink-muted">
                      {dpi !== null && (
                        <li>
                          Effective ≈{dpi} DPI at this size — {dpiAdvisory(dpi)}
                        </li>
                      )}
                      <li>
                        Keep critical text and graphics inside the safe area (at least 1–2″ from
                        welded edges and grommets).
                      </li>
                      <li>
                        Artwork is fit to the configured print area (no crop in V1); verify
                        orientation matches the size above.
                      </li>
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
