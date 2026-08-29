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
import { Button } from "@/components/ui/button";
import { ChevronRight, AlertCircle } from "lucide-react";
import { safeReturnUrl } from "@/lib/auth/return-url";

const registerSchema = z.object({
  fullName: z.string().min(2, "Name is required."),
  email: z.string().email("Enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type RegisterInput = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [returnUrl, setReturnUrl] = useState("/dashboard");

  const { register, handleSubmit, setValue, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setReturnUrl(safeReturnUrl(params.get("next")));
    const email = params.get("email");
    if (email) setValue("email", email);
  }, [setValue]);

  async function onSubmit(values: RegisterInput) {
    setSubmitError(null);
    try {
      const res = await getApiClient().register(values);
      setAuth(res.user, res.token);
      router.push(returnUrl);
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
        <h1 className="font-display text-section-h2 text-ink leading-tight">Create an account</h1>
        <p className="text-body-sm text-ink-muted mt-xs">
          We require an account to place an order. Saved artwork &amp; reorders included.
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md">
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Full name</span>
            <Input autoComplete="name" {...register("fullName")} invalid={!!errors.fullName} />
            {errors.fullName && <p className="text-body-sm text-danger mt-xs">{errors.fullName.message}</p>}
          </label>
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
            <Input type="email" autoComplete="email" {...register("email")} invalid={!!errors.email} />
            {errors.email && <p className="text-body-sm text-danger mt-xs">{errors.email.message}</p>}
          </label>
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Password</span>
            <Input type="password" autoComplete="new-password" {...register("password")} invalid={!!errors.password} />
            {errors.password && <p className="text-body-sm text-danger mt-xs">{errors.password.message}</p>}
          </label>
          {submitError && (
            <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-ink">{submitError}</p>
            </div>
          )}
          <Button type="submit" variant="cta" size="block" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Creating account…" : "Create account"}
          </Button>
        </form>
        <p className="text-body-sm text-ink-muted mt-md text-center">
          Already have one?{" "}
          <Link href={`/login?next=${encodeURIComponent(returnUrl)}`} className="text-link hover:underline">
            Log in <ChevronRight className="inline h-3 w-3" aria-hidden />
          </Link>
        </p>
      </Card>
    </div>
  );
}
