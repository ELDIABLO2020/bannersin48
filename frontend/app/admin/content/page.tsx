"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const BLOCK_TYPES = ["BANNER_IMAGE", "TEXT", "ANNOUNCEMENT", "PROMO_STRIP"];

export default function AdminContentPage() {
  const qc = useQueryClient();
  const blocks = useQuery({ queryKey: ["admin", "content"], queryFn: () => getAdminApiClient().contentList() });
  const [selected, setSelected] = useState<string | null>(null);
  const [key, setKey] = useState("");
  const [blockType, setBlockType] = useState("TEXT");
  const [payload, setPayload] = useState("{}\n");
  const [published, setPublished] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    const block = blocks.data?.find((b) => b.key === selected);
    if (!block) return;
    setKey(block.key); setBlockType(block.blockType); setPayload(`${JSON.stringify(block.payload, null, 2)}\n`); setPublished(block.published);
  }, [selected, blocks.data]);

  const mutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => { setMessage("Content saved. Public GET /content now serves this block."); await qc.invalidateQueries({ queryKey: ["admin", "content"] }); },
    onError: (error) => setMessage((error as Error).message),
  });

  const save = () => {
    try {
      const parsed = JSON.parse(payload) as Record<string, unknown>;
      mutation.mutate(() => getAdminApiClient().contentUpsert(key.trim(), { blockType, payload: parsed, published }));
    } catch { setMessage("Payload must be valid JSON."); }
  };

  const createNew = () => { setSelected(null); setKey(""); setBlockType("TEXT"); setPayload("{\n  \"text\": \"\"\n}\n"); setPublished(true); setMessage(null); };

  return (
    <div className="space-y-xl">
      <div className="flex items-start justify-between gap-md"><div><p className="text-body-sm text-ink-muted">CMS</p><h1 className="font-display text-section-h2 text-ink">Site content</h1></div><Button variant="secondary" onClick={createNew}>New block</Button></div>
      {message && <div className="rounded-feature bg-surface border border-line-subtle p-md text-body-sm text-ink">{message}</div>}
      {blocks.isError && <div className="bg-badge-error-bg text-danger p-md rounded-feature">{(blocks.error as Error).message}</div>}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
        <Card className="lg:col-span-4 bg-surface p-md h-fit"><h2 className="font-bold text-ink mb-sm">Blocks</h2><div className="space-y-xs">{(blocks.data ?? []).map((block) => <button key={block.key} type="button" onClick={() => setSelected(block.key)} className={`w-full text-left rounded-feature p-sm border cursor-pointer ${selected === block.key ? "border-link bg-info-tint" : "border-line-subtle bg-surface"}`}><div className="flex justify-between gap-sm"><span className="font-bold text-ink truncate">{block.key}</span><Badge variant={block.published ? "success" : "neutral"}>{block.published ? "Live" : "Draft"}</Badge></div><p className="text-xs text-ink-muted mt-xs">{block.blockType}</p></button>)}</div></Card>
        <Card className="lg:col-span-8 bg-surface p-lg"><h2 className="font-bold text-heading-h4 text-ink mb-md">{selected ? `Edit ${selected}` : "Create block"}</h2><div className="space-y-md"><label className="block"><span className="text-body-sm text-ink-muted block mb-xs">Key</span><Input value={key} disabled={Boolean(selected)} onChange={(e) => setKey(e.target.value)} placeholder="homepage_announcement" /></label><label className="block"><span className="text-body-sm text-ink-muted block mb-xs">Block type</span><select className="w-full h-10 rounded-pill border border-line-input px-md bg-surface text-ink" value={blockType} onChange={(e) => setBlockType(e.target.value)}>{BLOCK_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="block"><span className="text-body-sm text-ink-muted block mb-xs">Payload (JSON)</span><textarea value={payload} onChange={(e) => setPayload(e.target.value)} rows={14} spellCheck={false} className="w-full rounded-feature border border-line-input p-md font-mono text-sm text-ink bg-surface focus:outline-none focus:border-link" /></label><label className="flex items-center gap-sm text-body-sm text-ink"><input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />Published</label><div className="flex gap-sm"><Button disabled={!key.trim() || mutation.isPending} onClick={save}>{mutation.isPending ? "Saving…" : "Save block"}</Button>{selected && <Button variant="secondary" disabled={mutation.isPending} onClick={() => { if (window.confirm(`Delete ${selected}?`)) mutation.mutate(() => getAdminApiClient().contentDelete(selected)); }}>Delete</Button>}</div></div></Card>
      </div>
    </div>
  );
}
