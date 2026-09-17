"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { ChevronRight, AlertCircle } from "lucide-react";
import { safeReturnUrl } from "@/lib/auth/return-url";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState("/dashboard");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnUrl(safeReturnUrl(params.get("next")));
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);
    try {
      const res = await getApiClient().login(values);
      setAuth(res.user, res.token);
      router.push(returnUrl);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  return (
    <div
      className="flex items-start justify-center px-md py-3xl"
    >
      <Card className="bg-surface w-full max-w-md">
        <h1 className="font-display text-section-h2 text-ink leading-tight">Log in</h1>
        <p className="text-body-sm text-ink-muted mt-xs">
          Use the account associated with your artwork and orders.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md">
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
            <Input type="email" autoComplete="email" {...register("email")} invalid={!!errors.email} />
            {errors.email && <p className="text-body-sm text-danger mt-xs">{errors.email.message}</p>}
          </label>
          <div>
            <div className="flex items-center justify-between mb-xs">
              <label htmlFor="login-password" className="text-body-sm text-ink-muted">
                Password
              </label>
              <Link
                href={`/forgot-password${returnUrl !== "/dashboard" ? `?next=${encodeURIComponent(returnUrl)}` : ""}`}
                className="text-body-sm text-link hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <PasswordField autoComplete="current-password" id="login-password" invalid={!!errors.password} {...register("password")} />
            {errors.password && <p className="text-body-sm text-danger mt-xs">{errors.password.message}</p>}
          </div>
          {submitError && (
            <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-ink">{submitError}</p>
            </div>
          )}
          <Button type="submit" variant="cta" size="block" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Logging in…" : "Log in"}
          </Button>
        </form>
        <p className="text-body-sm text-ink-muted mt-md text-center">
          New here?{" "}
          <Link href={`/register?next=${encodeURIComponent(returnUrl)}`} className="text-link hover:underline">
            Create an account <ChevronRight className="inline h-3 w-3" aria-hidden />
          </Link>
        </p>
      </Card>
    </div>
  );
}
