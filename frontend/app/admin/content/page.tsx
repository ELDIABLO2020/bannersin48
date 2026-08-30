"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "../_components/confirm-dialog";

const BLOCK_TYPES = ["BANNER_IMAGE", "TEXT", "ANNOUNCEMENT", "PROMO_STRIP"] as const;
type BlockType = (typeof BLOCK_TYPES)[number];

interface FieldDef {
  name: string;
  label: string;
  type: "text" | "textarea" | "url" | "boolean";
  placeholder?: string;
}

/** Structured editors per block type so content editors never touch raw JSON. */
const BLOCK_FIELDS: Record<BlockType, FieldDef[]> = {
  BANNER_IMAGE: [
    { name: "imageUrl", label: "Image URL", type: "url", placeholder: "/images/example.jpg" },
    { name: "altText", label: "Alt text", type: "text", placeholder: "Describe the image" },
    { name: "headline", label: "Headline", type: "text", placeholder: "Banners In 48" },
  ],
  TEXT: [
    { name: "heading", label: "Heading (optional)", type: "text" },
    { name: "text", label: "Body text", type: "textarea" },
  ],
  ANNOUNCEMENT: [
    { name: "text", label: "Announcement text", type: "textarea" },
    { name: "enabled", label: "Enabled", type: "boolean" },
  ],
  PROMO_STRIP: [
    { name: "text", label: "Promo text", type: "text" },
    { name: "linkHref", label: "Link URL", type: "url", placeholder: "/order/hd-banner" },
  ],
};

