"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiClient } from "@/lib/api/client";
import { Card } from "@/components/ui/card";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { AlertCircle, KeyRound, CheckCircle2 } from "lucide-react";

const formSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirm: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.password === data.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

type ResetForm = z.infer<typeof formSchema>;

export default function ResetPasswordPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setTokenChecked(true);
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(formSchema),
  });

  async function onSubmit(values: ResetForm) {
    if (!token) {
      setSubmitError("This reset link is missing its token.");
      return;
    }
    setSubmitError(null);
    try {
      await getApiClient().resetPassword({ token, password: values.password });
      setDone(true);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  if (!tokenChecked) return null;

  if (!token) {
    return (
      <div
        className="flex items-start justify-center px-md py-3xl"
      >
        <Card className="bg-surface w-full max-w-md">
          <h1 className="font-display text-section-h2 text-ink leading-tight">Reset link missing</h1>
          <p className="text-body-sm text-ink-muted mt-xs">
            This page needs a token from a password reset email.
          </p>
          <div className="mt-lg">
            <Link href="/forgot-password" className="text-body-sm text-link hover:underline">
              Request a new reset link
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div
        className="flex items-start justify-center px-md py-3xl"
      >
        <Card className="bg-surface w-full max-w-md">
          <div role="status" className="flex items-start gap-sm p-md rounded-feature bg-info-tint">
            <CheckCircle2 className="h-5 w-5 text-link shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-ink">
              Your password has been reset. You can now log in with your new password.
            </p>
          </div>
          <Button
            type="button"
            variant="cta"
            size="block"
            className="w-full mt-lg"
            onClick={() => router.push("/login")}
          >
            Log in
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="flex items-start justify-center px-md py-3xl"
    >
      <Card className="bg-surface w-full max-w-md">
        <h1 className="font-display text-section-h2 text-ink leading-tight">Choose a new password</h1>
        <p className="text-body-sm text-ink-muted mt-xs">
          Pick a new password for your account.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md">
          <div>
            <label htmlFor="reset-password" className="text-body-sm text-ink-muted block mb-xs">
              New password
            </label>
            <PasswordField autoComplete="new-password" id="reset-password" invalid={!!errors.password} {...register("password")} />
            {errors.password && <p className="text-body-sm text-danger mt-xs">{errors.password.message}</p>}
          </div>
          <div>
            <label htmlFor="reset-confirm" className="text-body-sm text-ink-muted block mb-xs">
              Confirm new password
            </label>
            <PasswordField autoComplete="new-password" id="reset-confirm" invalid={!!errors.confirm} {...register("confirm")} />
            {errors.confirm && <p className="text-body-sm text-danger mt-xs">{errors.confirm.message}</p>}
          </div>
          {submitError && (
            <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-ink">{submitError}</p>
            </div>
          )}
          <Button type="submit" variant="cta" size="block" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Resetting…" : "Reset password"}
          </Button>
          <p className="text-body-sm text-ink-muted text-center">
            <KeyRound className="inline h-3 w-3" aria-hidden /> Still having trouble?{" "}
            <Link href="/forgot-password" className="text-link hover:underline">
              Request a new link
            </Link>
          </p>
        </form>
      </Card>
    </div>
  );
}
