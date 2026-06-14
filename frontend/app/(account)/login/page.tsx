"use client";

import { useState } from "react";
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

const loginSchema = z.object({
  email: z.string().email("Enter a valid email."),
  password: z.string().min(1, "Password is required."),
});

type LoginInput = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginInput) {
    setSubmitError(null);
    try {
      const res = await getApiClient().login(values);
      setAuth(res.user, res.token);
      router.push("/dashboard");
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
        <h1 className="font-display text-section-h2 text-ink leading-tight">Log in</h1>
        <p className="text-body-sm text-ink-muted mt-xs">
          Demo account: <code className="text-ink">demo@bannersin48.com</code> / <code className="text-ink">demo1234</code>
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md">
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Email</span>
            <Input type="email" autoComplete="email" {...register("email")} invalid={!!errors.email} />
            {errors.email && <p className="text-body-sm text-danger mt-xs">{errors.email.message}</p>}
          </label>
          <label className="block">
            <span className="text-body-sm text-ink-muted block mb-xs">Password</span>
            <Input type="password" autoComplete="current-password" {...register("password")} invalid={!!errors.password} />
            {errors.password && <p className="text-body-sm text-danger mt-xs">{errors.password.message}</p>}
          </label>
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
          <Link href="/register" className="text-link hover:underline">
            Create an account <ChevronRight className="inline h-3 w-3" aria-hidden />
          </Link>
        </p>
      </Card>
    </div>
  );
}
