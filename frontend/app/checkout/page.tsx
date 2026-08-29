"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { useCart, cartTotals } from "@/lib/stores/cart";
import { addressSchema, PRODUCTS, productIdForMaterial, type ProductId } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { ChevronRight, AlertCircle } from "lucide-react";
import { CountdownCard } from "@/components/home/CountdownCard";

type Address = z.infer<typeof addressSchema>;

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];
export default function CheckoutPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const auth = useAuth();
  const lines = useCart((s) => s.lines);
  const clearCart = useCart((s) => s.clear);
  const [riskAck, setRiskAck] = useState(false);
  const [acknowledgements, setAcknowledgements] = useState({
    artworkCorrect: false,
    spellingColorsLayoutAccepted: false,
    printsAsUploaded: false,
    cancellationWindowUnderstood: false,
    deliveryDateAndAddressConfirmed: false,
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: auth.user?.fullName ?? "",
      email: auth.user?.email ?? "",
      country: "US",
    },
  });

  // Validate the current US address through the authenticated API.
  const validate = useMutation({
    mutationFn: (a: Address) => getApiClient().validateAddress(a),
  });

  const watchAll = watch();
  useEffect(() => {
    setRiskAck(false);
    validate.reset();
    if (!auth.user || !watchAll.street1 || !watchAll.city || !watchAll.region || !watchAll.postalCode) return;
    const t = setTimeout(() => validate.mutate(watchAll as Address), 600);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user, watchAll.street1, watchAll.street2, watchAll.city, watchAll.region, watchAll.postalCode, watchAll.country]);

  const createOrder = useMutation({
    mutationFn: async (a: Address) => {
      const order = await getApiClient().createOrder({
        email: auth.user?.email ?? a.email ?? "guest@bannersin48.com",
        lines: lines.map((l) => ({
          productId: l.productId,
          material: l.material,
          dimensions: l.dimensions,
          finishing: l.finishing,
          quantity: l.quantity,
          artworkId: l.artworkId,
          quoteId: l.quoteId,
        })),
        shipTo: a,
        addressValidationToken: validate.data?.validationToken ?? "",
        addressRiskAcknowledged: riskAck,
        acknowledgements,
      });
      return order;
    },
    onSuccess: (order) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/orders/${order.id}`);
    },
    onError: (err) => setSubmitError((err as Error).message),
  });

  if (lines.length === 0) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center p-md">
        <div className="bg-surface rounded-card p-3xl text-center max-w-md">
          <p className="font-display text-section-h2 text-ink">Your cart is empty</p>
          <Link href="/order" className="inline-block mt-md bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover">
            Start an order
          </Link>
        </div>
      </div>
    );
  }

  const totals = cartTotals(lines);

  return (
    <div className="bg-surface-tint min-h-[60vh]">
      <div className="mx-auto max-w-content px-md lg:px-2xl py-xl">
        <nav className="text-body-sm text-ink-muted mb-md" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-link no-underline">Home</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <Link href="/cart" className="hover:text-link no-underline">Cart</Link>
          <ChevronRight className="inline h-3 w-3 mx-1" aria-hidden />
          <span aria-current="page">Checkout</span>
        </nav>
        <h1 className="font-display text-section-h2 text-ink leading-section-h2 mb-md">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-xl">
          <form
            onSubmit={handleSubmit((a) => {
              if (!validate.data?.validationToken) {
                setSubmitError("Wait for address normalization before continuing.");
                return;
              }
              if (!riskAck) {
                setSubmitError("Please acknowledge the unverified-address risk before continuing.");
                return;
              }
              createOrder.mutate(validate.data.normalized);
            })}
            className="lg:col-span-7 space-y-lg"
          >
            {/* Auth gate */}
            {!auth.user && (
              <Card className="bg-info-tint">
                <h2 className="font-bold text-heading-h4 text-ink mb-sm">Sign in to place your order</h2>
                <p className="text-body-sm text-ink-muted">
                  We require an account to checkout. Saved artwork, reorders, and FedEx tracking included.
                </p>
                <div className="flex gap-sm mt-md">
                  <Link href="/login?next=%2Fcheckout" className="flex-1">
                    <Button type="button" variant="cta" size="block" className="w-full">Log in</Button>
                  </Link>
                  <Link href="/register?next=%2Fcheckout" className="flex-1">
                    <Button type="button" variant="secondary" size="block" className="w-full">Create account</Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* Address */}
            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Shipping address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <Field label="Full name" error={errors.fullName?.message}>
                  <Input autoComplete="name" {...register("fullName")} invalid={!!errors.fullName} />
                </Field>
                <Field label="Email" error={errors.email?.message}>
                  <Input type="email" autoComplete="email" {...register("email")} invalid={!!errors.email} />
                </Field>
                <Field label="Street address" error={errors.street1?.message} full>
                  <Input autoComplete="address-line1" {...register("street1")} invalid={!!errors.street1} />
                </Field>
                <Field label="Apt / Suite (optional)" full>
                  <Input autoComplete="address-line2" {...register("street2")} />
                </Field>
                <Field label="City" error={errors.city?.message}>
                  <Input autoComplete="address-level2" {...register("city")} invalid={!!errors.city} />
                </Field>
                <Field label="State" error={errors.region?.message}>
                  <select
                    autoComplete="address-level1"
                    {...register("region")}
                    className="w-full h-10 rounded-pill border border-line-input px-md text-ink bg-surface focus:outline-none focus:border-link focus:shadow-focus"
                  >
                    <option value="">Select…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="ZIP code" error={errors.postalCode?.message}>
                  <Input autoComplete="postal-code" {...register("postalCode")} invalid={!!errors.postalCode} />
                </Field>
                <Field label="Country">
                  <input type="hidden" {...register("country")} />
                  <p className="h-10 flex items-center px-md rounded-pill border border-line-input bg-surface-tint text-ink">
                    United States
                  </p>
                </Field>
                <Field label="Phone (optional)">
                  <Input type="tel" autoComplete="tel" {...register("phone")} />
                </Field>
              </div>

              {validate.data && (
                <div
                  className={`mt-md flex items-start gap-sm p-md rounded-feature ${
                    validate.data.valid ? "bg-success-bg" : "bg-warning-bg"
                  }`}
                >
                  <AlertCircle className="h-5 w-5 text-warning-fg shrink-0 mt-0.5" aria-hidden />
                  <p className="text-sm text-ink">{validate.data.message}</p>
                </div>
              )}

              {validate.data?.requiresAcknowledgement && (
                <label className="mt-md flex items-start gap-sm cursor-pointer">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={riskAck}
                    onChange={(e) => setRiskAck(e.target.checked)}
                  />
                  <span className="text-sm text-ink">
                    I reviewed the normalized address and accept the shipping risk because it has not been verified by an external provider.
                  </span>
                </label>
              )}
            </Card>

            {/* Manual payment operating model */}
            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Manual payment</h2>
              <p className="text-body-sm text-ink-muted">
                Submitting this order does not collect payment. Staff will provide manual-payment instructions and record confirmation on the order. Delivery timing begins only after both order submission and payment confirmation.
              </p>
            </Card>

            {/* Liability / proof acknowledgements — persisted in proof_* columns. */}
            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Final acknowledgements</h2>
              <div className="space-y-sm">
                {([
                  ["artworkCorrect", "The artwork file and dimensions are correct."],
                  ["spellingColorsLayoutAccepted", "I accept the spelling, colors, and layout as uploaded."],
                  ["printsAsUploaded", "I understand the artwork prints exactly as uploaded."],
                  ["cancellationWindowUnderstood", "I understand paid/in-production orders cannot be cancelled online."],
                  ["deliveryDateAndAddressConfirmed", "I confirm the delivery date and shipping address above."],
                ] as const).map(([key, label]) => (
                  <label key={key} className="flex items-start gap-sm text-body-sm text-ink cursor-pointer">
                    <input type="checkbox" className="mt-1" checked={acknowledgements[key]} onChange={(e) => setAcknowledgements((current) => ({ ...current, [key]: e.target.checked }))} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
            </Card>

            {submitError && (
              <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
                <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-ink">{submitError}</p>
              </div>
            )}

            <Button
              type="submit"
              variant="cta"
              size="lg"
              disabled={isSubmitting || createOrder.isPending || !auth.user || !validate.data?.validationToken || !riskAck || !Object.values(acknowledgements).every(Boolean)}
              className="w-full"
            >
              {createOrder.isPending ? "Submitting order…" : `Submit order · ${formatUsd(totals.total)} USD`}
            </Button>
            {!auth.user && (
              <p className="text-body-sm text-ink-muted text-center">
                Sign in above to enable order submission.
              </p>
            )}
          </form>

          <aside className="lg:col-span-5 space-y-md">
            <Card className="bg-surface sticky top-20">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Order summary</h2>
              <ul className="text-sm space-y-sm mb-md">
                {lines.map((l) => {
                  const productId: ProductId =
                    (l.productId as ProductId | undefined) ?? productIdForMaterial(l.material);
                  return (
                  <li key={l.id} className="flex justify-between gap-sm">
                    <span className="text-ink">
                      {PRODUCTS[productId].title} · {l.display.billableLabel}{" "}
                      <span className="text-ink-muted">× {l.quantity}</span>
                    </span>
                    <span className="text-ink tabular-nums">{formatUsd(l.totalBeforeTax)}</span>
                  </li>
                  );
                })}
              </ul>
              <dl className="text-sm space-y-xs">
                <Row label="Subtotal" value={formatUsd(totals.subtotal)} />
                <Row label="Shipping" value={formatUsd(totals.shipping)} />
                <div className="border-t border-line my-sm" />
                <Row label="Internal test total" value={`${formatUsd(totals.total)} USD`} bold />
              </dl>
              <CountdownCard variant="inline" />
            </Card>
          </aside>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
  full,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-body-sm text-ink-muted block mb-xs">{label}</span>
      {children}
      {error && <p className="text-body-sm text-danger mt-xs">{error}</p>}
    </label>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-ink" : "text-ink-muted"}`}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{value}</dd>
    </div>
  );
}
