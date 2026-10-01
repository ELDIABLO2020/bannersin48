"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedDesign } from "@bannersin48/api-client";
import type { Material, ProductId } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useCart } from "@/lib/stores/cart";
import { cartLineFromQuote } from "@/lib/cart/quoteState";
import { SavedDesignCard } from "@/components/account/SavedDesignCard";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Saved designs grid (plan §4.3). "Order again" re-quotes the design at
 * today's rates on the server and drops a confirmed line into the cart; a
 * design without artwork opens the builder instead, since checkout needs a file.
 */
export default function AccountDesignsPage() {
  const qc = useQueryClient();
  const router = useRouter();
  const addLine = useCart((s) => s.addLine);
  const designs = useQuery({ queryKey: ["account", "designs"], queryFn: () => getApiClient().listDesigns() });
  const [deleting, setDeleting] = useState<SavedDesign | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["account", "designs"] });

  const order = useMutation<{ builder: string } | { line: NonNullable<ReturnType<typeof cartLineFromQuote>> }, Error, SavedDesign>({
    mutationFn: async (design: SavedDesign) => {
      if (!design.artworkFileId) return { builder: `/order/${design.productSlug}` };
      const result = await getApiClient().quoteDesign(design.id);
      if (!result.line.artworkId) return { builder: `/order/${design.productSlug}` };
      const line = cartLineFromQuote(
        `cart_${Date.now()}_${design.id}`,
        {
          productId: result.line.productId as ProductId,
          material: result.line.material as Material,
          dimensions: result.line.dimensions,
          finishing: result.line.finishing,
          quantity: result.line.quantity,
          artworkId: result.line.artworkId,
        },
        result.quote,
      );
      if (!line) throw new Error("This design could not be priced. Open it in the builder instead.");
      return { line };
    },
    onSuccess: (res) => {
      if ("builder" in res) {
        router.push(res.builder);
        return;
      }
      addLine(res.line);
      router.push("/cart");
    },
    onError: (err) => setMessage((err as Error).message),
  });
  const rename = useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => getApiClient().updateDesign(id, { name }),
    onSuccess: async () => {
      setMessage("Design renamed.");
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => getApiClient().deleteDesign(id),
    onSuccess: async () => {
      setDeleting(null);
      setMessage("Design deleted.");
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });

  if (designs.isLoading) return <p className="text-ink-muted" role="status">Loading designs…</p>;
  if (designs.isError) return <p className="text-danger" role="alert">{(designs.error as Error).message}</p>;
  const rows = designs.data ?? [];
  const busy = order.isPending || rename.isPending || remove.isPending;

  if (rows.length === 0) {
    return (
      <div className="rounded-card border border-line bg-surface p-xl">
        <p className="text-body text-ink">You have not saved a design yet.</p>
        <p className="mt-xs text-body-sm text-ink-muted">Build a banner and keep the configuration here to order it again later.</p>
        <Link href="/order" className="mt-md inline-block">
          <Button variant="cta" size="md">Start a design</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-md">
      <p className="text-body-sm text-ink-muted">{rows.length} saved design{rows.length === 1 ? "" : "s"}. Prices are recalculated at today&rsquo;s rates when you order.</p>
      {message && <p role="status" className="text-body-sm text-ink-muted" data-testid="design-message">{message}</p>}
      <ul className="grid grid-cols-1 gap-md sm:grid-cols-2 xl:grid-cols-3" data-testid="design-grid">
        {rows.map((design) => (
          <SavedDesignCard
            key={design.id}
            design={design}
            busy={busy}
            onOrder={() => { setMessage(null); order.mutate(design); }}
            onRename={(name) => rename.mutate({ id: design.id, name })}
            onDelete={() => setDeleting(design)}
          />
        ))}
      </ul>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title="Delete this design?"
        description={deleting ? `"${deleting.name}" will be removed. Artwork stays in your library.` : undefined}
        confirmLabel="Delete design"
        destructive
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
