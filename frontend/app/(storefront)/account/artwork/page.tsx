"use client";

import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ArtworkFolder } from "@bannersin48/shared";
import { ARTWORK_DEFAULT_DPI, ARTWORK_MIME_TYPES, UPLOAD_REJECT, formatBytes } from "@bannersin48/shared";
import { Folder, Upload } from "lucide-react";
import { getApiClient } from "@/lib/api/client";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const MAX_BYTES = 50 * 1024 * 1024;
const ALL = "__all__";

/**
 * Artwork library as a page (plan §4.3): folders down the side, files in a
 * grid with signed previews. Folder CRUD and upload reuse the existing
 * `/artwork/*` routes unchanged; files cannot be deleted here (orders
 * reference them), which matches the API.
 */
export default function AccountArtworkPage() {
  const qc = useQueryClient();
  const [folderId, setFolderId] = useState<string>(ALL);
  const [newFolder, setNewFolder] = useState("");
  const [renaming, setRenaming] = useState<ArtworkFolder | null>(null);
  const [renameTo, setRenameTo] = useState("");
  const [deleting, setDeleting] = useState<ArtworkFolder | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const folders = useQuery({ queryKey: ["artwork-folders"], queryFn: () => getApiClient().listArtworkFolders() });
  const files = useQuery({
    queryKey: ["artwork-library", folderId === ALL ? "all" : folderId],
    queryFn: () => getApiClient().listArtwork(folderId === ALL ? undefined : folderId),
  });

  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["artwork-folders"] }), qc.invalidateQueries({ queryKey: ["artwork-library"] })]);
  };
  const create = useMutation({
    mutationFn: (name: string) => getApiClient().createArtworkFolder(name),
    onSuccess: async (folder) => {
      setNewFolder("");
      setMessage(`Folder "${folder.name}" created.`);
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => getApiClient().renameArtworkFolder(id, name),
    onSuccess: async () => {
      setRenaming(null);
      setMessage("Folder renamed.");
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => getApiClient().deleteArtworkFolder(id),
    onSuccess: async () => {
      if (deleting && folderId === deleting.id) setFolderId(ALL);
      setDeleting(null);
      setMessage("Folder removed. Its files are still in your library.");
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });
  const upload = useMutation({
    mutationFn: (file: File) => getApiClient().uploadArtwork(file, { dpi: ARTWORK_DEFAULT_DPI }),
    onSuccess: async () => {
      setMessage("File uploaded.");
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });

  function onPick(file: File | undefined) {
    if (!file) return;
    if (!(ARTWORK_MIME_TYPES as readonly string[]).includes(file.type)) return setMessage(UPLOAD_REJECT);
    if (file.size > MAX_BYTES) return setMessage(`File is too large (${formatBytes(file.size)}). Max ${formatBytes(MAX_BYTES)}.`);
    upload.mutate(file);
  }

  const folderRows = folders.data ?? [];
  const current = folderRows.find((f) => f.id === folderId) ?? null;

  return (
    <div className="grid grid-cols-1 gap-lg md:grid-cols-[13rem_1fr]">
      <aside>
        <h2 className="mb-sm text-xs font-bold uppercase tracking-wide text-ink-muted">Folders</h2>
        <ul className="space-y-1" data-testid="artwork-folders">
          {[{ id: ALL, name: "All files" }, ...folderRows].map((folder) => (
            <li key={folder.id}>
              <button
                type="button"
                aria-current={folderId === folder.id ? "true" : undefined}
                onClick={() => setFolderId(folder.id)}
                className={cn(
                  "flex w-full items-center gap-sm rounded-btn px-sm py-sm text-left text-body-sm font-bold",
                  folderId === folder.id ? "bg-surface text-link border border-line" : "text-ink hover:bg-soft-accent",
                )}
              >
                <Folder className="h-4 w-4 shrink-0" aria-hidden />
                <span className="truncate">{folder.name}</span>
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-md flex gap-xs"
          onSubmit={(e) => {
            e.preventDefault();
            if (newFolder.trim()) create.mutate(newFolder.trim());
          }}
        >
          <label className="sr-only" htmlFor="new-folder">New folder name</label>
          <Input id="new-folder" placeholder="New folder" value={newFolder} maxLength={80} onChange={(e) => setNewFolder(e.target.value)} />
          <Button type="submit" variant="secondary" size="sm" disabled={create.isPending || !newFolder.trim()} data-testid="folder-create">
            Add
          </Button>
        </form>
      </aside>

      <section className="min-w-0">
        <div className="mb-md flex flex-wrap items-center justify-between gap-sm">
          <div className="flex flex-wrap items-center gap-sm">
            <h2 className="text-heading-h4 text-ink">{current?.name ?? "All files"}</h2>
            {current && (
              <>
                <Button type="button" variant="ghost" size="sm" onClick={() => { setRenaming(current); setRenameTo(current.name); }}>
                  Rename
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(current)}>
                  Delete folder
                </Button>
              </>
            )}
          </div>
          <div>
            <input
              ref={fileInput}
              type="file"
              className="sr-only"
              aria-label="Choose a file to upload"
              tabIndex={-1}
              accept={ARTWORK_MIME_TYPES.join(",")}
              onChange={(e) => {
                onPick(e.target.files?.[0]);
                e.currentTarget.value = "";
              }}
            />
            <Button type="button" variant="cta" size="sm" disabled={upload.isPending} onClick={() => fileInput.current?.click()}>
              <Upload className="mr-xs h-4 w-4" aria-hidden />
              {upload.isPending ? "Uploading…" : "Upload file"}
            </Button>
          </div>
        </div>
        {renaming && (
          <form
            className="mb-md flex max-w-md gap-xs"
            onSubmit={(e) => {
              e.preventDefault();
              if (renameTo.trim()) rename.mutate({ id: renaming.id, name: renameTo.trim() });
            }}
          >
            <label className="sr-only" htmlFor="rename-folder">Folder name</label>
            <Input id="rename-folder" value={renameTo} maxLength={80} onChange={(e) => setRenameTo(e.target.value)} autoFocus />
            <Button type="submit" variant="cta" size="sm" disabled={rename.isPending}>Save</Button>
            <Button type="button" variant="secondary" size="sm" onClick={() => setRenaming(null)}>Cancel</Button>
          </form>
        )}
        {message && <p role="status" className="mb-md text-body-sm text-ink-muted" data-testid="artwork-message">{message}</p>}

        {files.isLoading ? (
          <p className="text-ink-muted" role="status">Loading files…</p>
        ) : (files.data ?? []).length === 0 ? (
          <div className="rounded-card border border-line bg-surface p-xl">
            <p className="text-body text-ink">No files here yet.</p>
            <p className="mt-xs text-body-sm text-ink-muted">Upload a PDF, JPEG or PNG, or add artwork while building a banner. It stays with your account.</p>
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-md sm:grid-cols-3 xl:grid-cols-4" data-testid="artwork-grid">
            {(files.data ?? []).map((file) => (
              <li key={file.id} className="overflow-hidden rounded-card border border-line bg-surface">
                <div className="flex h-32 items-center justify-center bg-surface-tint">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.previewUrl} alt="" className="h-full w-full object-contain p-sm" />
                </div>
                <div className="p-sm">
                  <p className="truncate text-body-sm font-bold text-ink" title={file.filename}>{file.filename}</p>
                  <p className="text-xs text-ink-muted">
                    {formatBytes(file.sizeBytes)}
                    {file.widthPx && file.heightPx ? ` · ${file.widthPx} × ${file.heightPx} px` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title="Delete this folder?"
        description={deleting ? `"${deleting.name}" will be removed. Files inside it move back to your library; nothing is deleted.` : undefined}
        confirmLabel="Delete folder"
        destructive
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
