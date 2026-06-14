"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useConfigurator } from "@/lib/stores/configurator";
import { ARTWORK_MIME_TYPES, formatBytes } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

const MAX_BYTES = 50 * 1024 * 1024;

export function ArtworkUploader() {
  const [dragOver, setDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const setArtwork = useConfigurator((s) => s.setArtwork);
  const artworkId = useConfigurator((s) => s.artworkId);
  const artworkFileName = useConfigurator((s) => s.artworkFileName);
  const router = useRouter();

  const upload = useMutation({
    mutationFn: (file: File) => getApiClient().uploadArtwork(file),
    onSuccess: (data) => {
      setArtwork(data.artworkId, artworkFileName ?? data.artworkId);
    },
  });

  function validateAndUpload(file: File) {
    setLocalError(null);
    if (!(ARTWORK_MIME_TYPES as readonly string[]).includes(file.type)) {
      setLocalError(
        `Unsupported file type: ${file.type || "unknown"}. We accept PDF, JPG, and JPEG only.`,
      );
      return;
    }
    if (file.size > MAX_BYTES) {
      setLocalError(`File is too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_BYTES)}.`);
      return;
    }
    setArtwork(null, file.name);
    upload.mutate(file);
  }

  function handleFile(file: File | null | undefined) {
    if (!file) return;
    validateAndUpload(file);
  }

  return (
    <div className="space-y-lg">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFile(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-card border-2 border-dashed p-2xl text-center transition-colors ${
          dragOver ? "border-strong-accent bg-soft-accent" : "border-line bg-surface"
        }`}
      >
        <Upload className="h-10 w-10 text-strong-accent mx-auto mb-md" aria-hidden />
        <h3 className="font-bold text-heading-h4 text-ink">Upload your artwork</h3>
        <p className="text-body-sm text-ink-muted mt-xs">
          Drag &amp; drop a file, or
        </p>
        <Button
          type="button"
          variant="secondary"
          size="md"
          className="mt-md"
          onClick={() => fileInput.current?.click()}
        >
          Choose a file
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".pdf,.jpg,.jpeg,application/pdf,image/jpeg"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>

      <Card className="bg-surface">
        <h3 className="font-bold text-sm text-ink mb-sm">Requirements</h3>
        <ul className="text-body-sm text-ink-muted space-y-xs">
          <li>Accepted: <strong className="text-ink">PDF, JPG, JPEG</strong></li>
          <li>Max file size: <strong className="text-ink">{formatBytes(MAX_BYTES)}</strong></li>
          <li>Recommended: <strong className="text-ink">150 DPI</strong> at final size</li>
          <li>Add <strong className="text-ink">0.5&Prime; bleed</strong> on all sides when possible</li>
          <li>CMYK color; what you upload is what we print</li>
        </ul>
      </Card>

      {(localError || upload.isError) && (
        <div
          role="alert"
          className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg text-ink"
        >
          <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
          <p className="text-sm">{localError ?? (upload.error as Error)?.message ?? "Upload failed."}</p>
        </div>
      )}

      {artworkId && artworkFileName && (
        <Card className="bg-success-bg">
          <div className="flex items-center gap-md">
            <FileText className="h-6 w-6 text-success-fg" aria-hidden />
            <div className="flex-1">
              <p className="text-sm font-bold text-ink">{artworkFileName}</p>
              <p className="text-body-sm text-ink-muted">Uploaded successfully</p>
            </div>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                setArtwork(null, null);
                upload.reset();
              }}
            >
              <X className="h-4 w-4" aria-hidden />
              Remove
            </Button>
          </div>
        </Card>
      )}

      <div className="flex gap-sm">
        <Button
          type="button"
          variant="cta"
          size="lg"
          disabled={!artworkId || upload.isPending}
          onClick={() => router.push("/cart")}
        >
          Continue to cart &rarr;
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="lg"
          onClick={() => router.push("/order/vinyl")}
        >
          Back to configurator
        </Button>
      </div>
    </div>
  );
}
