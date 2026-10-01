"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AdminPromoCode, PromoCodeBody } from "@bannersin48/api-client";
import { promoCodeInputSchema } from "@bannersin48/shared";
import { getAdminApiClient } from "@/lib/api/adminClient";
import { Can } from "@/lib/auth/useCan";
import { promoDiscountLabel } from "@/lib/admin/labels";
import { PageHeader } from "@/components/ui/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { RequirePermission } from "../_components/require-permission";
import { ConfirmDialog } from "../_components/confirm-dialog";

const SELECT = "w-full h-10 rounded-btn border border-line-input px-md bg-surface text-ink text-sm";
const PAGE_SIZE = 25;

export default function AdminPromosPage() {
  return (
    <RequirePermission perm="promos:read">
      <Promos />
    </RequirePermission>
  );
}

type Filter = "all" | "active" | "inactive";

function windowLabel(promo: AdminPromoCode): string {
  const from = promo.startsAt ? new Date(promo.startsAt).toLocaleDateString() : null;
  const to = promo.endsAt ? new Date(promo.endsAt).toLocaleDateString() : null;
  if (!from && !to) return "Always";
  if (from && to) return `${from} – ${to}`;
  return from ? `From ${from}` : `Until ${to}`;
}

function usageLabel(promo: AdminPromoCode): string {
  const cap = promo.maxUses ? ` of ${promo.maxUses}` : "";
  const per = promo.perUserLimit ? ` · ${promo.perUserLimit} per customer` : "";
  return `${promo.timesUsed}${cap}${per}`;
}

