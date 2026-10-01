"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { savedAddressInputSchema, type SavedAddress, type SavedAddressInput } from "@bannersin48/shared";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/** Address book entry form (plan §4.3). The parent runs `address/validate` before saving. */
export function AddressForm({
  initial,
  busy,
  error,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial?: SavedAddress;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  onSubmit: (values: SavedAddressInput) => void;
  onCancel: () => void;
}) {
  const { register, handleSubmit, formState: { errors } } = useForm<SavedAddressInput>({
    resolver: zodResolver(savedAddressInputSchema),
    defaultValues: {
      label: initial?.label ?? "",
      line1: initial?.line1 ?? "",
      line2: initial?.line2 ?? "",
      city: initial?.city ?? "",
      state: initial?.state ?? "",
      zip: initial?.zip ?? "",
      country: "US",
      isDefaultShipping: initial?.isDefaultShipping ?? false,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-md" data-testid="address-form">
      <label className="block">
        <span className="mb-xs block text-body-sm text-ink-muted">Label (optional)</span>
        <Input placeholder="Shop, Home, Event venue…" invalid={!!errors.label} {...register("label")} />
      </label>
      <label className="block">
        <span className="mb-xs block text-body-sm text-ink-muted">Street address</span>
        <Input autoComplete="address-line1" invalid={!!errors.line1} {...register("line1")} />
        {errors.line1 && <p className="mt-xs text-body-sm text-danger">{errors.line1.message}</p>}
      </label>
      <label className="block">
        <span className="mb-xs block text-body-sm text-ink-muted">Apartment, suite, etc. (optional)</span>
        <Input autoComplete="address-line2" invalid={!!errors.line2} {...register("line2")} />
      </label>
      <div className="grid grid-cols-1 gap-md sm:grid-cols-[1fr_6rem_8rem]">
        <label className="block">
          <span className="mb-xs block text-body-sm text-ink-muted">City</span>
          <Input autoComplete="address-level2" invalid={!!errors.city} {...register("city")} />
          {errors.city && <p className="mt-xs text-body-sm text-danger">{errors.city.message}</p>}
        </label>
        <label className="block">
          <span className="mb-xs block text-body-sm text-ink-muted">State</span>
          <Input autoComplete="address-level1" maxLength={2} className="uppercase" invalid={!!errors.state} {...register("state")} />
          {errors.state && <p className="mt-xs text-body-sm text-danger">{errors.state.message}</p>}
        </label>
        <label className="block">
          <span className="mb-xs block text-body-sm text-ink-muted">ZIP</span>
          <Input autoComplete="postal-code" inputMode="numeric" invalid={!!errors.zip} {...register("zip")} />
          {errors.zip && <p className="mt-xs text-body-sm text-danger">{errors.zip.message}</p>}
        </label>
      </div>
      <label className="flex items-center gap-sm text-body-sm text-ink">
        <input type="checkbox" className="h-5 w-5 accent-strong-accent" {...register("isDefaultShipping")} />
        Use as my default shipping address
      </label>
      <p className="text-xs text-ink-muted">US addresses only. We normalize the address before saving it.</p>
      {error && <p role="alert" className="rounded-feature bg-badge-error-bg p-md text-body-sm text-danger">{error}</p>}
      <div className="flex justify-end gap-sm">
        <Button type="button" variant="secondary" size="md" onClick={onCancel} disabled={busy}>
          Cancel
        </Button>
        <Button type="submit" variant="cta" size="md" disabled={busy} data-testid="address-submit">
          {busy ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
