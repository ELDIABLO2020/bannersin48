"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MailCheck, AlertCircle } from "lucide-react";
import { safeReturnUrl } from "@/lib/auth/return-url";

const forgotSchema = z.object({
  email: z.string().email("Enter a valid email."),
});

type ForgotInput = z.infer<typeof forgotSchema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnUrl(safeReturnUrl(params.get("next")));
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotInput>({
    resolver: zodResolver(forgotSchema),
  });

  async function onSubmit(values: ForgotInput) {
    setSubmitError(null);
    try {
      await getApiClient().forgotPassword(values);
      setSubmitted(true);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  return (
    <div
      className="min-h-[80vh] flex items-center justify-center px-md py-3xl"
      style={{ backgroundColor: "var(--color-bg-soft-accent)" }}
    >
      <Card variant="default" className="bg-surface w-full max-w-md">
        <h1 className="font-display text-section-h2 text-ink leading-tight">Reset your password</h1>
        <p className="text-body-sm text-ink-muted mt-xs">
          Enter the email for your account and we&apos;ll send you a password reset link.
        </p>

        {submitted ? (
          <div className="mt-xl">
            <div role="status" className="flex items-start gap-sm p-md rounded-feature bg-info-tint">
              <MailCheck className="h-5 w-5 text-link shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-ink">
                If an account exists for that email, a reset link is on its way. The link expires in
                one hour.
              </p>
            </div>
            <div className="mt-lg">
              <Link
                href={`/login${returnUrl !== "/dashboard" ? `?next=${encodeURIComponent(returnUrl)}` : ""}`}
                className="inline-flex items-center gap-xs text-body-sm text-link hover:underline"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden /> Back to log in
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md">
            <label className="block">
              <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
              <Input
                type="email"
                autoComplete="email"
                {...register("email")}
                invalid={!!errors.email}
              />
              {errors.email && <p className="text-body-sm text-danger mt-xs">{errors.email.message}</p>}
            </label>
            {submitError && (
              <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
                <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
                <p className="text-sm text-ink">{submitError}</p>
              </div>
            )}
            <Button type="submit" variant="cta" size="block" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Sending…" : "Send reset link"}
            </Button>
            <p className="text-body-sm text-ink-muted text-center">
              Remembered it?{" "}
              <Link
                href={`/login${returnUrl !== "/dashboard" ? `?next=${encodeURIComponent(returnUrl)}` : ""}`}
                className="text-link hover:underline"
              >
                Log in
              </Link>
            </p>
          </form>
        )}
      </Card>
    </div>
  );
}