function Promos() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<AdminPromoCode | "new" | null>(null);
  const [deactivating, setDeactivating] = useState<AdminPromoCode | null>(null);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const promos = useQuery({
    queryKey: ["admin", "promos", search, filter, page],
    queryFn: () => getAdminApiClient().promos({ search: search || undefined, active: filter === "all" ? undefined : filter === "active" ? "true" : "false", page, pageSize: PAGE_SIZE }),
  });
  const deactivate = useMutation({
    mutationFn: (id: string) => getAdminApiClient().deactivatePromo(id),
    onSuccess: async (promo) => {
      setMessage({ tone: "ok", text: `${promo.code} deactivated. Orders that used it keep their record.` });
      await qc.invalidateQueries({ queryKey: ["admin", "promos"] });
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });

  const total = promos.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const items = promos.data?.items ?? [];

  return (
    <div className="space-y-xl">
      <PageHeader
        title="Promo codes"
        intro="Discount codes for the storefront. Codes are deactivated, never deleted, so past orders keep their reference."
        className="mb-0"
        actions={
          <Can perm="promos:write">
            <Button type="button" onClick={() => setEditing("new")} data-testid="promo-create">New promo code</Button>
          </Can>
        }
      />

      <div className="rounded-feature bg-warning-bg text-warning-fg p-md text-body-sm" role="note">
        Checkout does not apply promo codes yet. Codes set up here are ready for when it does.
      </div>

      {message && (
        <div role={message.tone === "ok" ? "status" : "alert"} className={`rounded-feature p-md text-body-sm ${message.tone === "ok" ? "bg-success-bg text-success-fg" : "bg-badge-error-bg text-danger"}`} data-testid="promo-message">
          {message.text}
        </div>
      )}

      <Card className="bg-surface p-lg">
        <form
          className="flex flex-col sm:flex-row gap-sm"
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            setSearch(draft.trim());
          }}
        >
          <label className="block flex-1" htmlFor="promo-search">
            <span className="text-body-sm text-ink-muted block mb-xs">Search codes</span>
            <Input id="promo-search" type="search" value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="WELCOME10" />
          </label>
          <label className="block sm:w-48" htmlFor="promo-filter">
            <span className="text-body-sm text-ink-muted block mb-xs">Status</span>
            <select
              id="promo-filter"
              className={SELECT}
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value as Filter);
                setPage(1);
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </label>
          <div className="flex items-end">
            <Button type="submit" variant="secondary">Search</Button>
          </div>
        </form>
      </Card>

      <Card className="bg-surface p-lg relative overflow-x-auto">
        {promos.isLoading ? (
          <p className="text-ink-muted py-xl" role="status">Loading promo codes…</p>
        ) : promos.isError ? (
          <p className="text-danger py-xl" role="alert">{(promos.error as Error).message}</p>
        ) : items.length === 0 ? (
          <div className="py-xl text-center">
            <p className="text-ink-muted">No promo codes found.</p>
            <p className="text-body-sm text-ink-muted mt-xs">{search || filter !== "all" ? "Try clearing the filters." : "Create the first code to get started."}</p>
          </div>
        ) : (
          <>
            <p className="text-body-sm text-ink-muted mb-md" aria-live="polite">{total} codes</p>
            <table className="w-full text-body-sm" data-testid="promo-table">
              <caption className="sr-only">Promo codes, page {page} of {totalPages}</caption>
              <thead>
                <tr className="text-left text-ink-muted border-b border-line-subtle">
                  <th scope="col" className="py-sm font-bold">Code</th>
                  <th scope="col" className="font-bold">Discount</th>
                  <th scope="col" className="font-bold">Min. order</th>
                  <th scope="col" className="font-bold">Used</th>
                  <th scope="col" className="font-bold">Window</th>
                  <th scope="col" className="font-bold">Status</th>
                  <th scope="col" className="font-bold"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {items.map((promo) => (
                  <tr key={promo.id} className="border-b border-line-subtle last:border-0">
                    <td className="py-md font-bold text-ink"><code>{promo.code}</code></td>
                    <td className="text-ink">{promoDiscountLabel(promo)}</td>
                    <td className="text-ink tabular-nums">{Number(promo.minOrder) > 0 ? `$${Number(promo.minOrder).toFixed(2)}` : "—"}</td>
                    <td className="text-ink-muted">{usageLabel(promo)}</td>
                    <td className="text-ink-muted">{windowLabel(promo)}</td>
                    <td><Badge variant={promo.active ? "success" : "neutral"}>{promo.active ? "Active" : "Inactive"}</Badge></td>
                    <td className="text-right whitespace-nowrap">
                      <Can perm="promos:write">
                        <div className="flex justify-end gap-sm">
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(promo)} aria-label={`Edit ${promo.code}`}>Edit</Button>
                          {promo.active && (
                            <Button type="button" variant="ghost" size="sm" className="text-danger" onClick={() => setDeactivating(promo)} aria-label={`Deactivate ${promo.code}`}>Deactivate</Button>
                          )}
                        </div>
                      </Can>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between gap-md mt-md">
              <span className="text-body-sm text-ink-muted">Page {page} of {totalPages}</span>
              <div className="flex gap-sm">
                <Button type="button" variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Previous</Button>
                <Button type="button" variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</Button>
              </div>
            </div>
          </>
        )}
      </Card>

      <PromoDialog
        promo={editing}
        onClose={() => setEditing(null)}
        onSaved={async (promo, created) => {
          setEditing(null);
          setMessage({ tone: "ok", text: created ? `${promo.code} created.` : `${promo.code} saved.` });
          await qc.invalidateQueries({ queryKey: ["admin", "promos"] });
        }}
      />
      <ConfirmDialog
        open={deactivating !== null}
        onOpenChange={(open) => !open && setDeactivating(null)}
        title={`Deactivate ${deactivating?.code ?? ""}?`}
        description="Customers can no longer use this code. It stays listed so past orders keep their reference, and you can re-enable it later."
        confirmLabel="Deactivate"
        destructive
        busy={deactivate.isPending}
        onConfirm={() => {
          const target = deactivating;
          setDeactivating(null);
          if (target) deactivate.mutate(target.id);
        }}
      />
    </div>
  );
}

// --- Create / edit dialog ---------------------------------------------------------------

interface FormState {
  code: string;
  type: "PERCENT" | "FIXED";
  value: string;
  minOrder: string;
  maxUses: string;
  perUserLimit: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
}

const EMPTY: FormState = { code: "", type: "PERCENT", value: "", minOrder: "0", maxUses: "", perUserLimit: "", startsAt: "", endsAt: "", active: true };

/** ISO instant → `<input type="datetime-local">` value in the browser's zone. */
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromPromo(promo: AdminPromoCode): FormState {
  return {
    code: promo.code,
    type: promo.type,
    value: promo.value,
    minOrder: promo.minOrder,
    maxUses: promo.maxUses?.toString() ?? "",
    perUserLimit: promo.perUserLimit?.toString() ?? "",
    startsAt: toLocalInput(promo.startsAt),
    endsAt: toLocalInput(promo.endsAt),
    active: promo.active,
  };
}

