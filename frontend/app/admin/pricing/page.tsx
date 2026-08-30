"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { useAuth } from "@/lib/stores/auth";
import { MATERIALS } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "../_components/confirm-dialog";

const SQFT_MATERIALS = MATERIALS.filter((m) => m.ratePerSqFt > 0);

export default function AdminPricingPage() {
  const role = useAuth((s) => s.user?.role);
  const canEdit = role === "ADMIN";
  const qc = useQueryClient();
  const products = useQuery({ queryKey: ["admin", "products"], queryFn: () => getAdminApiClient().products() });
  const finishings = useQuery({ queryKey: ["admin", "finishings"], queryFn: () => getAdminApiClient().finishingOptions() });
  const tiers = useQuery({ queryKey: ["admin", "tiers"], queryFn: () => getAdminApiClient().volumeTiers() });
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [tierSqft, setTierSqft] = useState("100");
  const [tierMaterial, setTierMaterial] = useState<string>(SQFT_MATERIALS[0]?.id ?? "VINYL_15OZ_SINGLE");
  const [tierRate, setTierRate] = useState("4.25");
  const [message, setMessage] = useState<string | null>(null);
  const [deleteTier, setDeleteTier] = useState<{ id: string; label: string } | null>(null);

  useEffect(() => {
    const next: Record<string, string> = {};
    products.data?.forEach((p) => p.materials.forEach((m) => { next[`m:${m.id}`] = m.ratePerSqft; }));
    finishings.data?.forEach((f) => { next[`f:${f.id}`] = f.amount; });
    setDrafts(next);
  }, [products.data, finishings.data]);

  // Unsaved-change detection against the authoritative server values.
  const dirty = useMemo(() => {
    const source: Record<string, string> = {};
    products.data?.forEach((p) => p.materials.forEach((m) => { source[`m:${m.id}`] = m.ratePerSqft; }));
    finishings.data?.forEach((f) => { source[`f:${f.id}`] = f.amount; });
    return Object.keys(source).some((k) => (drafts[k] ?? source[k]) !== source[k]);
  }, [drafts, products.data, finishings.data]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const mutation = useMutation({
    mutationFn: async (fn: () => Promise<unknown>) => fn(),
    onSuccess: async () => {
      setMessage("Pricing saved. New quotes use this rate immediately.");
      await Promise.all([
        qc.invalidateQueries({ queryKey: ["admin", "products"] }),
        qc.invalidateQueries({ queryKey: ["admin", "finishings"] }),
        qc.invalidateQueries({ queryKey: ["admin", "tiers"] }),
      ]);
    },
    onError: (error) => setMessage((error as Error).message),
  });

  return (
    <div className="space-y-xl">
      <div className="flex items-start justify-between gap-md">
        <div>
          <p className="text-body-sm text-ink-muted">Pricing control</p>
          <h1 className="font-display text-section-h2 text-ink">Products & rates</h1>
        </div>
        {!canEdit && <Badge variant="neutral">Read only</Badge>}
      </div>

      {dirty && <p className="rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm" role="status">You have unsaved rate changes.</p>}
      {message && <p className="rounded-feature bg-surface p-md text-body-sm text-ink border border-line-subtle" role="status">{message}</p>}
      {(products.isError || finishings.isError || tiers.isError) && <ErrorBox text={((products.error || finishings.error || tiers.error) as Error).message} />}

      <section className="space-y-lg">
        {(products.data ?? []).map((product) => (
          <Card key={product.id} className="bg-surface p-lg">
            <div className="flex items-center justify-between mb-md">
              <div>
                <h2 className="font-bold text-heading-h4 text-ink">{product.name}</h2>
                <p className="text-xs text-ink-muted">{product.code} · {product.sizeMode}</p>
              </div>
              <div className="flex items-center gap-sm">
                <Badge variant={product.active ? "success" : "neutral"}>{product.active ? "Active" : "Inactive"}</Badge>
                {canEdit && (
                  <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().updateProduct(product.id, { active: !product.active }))}>
                    {product.active ? "Deactivate product" : "Activate product"}
                  </Button>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-body-sm">
                <caption className="sr-only">Materials and rates for {product.name}</caption>
                <thead>
                  <tr className="text-left text-ink-muted border-b border-line-subtle">
                    <th scope="col" className="py-sm font-bold">Material</th>
                    <th scope="col" className="font-bold">Code</th>
                    <th scope="col" className="font-bold">$/sqft</th>
                    <th scope="col" className="font-bold">Flat price</th>
                    <th scope="col" className="font-bold">Status</th>
                    <th scope="col" className="font-bold" />
                  </tr>
                </thead>
                <tbody>
                  {product.materials.map((material) => (
                    <tr key={material.id} className="border-b border-line-subtle last:border-0">
                      <td className="py-sm font-bold text-ink">{material.name}</td>
                      <td className="text-xs text-ink-muted">{material.code}</td>
                      <td className="w-32">
                        <label className="sr-only" htmlFor={`rate-${material.id}`}>Rate per sq ft for {material.name}</label>
                        <Input
                          id={`rate-${material.id}`}
                          type="number"
                          step="0.01"
                          min="0"
                          disabled={!canEdit}
                          value={drafts[`m:${material.id}`] ?? material.ratePerSqft}
                          onChange={(e) => setDrafts((d) => ({ ...d, [`m:${material.id}`]: e.target.value }))}
                        />
                      </td>
                      <td className="text-ink-muted">{material.flatPriceUsd ? `$${material.flatPriceUsd}` : "—"}</td>
                      <td><Badge variant={material.active ? "success" : "neutral"}>{material.active ? "Active" : "Inactive"}</Badge></td>
                      <td className="text-right">
                        {canEdit && (
                          <div className="flex justify-end gap-xs">
                            <Button size="sm" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().updateMaterial(product.id, material.id, { ratePerSqft: Number(drafts[`m:${material.id}`]) }))}>Save</Button>
                            <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().updateMaterial(product.id, material.id, { active: !material.active }))}>{material.active ? "Deactivate" : "Activate"}</Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </section>

      <Card className="bg-surface p-lg">
        <h2 className="font-bold text-heading-h4 text-ink mb-md">Finishing adders</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <caption className="sr-only">Finishing option adders and rates</caption>
            <thead>
              <tr className="text-left text-ink-muted border-b border-line-subtle">
                <th scope="col" className="py-sm font-bold">Option</th>
                <th scope="col" className="font-bold">Model</th>
                <th scope="col" className="font-bold">Amount</th>
                <th scope="col" className="font-bold">Status</th>
                <th scope="col" className="font-bold" />
              </tr>
            </thead>
            <tbody>
              {(finishings.data ?? []).map((option) => (
                <tr key={option.id} className="border-b border-line-subtle last:border-0">
                  <td className="py-sm font-bold text-ink">{option.name}</td>
                  <td className="text-ink-muted">{option.priceModel.replace("_", " ")}</td>
                  <td className="w-32">
                    <label className="sr-only" htmlFor={`amount-${option.id}`}>Amount for {option.name}</label>
                    <Input
                      id={`amount-${option.id}`}
                      type="number"
                      step="0.01"
                      min="0"
                      disabled={!canEdit}
                      value={drafts[`f:${option.id}`] ?? option.amount}
                      onChange={(e) => setDrafts((d) => ({ ...d, [`f:${option.id}`]: e.target.value }))}
                    />
                  </td>
                  <td><Badge variant={option.active ? "success" : "neutral"}>{option.active ? "Active" : "Inactive"}</Badge></td>
                  <td className="text-right">
                    {canEdit && (
                      <div className="flex justify-end gap-xs">
                        <Button size="sm" variant="secondary" disabled={mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().updateFinishingOption(option.id, { amount: Number(drafts[`f:${option.id}`]) }))}>Save</Button>
                        <Button size="sm" variant="ghost" disabled={mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().updateFinishingOption(option.id, { active: !option.active }))}>{option.active ? "Deactivate" : "Activate"}</Button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="bg-surface p-lg">
        <div className="mb-md">
          <h2 className="font-bold text-heading-h4 text-ink">Volume tiers</h2>
          <p className="text-xs text-ink-muted">Discounted rates apply at the minimum billable square footage.</p>
        </div>
        <div className="space-y-sm">
          {(tiers.data ?? []).map((tier) => (
            <div key={tier.id} className="flex flex-wrap items-center justify-between gap-md border border-line-subtle rounded-feature p-md">
              <div>
                <p className="font-bold text-ink">{tier.minBillableSqft}+ sqft</p>
                <p className="text-xs text-ink-muted">{JSON.stringify(tier.rates)}</p>
              </div>
              {canEdit && (
                <Button size="sm" variant="ghost" onClick={() => setDeleteTier({ id: tier.id, label: `${tier.minBillableSqft}+ sqft` })}>
                  Delete
                </Button>
              )}
            </div>
          ))}
          {!tiers.isLoading && (tiers.data ?? []).length === 0 && (
            <p className="text-ink-muted text-body-sm">No volume tiers configured.</p>
          )}
        </div>
        {canEdit && (
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-sm mt-md items-end">
            <label className="block" htmlFor="tier-sqft">
              <span className="text-body-sm text-ink-muted block mb-xs">Minimum sqft</span>
              <Input id="tier-sqft" type="number" min="0" value={tierSqft} onChange={(e) => setTierSqft(e.target.value)} />
            </label>
            <label className="block" htmlFor="tier-material">
              <span className="text-body-sm text-ink-muted block mb-xs">Material</span>
              <select
                id="tier-material"
                className="w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm"
                value={tierMaterial}
                onChange={(e) => setTierMaterial(e.target.value)}
              >
                {SQFT_MATERIALS.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </label>
            <label className="block" htmlFor="tier-rate">
              <span className="text-body-sm text-ink-muted block mb-xs">Discounted rate ($/sqft)</span>
              <Input id="tier-rate" type="number" step="0.01" min="0" value={tierRate} onChange={(e) => setTierRate(e.target.value)} />
            </label>
            <Button disabled={mutation.isPending} onClick={() => mutation.mutate(() => getAdminApiClient().createVolumeTier({ minBillableSqft: Number(tierSqft), rates: { [tierMaterial]: Number(tierRate) } }))}>
              Add tier
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={deleteTier != null}
        onOpenChange={(open) => { if (!open) setDeleteTier(null); }}
        title="Delete volume tier?"
        description={deleteTier ? `Remove the ${deleteTier.label} discount tier? Existing orders keep their snapshots.` : ""}
        confirmLabel="Delete tier"
        destructive
        busy={mutation.isPending}
        onConfirm={() => {
          const tier = deleteTier;
          setDeleteTier(null);
          if (tier) mutation.mutate(() => getAdminApiClient().deleteVolumeTier(tier.id));
        }}
      />
    </div>
  );
}

function ErrorBox({ text }: { text: string }) {
  return <div role="alert" className="rounded-feature bg-badge-error-bg text-danger p-md">{text}</div>;
}
