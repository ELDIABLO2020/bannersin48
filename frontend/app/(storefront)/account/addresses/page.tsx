"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SavedAddress, SavedAddressInput } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { AddressForm } from "@/components/account/AddressForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type Editing = { mode: "create" } | { mode: "edit"; address: SavedAddress } | null;

/**
 * Normalizes through `POST /address/validate` (the same check checkout runs)
 * and saves the normalized fields. No external provider exists in V1, so the
 * result is syntax-normalized rather than verified; that is fine for a book.
 */
async function normalizeAndSave(values: SavedAddressInput, fullName: string, save: (v: SavedAddressInput) => Promise<SavedAddress>) {
  const api = getApiClient();
  const result = await api.validateAddress({
    fullName: fullName.length >= 2 ? fullName : "Customer",
    street1: values.line1,
    street2: values.line2 || "",
    city: values.city,
    region: values.state.toUpperCase(),
    postalCode: values.zip,
    country: "US",
  });
  const n = result.normalized;
  return save({ ...values, line1: n.street1, line2: n.street2 || "", city: n.city, state: n.region, zip: n.postalCode, country: "US" });
}

export default function AccountAddressesPage() {
  const qc = useQueryClient();
  const fullName = useAuth((s) => s.user?.fullName ?? "");
  const addresses = useQuery({ queryKey: ["account", "addresses"], queryFn: () => getApiClient().listAddresses() });
  const [editing, setEditing] = useState<Editing>(null);
  const [deleting, setDeleting] = useState<SavedAddress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const refresh = async () => {
    await Promise.all([qc.invalidateQueries({ queryKey: ["account", "addresses"] }), qc.invalidateQueries({ queryKey: ["account", "profile"] })]);
  };

  const save = useMutation({
    mutationFn: (values: SavedAddressInput) =>
      normalizeAndSave(values, fullName, (v) =>
        editing?.mode === "edit" ? getApiClient().updateAddress(editing.address.id, v) : getApiClient().createAddress(v),
      ),
    onSuccess: async () => {
      setNotice(editing?.mode === "edit" ? "Address updated." : "Address added.");
      setEditing(null);
      setError(null);
      await refresh();
    },
    onError: (err) => setError((err as Error).message),
  });
  const makeDefault = useMutation({
    mutationFn: (id: string) => getApiClient().setDefaultAddress(id),
    onSuccess: async () => {
      setNotice("Default shipping address updated.");
      await refresh();
    },
    onError: (err) => setNotice((err as Error).message),
  });
  const remove = useMutation({
    mutationFn: (id: string) => getApiClient().deleteAddress(id),
    onSuccess: async () => {
      setDeleting(null);
      setNotice("Address removed.");
      await refresh();
    },
    onError: (err) => setNotice((err as Error).message),
  });

  if (addresses.isLoading) return <p className="text-ink-muted" role="status">Loading addresses…</p>;
  const rows = addresses.data ?? [];

  return (
    <div className="space-y-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <p className="text-body-sm text-ink-muted">{rows.length === 0 ? "No saved addresses yet." : `${rows.length} saved address${rows.length === 1 ? "" : "es"}.`}</p>
        <Button type="button" variant="cta" size="md" onClick={() => { setError(null); setEditing({ mode: "create" }); }} data-testid="address-add">
          Add address
        </Button>
      </div>
      {notice && <p role="status" className="text-body-sm text-ink-muted" data-testid="address-notice">{notice}</p>}

      {rows.length > 0 && (
        <ul className="grid grid-cols-1 gap-md md:grid-cols-2" data-testid="address-list">
          {rows.map((address) => (
            <li key={address.id} className="flex flex-col rounded-card border border-line bg-surface p-lg">
              <div className="flex items-start justify-between gap-sm">
                <p className="font-bold text-body text-ink">{address.label || "Address"}</p>
                {address.isDefaultShipping && <Badge variant="success">Default</Badge>}
              </div>
              <address className="mt-xs not-italic text-body-sm text-ink">
                {address.line1}
                {address.line2 ? <><br />{address.line2}</> : null}
                <br />
                {address.city}, {address.state} {address.zip}
              </address>
              <div className="mt-md flex flex-wrap gap-sm">
                <Button type="button" variant="secondary" size="sm" onClick={() => { setError(null); setEditing({ mode: "edit", address }); }}>
                  Edit
                </Button>
                {!address.isDefaultShipping && (
                  <Button type="button" variant="ghost" size="sm" disabled={makeDefault.isPending} onClick={() => makeDefault.mutate(address.id)}>
                    Make default
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" onClick={() => setDeleting(address)}>
                  Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent>
          <DialogTitle>{editing?.mode === "edit" ? "Edit address" : "Add an address"}</DialogTitle>
          <DialogDescription className="mt-xs">Where should we ship your banners?</DialogDescription>
          <div className="mt-lg">
            {editing && (
              <AddressForm
                key={editing.mode === "edit" ? editing.address.id : "new"}
                initial={editing.mode === "edit" ? editing.address : undefined}
                busy={save.isPending}
                error={error}
                submitLabel={editing.mode === "edit" ? "Save address" : "Add address"}
                onSubmit={(values) => save.mutate(values)}
                onCancel={() => setEditing(null)}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => { if (!open) setDeleting(null); }}
        title="Remove this address?"
        description={deleting ? `${deleting.line1}, ${deleting.city} will be removed from your address book. Orders already placed keep their shipping address.` : undefined}
        confirmLabel="Remove address"
        destructive
        busy={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