function PromoDialog({ promo, onClose, onSaved }: { promo: AdminPromoCode | "new" | null; onClose: () => void; onSaved: (promo: AdminPromoCode, created: boolean) => void }) {
  const open = promo !== null;
  const isNew = promo === "new";
  const current = promo !== null && promo !== "new" ? promo : null;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (promo === null) return;
    setForm(promo === "new" ? EMPTY : fromPromo(promo));
    setErrors({});
    setError(null);
  }, [promo]);

  const save = useMutation({
    mutationFn: (body: PromoCodeBody) => (current ? getAdminApiClient().updatePromo(current.id, body) : getAdminApiClient().createPromo(body)),
    onSuccess: (saved) => onSaved(saved, isNew),
    onError: (err) => setError((err as Error).message),
  });

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = promoCodeInputSchema.safeParse(form);
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>;
      setErrors(Object.fromEntries(Object.entries(fieldErrors).map(([k, v]) => [k, v?.[0] ?? "Invalid"])));
      return;
    }
    setErrors({});
    const v = parsed.data;
    save.mutate({
      code: v.code.toUpperCase(),
      type: v.type,
      value: v.value,
      minOrder: v.minOrder,
      maxUses: v.maxUses ?? null,
      perUserLimit: v.perUserLimit ?? null,
      startsAt: v.startsAt ? new Date(v.startsAt).toISOString() : null,
      endsAt: v.endsAt ? new Date(v.endsAt).toISOString() : null,
      active: v.active,
    });
  };

  const field = (key: keyof FormState, label: string, input: React.ReactNode, hint?: string) => (
    <label className="block" htmlFor={`promo-${key}`}>
      <span className="text-body-sm text-ink-muted block mb-xs">{label}</span>
      {input}
      {errors[key] ? (
        <span className="block text-xs text-danger mt-xs" role="alert">{errors[key]}</span>
      ) : hint ? (
        <span className="block text-xs text-ink-muted mt-xs">{hint}</span>
      ) : null}
    </label>
  );

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="p-lg">
        <form onSubmit={submit} className="space-y-md" noValidate>
          <DialogTitle>{isNew ? "New promo code" : `Edit ${current?.code ?? ""}`}</DialogTitle>
          <DialogDescription>Percent codes take a percentage off the subtotal; fixed codes take a dollar amount off. Limits and dates are optional.</DialogDescription>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            {field("code", "Code", <Input id="promo-code" value={form.code} onChange={(e) => set("code", e.target.value.toUpperCase())} maxLength={40} autoCapitalize="characters" />, "3–40 letters, digits, dashes or underscores.")}
            {field(
              "type",
              "Discount type",
              <select id="promo-type" className={SELECT} value={form.type} onChange={(e) => set("type", e.target.value as FormState["type"])}>
                <option value="PERCENT">Percent off</option>
                <option value="FIXED">Fixed amount off</option>
              </select>,
            )}
            {field("value", form.type === "PERCENT" ? "Percent" : "Amount (USD)", <Input id="promo-value" type="number" inputMode="decimal" min={0.01} step={0.01} max={form.type === "PERCENT" ? 100 : 100000} value={form.value} onChange={(e) => set("value", e.target.value)} />)}
            {field("minOrder", "Minimum order (USD)", <Input id="promo-minOrder" type="number" inputMode="decimal" min={0} step={0.01} value={form.minOrder} onChange={(e) => set("minOrder", e.target.value)} />, "0 for no minimum.")}
            {field("maxUses", "Total uses", <Input id="promo-maxUses" type="number" inputMode="numeric" min={1} step={1} value={form.maxUses} onChange={(e) => set("maxUses", e.target.value)} placeholder="Unlimited" />)}
            {field("perUserLimit", "Uses per customer", <Input id="promo-perUserLimit" type="number" inputMode="numeric" min={1} step={1} value={form.perUserLimit} onChange={(e) => set("perUserLimit", e.target.value)} placeholder="Unlimited" />)}
            {field("startsAt", "Starts", <Input id="promo-startsAt" type="datetime-local" value={form.startsAt} onChange={(e) => set("startsAt", e.target.value)} />, "Leave empty to start now.")}
            {field("endsAt", "Ends", <Input id="promo-endsAt" type="datetime-local" value={form.endsAt} onChange={(e) => set("endsAt", e.target.value)} />, "Leave empty for no end.")}
          </div>

          <label className="flex items-center gap-sm text-body-sm text-ink" htmlFor="promo-active">
            <input id="promo-active" type="checkbox" className="h-4 w-4 accent-strong-accent" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
            Active
          </label>

          {error && <p role="alert" className="text-body-sm text-danger">{error}</p>}

          <div className="flex justify-end gap-sm">
            <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={save.isPending} data-testid="promo-submit">{save.isPending ? "Saving…" : isNew ? "Create code" : "Save changes"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
