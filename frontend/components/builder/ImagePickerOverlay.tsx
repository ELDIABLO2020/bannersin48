"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useConfigurator } from "@/lib/stores/configurator";
import { ARTWORK_MIME_TYPES, ARTWORK_DEFAULT_DPI, formatBytes } from "@bannersin48/shared";
import { Button } from "@/components/ui/button";
import { X, Upload, Folder } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const MAX_BYTES = 50 * 1024 * 1024;

export function ImagePickerOverlay() {
  const open = useConfigurator((s) => s.pickerOpen);
  const setPickerOpen = useConfigurator((s) => s.setPickerOpen);
  const setArtwork = useConfigurator((s) => s.setArtwork);
  const fileInput = useRef<HTMLInputElement>(null);
  const [folderId, setFolderId] = useState("folder_home");
  const [error, setError] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: folders = [] } = useQuery({
    queryKey: ["artwork-folders"],
    queryFn: () => getApiClient().listArtworkFolders(),
    enabled: open,
  });

  const { data: items = [], isFetching } = useQuery({
    queryKey: ["artwork-library", folderId],
    queryFn: () => getApiClient().listArtwork(folderId),
    enabled: open,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      // Try to read image dimensions in-browser for auto-size
      let widthPx: number | undefined;
      let heightPx: number | undefined;
      if (file.type.startsWith("image/")) {
        const dims = await readImageDims(file);
        widthPx = dims?.width;
        heightPx = dims?.height;
      }
      return getApiClient().uploadArtwork(file, {
        widthPx,
        heightPx,
        dpi: ARTWORK_DEFAULT_DPI,
      });
    },
    onSuccess: (data, file) => {
      setArtwork(data.artworkId, file.name, data.previewUrl, {
        widthPx: data.meta.widthPx,
        heightPx: data.meta.heightPx,
        dpi: data.meta.dpi ?? ARTWORK_DEFAULT_DPI,
        autoSize: Boolean(data.meta.widthPx && data.meta.heightPx),
      });
      qc.invalidateQueries({ queryKey: ["artwork-library"] });
      setPickerOpen(false);
    },
    onError: (err: Error) => setError(err.message),
  });

  if (!open) return null;

  function validateAndUpload(file: File) {
    setError(null);
    if (!(ARTWORK_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError(`Unsupported file type. We accept PDF, JPG, JPEG, and PNG.`);
      return;
    }
    if (file.size > MAX_BYTES) {
      setError(`File is too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_BYTES)}.`);
      return;
    }
    upload.mutate(file);
  }

  return (
    <div
      data-testid="image-picker"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-ink/50 p-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="image-picker-title"
    >
      <div className="w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-feature border border-line bg-surface shadow-lg flex flex-col">
        <div className="flex items-center justify-between border-b border-line px-md py-sm">
          <h2 id="image-picker-title" className="font-display text-heading-h4 text-ink">
            Image library
          </h2>
          <button
            type="button"
            aria-label="Close"
            data-testid="image-picker-close"
            onClick={() => setPickerOpen(false)}
            className="p-1 text-ink-muted hover:text-ink"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          <aside className="w-36 shrink-0 border-r border-line p-sm space-y-1 overflow-y-auto">
            {folders.map((f) => (
              <button
                key={f.id}
                type="button"
                data-testid={`folder-${f.id}`}
                onClick={() => setFolderId(f.id)}
                className={cn(
                  "w-full flex items-center gap-1.5 rounded-card px-sm py-1.5 text-left text-sm",
                  folderId === f.id ? "bg-soft-accent text-ink font-bold" : "text-ink-muted hover:bg-surface-tint",
                )}
              >
                <Folder className="h-3.5 w-3.5" aria-hidden />
                {f.name}
              </button>
            ))}
          </aside>

          <div className="flex-1 p-md overflow-y-auto">
            <div className="flex flex-wrap items-center gap-sm mb-md">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                data-testid="image-picker-upload"
                onClick={() => fileInput.current?.click()}
                disabled={upload.isPending}
              >
                <Upload className="h-4 w-4 mr-1" aria-hidden />
                Upload
              </Button>
              <input
                ref={fileInput}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                className="sr-only"
                data-testid="image-picker-file"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) validateAndUpload(file);
                  e.target.value = "";
                }}
              />
              <span className="text-xs text-ink-muted">PDF, JPG, PNG · max 50 MB</span>
            </div>

            {error && (
              <p role="alert" className="mb-sm text-sm text-danger">
                {error}
              </p>
            )}

            {isFetching && <p className="text-sm text-ink-muted">Loading…</p>}

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-sm">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-testid={`library-item-${item.id}`}
                  onClick={() => {
                    setArtwork(item.id, item.filename, item.previewUrl, {
                      widthPx: item.widthPx,
                      heightPx: item.heightPx,
                      dpi: item.dpi ?? ARTWORK_DEFAULT_DPI,
                      autoSize: Boolean(item.widthPx && item.heightPx),
                    });
                    setPickerOpen(false);
                  }}
                  className="rounded-card border border-line p-sm text-left hover:border-strong-accent transition-colors"
                >
                  <div
                    className="aspect-[4/3] rounded-sm bg-surface-tint bg-center bg-contain bg-no-repeat border border-line"
                    style={{ backgroundImage: `url(${item.previewUrl})` }}
                  />
                  <p className="mt-1 text-xs font-bold text-ink truncate">{item.filename}</p>
                  {item.widthPx && item.heightPx && (
                    <p className="text-[10px] text-ink-muted">
                      {item.widthPx}×{item.heightPx}px · {item.dpi ?? ARTWORK_DEFAULT_DPI} DPI
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function readImageDims(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}
