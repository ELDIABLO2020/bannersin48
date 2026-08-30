"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getApiClient } from "@/lib/api/client";
import type { CreateOrderInput } from "@bannersin48/api-client";
import { useAuth } from "@/lib/stores/auth";
import { useCart, cartTotals, canCheckout } from "@/lib/stores/cart";
import { revalidateQuotes } from "@/lib/cart/requote";
import { addressSchema, PRODUCTS, productIdForMaterial, type ProductId } from "@bannersin48/shared";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatUsd } from "@/lib/utils/format";
import { ChevronRight, AlertCircle } from "lucide-react";
import { CountdownCard } from "@/components/home/CountdownCard";
import { ArtworkReview } from "@/components/cart/ArtworkReview";

type Address = z.infer<typeof addressSchema>;

const US_STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY","DC"];

const FIELD_ORDER = ["fullName", "email", "street1", "city", "region", "postalCode"] as const;

const ACKNOWLEDGEMENTS = [
  ["artworkCorrect", "I confirm the uploaded file and the configured dimensions, material, and finishing are correct."],
  ["spellingColorsLayoutAccepted", "I accept the spelling, colors, and layout of the uploaded file as it will print."],
  ["printsAsUploaded", "I understand the platform prints the uploaded file exactly as provided — no designer proof or correction is created."],
  ["cancellationWindowUnderstood", "I understand orders that are paid or in production cannot be cancelled online."],
  ["deliveryDateAndAddressConfirmed", "I understand delivery timing begins only after order submission and payment confirmation, and I confirm the shipping address above."],
] as const;

function generateIdempotencyKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 12)}`;
}

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
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [idempotencyKey] = useState(() => generateIdempotencyKey());
  const summaryRef = useRef<HTMLDivElement | null>(null);

  const { register, handleSubmit, watch, setFocus, formState: { errors, isSubmitting } } = useForm<Address>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      fullName: auth.user?.fullName ?? "",
      email: auth.user?.email ?? "",
      country: "US",
    },
  });

  // Revalidate expired quotes when checkout loads (P0-01 / Wave 3).
  useEffect(() => {
    void revalidateQuotes();
  }, []);

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

  // Authenticated artwork library — resolves every line's uploaded file for the
  // uploaded-file review (Wave 4). Requires an account (D5).
  const artworkLibrary = useQuery({
    queryKey: ["artwork", "library"],
    queryFn: () => getApiClient().listArtwork(),
    enabled: !!auth.user,
    retry: 2,
  });
  const artworkById = useMemo(
    () => new Map((artworkLibrary.data ?? []).map((a) => [a.id, a])),
    [artworkLibrary.data],
  );
  const artworkMissing = lines.some((l) => !artworkById.has(l.artworkId));

  const createOrder = useMutation({
    mutationFn: async (a: Address) => {
      const input = {
        email: auth.user?.email ?? a.email ?? "guest@bannersin48.com",
        idempotencyKey,
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
      };
      const order = await getApiClient().createOrder(input as CreateOrderInput);
      return order;
    },
    onSuccess: (order) => {
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      router.push(`/orders/${order.id}`);
    },
    onError: (err) => setSubmitErrors([(err as Error).message]),
  });

  if (lines.length === 0) {
    return (
      <div className="bg-surface-tint min-h-[60vh] flex items-center justify-center p-md">
        <div className="bg-surface rounded-card p-3xl text-center max-w-md">
          <h1 className="font-display text-section-h2 text-ink">Your cart is empty</h1>
          <Link href="/order" className="inline-block mt-md bg-cta text-cta-fg rounded-btn px-2xl py-sm font-bold no-underline hover:bg-cta-hover">
            Start an order
          </Link>
        </div>
      </div>
    );
  }

  const totals = cartTotals(lines);

  function onValid(a: Address) {
    const errs: string[] = [];
    if (!canCheckout(lines)) {
      errs.push("Prices are still updating — wait for every line to have a confirmed quote before submitting.");
    }
    if (!validate.data?.validationToken) {
      errs.push("Wait for address normalization before continuing.");
    }
    if (!riskAck) {
      errs.push("Please acknowledge the unverified-address risk before continuing.");
    }
    if (!Object.values(acknowledgements).every(Boolean)) {
      errs.push("Confirm every uploaded-artwork and delivery acknowledgement.");
    }
    if (artworkLibrary.isError) {
      errs.push("We couldn't load your uploaded files — retry before submitting.");
    }
    if (!artworkLibrary.isPending && !artworkLibrary.isError && artworkMissing) {
      errs.push("One or more uploaded files are no longer available — return to the builder to re-select them.");
    }
    if (errs.length > 0) {
      setSubmitErrors(errs);
      summaryRef.current?.focus();
      return;
    }
    setSubmitErrors([]);
    createOrder.mutate(validate.data!.normalized);
  }

  function onInvalid(fieldErrors: FieldErrors<Address>) {
    const first = FIELD_ORDER.find((k) => fieldErrors[k]);
    if (first) setFocus(first);
  }

  const zodMessages = FIELD_ORDER.map((k) => errors[k]?.message).filter((m): m is string => Boolean(m));
  const summary = [...zodMessages, ...submitErrors];

  const reviewReady =
    !!auth.user && !artworkLibrary.isPending && !artworkLibrary.isError && !artworkMissing;
  const submitDisabled =
    isSubmitting ||
    createOrder.isPending ||
    !auth.user ||
    !canCheckout(lines) ||
    !reviewReady ||
    !validate.data?.validationToken ||
    !riskAck ||
    !Object.values(acknowledgements).every(Boolean);

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
            onSubmit={handleSubmit(onValid, onInvalid)}
            noValidate
            className="lg:col-span-7 space-y-lg"
          >
            {summary.length > 0 && (
              <div
                id="checkout-error-summary"
                ref={summaryRef}
                tabIndex={-1}
                role="alert"
                className="rounded-card bg-badge-error-bg p-md focus:outline-none focus-visible:ring-2 focus-visible:ring-strong-accent"
              >
                <p className="font-bold text-ink flex items-center gap-xs">
                  <AlertCircle className="h-4 w-4 text-danger shrink-0" aria-hidden />
                  Please fix the following before submitting:
                </p>
                <ul className="list-disc pl-md mt-xs text-sm text-ink">
                  {summary.map((m, i) => (
                    <li key={i}>{m}</li>
                  ))}
                </ul>
              </div>
            )}

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

            {/* Uploaded-file review (Wave 4) */}
            {auth.user ? (
              <Card className="bg-surface">
                <ArtworkReview
                  lines={lines}
                  artworkById={artworkById}
                  loading={artworkLibrary.isPending}
                  error={artworkLibrary.isError}
                  onRetry={() => void artworkLibrary.refetch()}
                />
              </Card>
            ) : (
              <Card className="bg-info-tint">
                <h2 className="font-bold text-heading-h4 text-ink mb-sm">Review uploaded artwork</h2>
                <p className="text-body-sm text-ink-muted">
                  Sign in to review the exact files we will print.
                </p>
              </Card>
            )}

            {/* Address */}
            <Card className="bg-surface">
              <h2 className="font-bold text-heading-h4 text-ink mb-md">Shipping address</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
                <Field label="Full name" error={errors.fullName?.message} errorId="fullName-error">
                  <Input autoComplete="name" {...register("fullName")} invalid={!!errors.fullName} aria-describedby={errors.fullName ? "fullName-error" : undefined} />
                </Field>
                <Field label="Email" error={errors.email?.message} errorId="email-error">
                  <Input type="email" autoComplete="email" {...register("email")} invalid={!!errors.email} aria-describedby={errors.email ? "email-error" : undefined} />
                </Field>
                <Field label="Street address" error={errors.street1?.message} errorId="street1-error" full>
                  <Input autoComplete="address-line1" {...register("street1")} invalid={!!errors.street1} aria-describedby={errors.street1 ? "street1-error" : undefined} />
                </Field>
                <Field label="Apt / Suite (optional)" full>
                  <Input autoComplete="address-line2" {...register("street2")} />
                </Field>
                <Field label="City" error={errors.city?.message} errorId="city-error">
                  <Input autoComplete="address-level2" {...register("city")} invalid={!!errors.city} aria-describedby={errors.city ? "city-error" : undefined} />
                </Field>
                <Field label="State" error={errors.region?.message} errorId="region-error">
                  <select
                    autoComplete="address-level1"
                    {...register("region")}
                    aria-invalid={!!errors.region || undefined}
                    aria-describedby={errors.region ? "region-error" : undefined}
                    className="w-full h-10 rounded-pill border border-line-input px-md text-ink bg-surface focus:outline-none focus:border-link focus:shadow-focus"
                  >
                    <option value="">Select…</option>
                    {US_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="ZIP code" error={errors.postalCode?.message} errorId="postalCode-error">
                  <Input autoComplete="postal-code" {...register("postalCode")} invalid={!!errors.postalCode} aria-describedby={errors.postalCode ? "postalCode-error" : undefined} />
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
                Submitting this order does not collect payment. Staff will provide manual-payment instructions and record confirmation on the order.
              </p>
              <p className="text-body-sm text-ink-muted mt-sm">
                <strong className="text-ink">Delivery is not committed until the order is submitted and manual payment is confirmed.</strong>{" "}
                The committed delivery date appears on the order once payment is recorded.
              </p>
            </Card>

            {/* Versioned consent (the existing acknowledgements, moved to the review step) */}
            <Card className="bg-surface">
              <fieldset>
                <legend className="font-bold text-heading-h4 text-ink mb-md">
                  Confirm your uploaded artwork and order
                </legend>
                <div className="space-y-sm">
                  {ACKNOWLEDGEMENTS.map(([key, label]) => (
                    <label key={key} className="flex items-start gap-sm text-body-sm text-ink cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={acknowledgements[key]}
                        onChange={(e) => setAcknowledgements((current) => ({ ...current, [key]: e.target.checked }))}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </Card>

            <Button
              type="submit"
              variant="cta"
              size="lg"
              disabled={submitDisabled}
              className="w-full"
            >
              {createOrder.isPending
                ? "Submitting order…"
                : !canCheckout(lines)
                  ? "Updating prices…"
                  : `Submit order · ${formatUsd(totals.total)} USD`}
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
                <Row label="Product" value={formatUsd(totals.subtotal)} />
                <Row label="Shipping" value={formatUsd(totals.shipping)} />
                <Row label="Tax" value={formatUsd(totals.tax)} />
                <div className="border-t border-line my-sm" />
                <Row label="Total" value={`${formatUsd(totals.total)} USD`} bold />
              </dl>
              <p className="text-body-sm text-ink-muted mt-sm">
                Tax is $0.00 in this internal test environment — no sales tax is calculated yet.
              </p>
              <CountdownCard variant="inline" />
              <p className="text-body-sm text-ink-muted mt-sm">
                The date above is an estimate. Your committed delivery date is set once payment is
                confirmed.
              </p>
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
  errorId,
  children,
  full,
}: {
  label: string;
  error?: string;
  errorId?: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <span className="text-body-sm text-ink-muted block mb-xs">{label}</span>
      {children}
      {error && <p id={errorId} className="text-body-sm text-danger mt-xs">{error}</p>}
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