function stringField(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function boolField(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

export default function AdminContentPage() {
  const qc = useQueryClient();
  const blocks = useQuery({ queryKey: ["admin", "content"], queryFn: () => getAdminApiClient().contentList() });
  const [selected, setSelected] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [blockType, setBlockType] = useState<BlockType>("TEXT");
  const [payload, setPayload] = useState<Record<string, unknown>>({});
  const [published, setPublished] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Unsaved-change guards.
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [pendingNew, setPendingNew] = useState(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const firstRender = useRef(true);

  const mutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => {
      setMessage("Saved.");
      setDirty(false);
      await qc.invalidateQueries({ queryKey: ["admin", "content"] });
    },
    onError: (error) => setMessage((error as Error).message),
  });

  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const loadBlock = (blockKey: string | null) => {
    if (blockKey == null) {
      setSelected(null);
      setKey("");
      setBlockType("TEXT");
      setPayload({ text: "" });
      setPublished(true);
    } else {
      const block = blocks.data?.find((b) => b.key === blockKey);
      if (!block) return;
      setSelected(block.key);
      setKey(block.key);
      setBlockType((block.blockType as BlockType) ?? "TEXT");
      setPayload((block.payload as Record<string, unknown>) ?? {});
      setPublished(block.published);
    }
    setDirty(false);
    setMessage(null);
  };

  const requestSelect = (blockKey: string | null) => {
    if (dirty) {
      setPendingKey(blockKey);
      setPendingNew(blockKey == null);
      setDiscardOpen(true);
      return;
    }
    loadBlock(blockKey);
  };

  const setField = (name: string, value: unknown) => {
    setPayload((p) => ({ ...p, [name]: value }));
    setDirty(true);
  };

  const save = () => {
    if (!key.trim()) {
      setMessage("A block key is required before saving.");
      return;
    }
    setMessage(null);
    mutation.mutate(() =>
      getAdminApiClient().contentUpsert(key.trim(), {
        blockType,
        payload,
        published,
      }),
    );
  };

  const fields = BLOCK_FIELDS[blockType] ?? [];

  return (
    <div className="space-y-xl">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="text-body-sm text-ink-muted">CMS</p>
          <h1 className="font-display text-section-h2 text-ink">Site content</h1>
        </div>
        <Button variant="secondary" onClick={() => requestSelect(null)}>New block</Button>
      </div>

      {dirty && <p className="rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm" role="status">You have unsaved changes.</p>}
      {message && <p className="rounded-feature bg-surface border border-line-subtle p-md text-body-sm text-ink" role="status">{message}</p>}
      {blocks.isError && <p className="bg-badge-error-bg text-danger p-md rounded-feature" role="alert">{(blocks.error as Error).message}</p>}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <Card className="lg:col-span-4 bg-surface p-md h-fit">
          <h2 className="font-bold text-ink mb-sm">Blocks</h2>
          {blocks.isLoading ? (
            <p className="text-ink-muted text-body-sm" role="status">Loading blocks…</p>
          ) : (blocks.data ?? []).length === 0 ? (
            <p className="text-ink-muted text-body-sm">No content blocks yet.</p>
          ) : (
            <div className="space-y-xs">
              {(blocks.data ?? []).map((block) => (
                <button
                  key={block.key}
                  type="button"
                  onClick={() => requestSelect(block.key)}
                  aria-pressed={selected === block.key}
                  className={`w-full text-left rounded-feature p-sm border cursor-pointer ${selected === block.key ? "border-link bg-info-tint" : "border-line-subtle bg-surface"}`}
                >
                  <div className="flex justify-between gap-sm">
                    <span className="font-bold text-ink truncate">{block.key}</span>
                    <Badge variant={block.published ? "success" : "neutral"}>{block.published ? "Live" : "Draft"}</Badge>
                  </div>
                  <p className="text-xs text-ink-muted mt-xs">{block.blockType.replace("_", " ")}</p>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="lg:col-span-8 bg-surface p-lg">
          <h2 className="font-bold text-heading-h4 text-ink mb-md">{selected ? `Edit ${selected}` : "Create block"}</h2>

          <div className="space-y-md">
            <label className="block" htmlFor="block-key">
              <span className="text-body-sm text-ink-muted block mb-xs">Key</span>
              <Input
                id="block-key"
                value={key}
                disabled={Boolean(selected)}
                onChange={(e) => { setKey(e.target.value); setDirty(true); }}
                placeholder="homepage_announcement"
              />
            </label>

            <label className="block" htmlFor="block-type">
              <span className="text-body-sm text-ink-muted block mb-xs">Block type</span>
              <select
                id="block-type"
                className="w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm"
                value={blockType}
                onChange={(e) => { setBlockType(e.target.value as BlockType); setDirty(true); }}
              >
                {BLOCK_TYPES.map((type) => (
                  <option key={type} value={type}>{type.replace("_", " ")}</option>
                ))}
              </select>
            </label>

            {fields.map((field) => (
              <div key={field.name} className="block">
                {field.type === "boolean" ? (
                  <label className="flex items-center gap-sm text-body-sm text-ink" htmlFor={`field-${field.name}`}>
                    <input
                      id={`field-${field.name}`}
                      type="checkbox"
                      className="h-5 w-5"
                      checked={boolField(payload[field.name])}
                      onChange={(e) => setField(field.name, e.target.checked)}
                    />
                    {field.label}
                  </label>
                ) : field.type === "textarea" ? (
                  <label className="block" htmlFor={`field-${field.name}`}>
                    <span className="text-body-sm text-ink-muted block mb-xs">{field.label}</span>
                    <textarea
                      id={`field-${field.name}`}
                      value={stringField(payload[field.name])}
                      onChange={(e) => setField(field.name, e.target.value)}
                      rows={4}
                      placeholder={field.placeholder}
                      className="w-full rounded-feature border border-line-input p-md text-sm text-ink bg-surface focus:outline-none focus:border-link"
                    />
                  </label>
                ) : (
                  <label className="block" htmlFor={`field-${field.name}`}>
                    <span className="text-body-sm text-ink-muted block mb-xs">{field.label}</span>
                    <Input
                      id={`field-${field.name}`}
                      type={field.type === "url" ? "url" : "text"}
                      value={stringField(payload[field.name])}
                      onChange={(e) => setField(field.name, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  </label>
                )}
              </div>
            ))}

            <label className="flex items-center gap-sm text-body-sm text-ink" htmlFor="block-published">
              <input
                id="block-published"
                type="checkbox"
                className="h-5 w-5"
                checked={published}
                onChange={(e) => { setPublished(e.target.checked); setDirty(true); }}
              />
              Published
            </label>

            <div className="flex gap-sm pt-sm">
              <Button disabled={!key.trim() || mutation.isPending} onClick={save}>
                {mutation.isPending ? "Saving…" : "Save block"}
              </Button>
              {selected && (
                <Button variant="secondary" disabled={mutation.isPending} onClick={() => setDeleteOpen(true)}>
                  Delete
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Live preview of the structured payload. */}
      <Card className="bg-surface p-lg">
        <h2 className="font-bold text-heading-h4 text-ink mb-md">Preview</h2>
        <ContentPreview blockType={blockType} payload={payload} />
      </Card>

      <ConfirmDialog
        open={discardOpen}
        onOpenChange={setDiscardOpen}
        title="Discard unsaved changes?"
        description="Your changes to this block have not been saved. Discard them and switch blocks?"
        confirmLabel="Discard changes"
        destructive
        onConfirm={() => {
          setDiscardOpen(false);
          loadBlock(pendingNew ? null : pendingKey);
          setPendingKey(null);
          setPendingNew(false);
        }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete ${selected ?? "block"}?`}
        description="This permanently removes the content block. It will no longer be served to the public site."
        confirmLabel="Delete block"
        destructive
        busy={mutation.isPending}
        onConfirm={() => {
          setDeleteOpen(false);
          if (selected) {
            mutation.mutate(async () => {
              await getAdminApiClient().contentDelete(selected);
              loadBlock(null);
            });
          }
        }}
      />
    </div>
  );
}

/** Non-interactive visual preview for the supported block types. */
function ContentPreview({ blockType, payload }: { blockType: BlockType; payload: Record<string, unknown> }) {
  if (blockType === "BANNER_IMAGE") {
    const imageUrl = stringField(payload.imageUrl);
    return (
      <div className="rounded-feature border border-line-subtle overflow-hidden relative bg-surface-tint min-h-32">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt={stringField(payload.altText)} className="w-full h-40 object-cover" />
        ) : (
          <div className="h-40 flex items-center justify-center text-ink-muted text-body-sm">Image URL not set</div>
        )}
        <p className="font-display text-heading-h4 text-ink px-md py-sm">{stringField(payload.headline) || "Headline"}</p>
      </div>
    );
  }

  if (blockType === "ANNOUNCEMENT") {
    const enabled = boolField(payload.enabled);
    return (
      <div className={`rounded-feature p-md text-body-sm ${enabled ? "bg-surface-dark text-ink-light" : "bg-surface-tint text-ink-muted"}`}>
        {enabled ? stringField(payload.text) || "Announcement text" : "Disabled — no announcement will render."}
      </div>
    );
  }

  if (blockType === "PROMO_STRIP") {
    return (
      <div className="rounded-feature bg-info-tint p-md text-body-sm">
        <p className="font-bold text-ink">{stringField(payload.text) || "Promo text"}</p>
        <p className="text-link">{stringField(payload.linkHref) || "/"}</p>
      </div>
    );
  }

  // TEXT
  return (
    <div className="rounded-feature bg-surface p-md border border-line-subtle max-w-prose">
      {stringField(payload.heading) && <h3 className="font-bold text-heading-h4 text-ink mb-sm">{stringField(payload.heading)}</h3>}
      <p className="text-body text-ink whitespace-pre-wrap">{stringField(payload.text) || "Body text"}</p>
    </div>
  );
}
