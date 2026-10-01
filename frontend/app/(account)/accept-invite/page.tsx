"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { hasAdminAccess } from "@/lib/auth/useCan";
import { Card } from "@/components/ui/card";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const formSchema = z
  .object({
    password: z.string().min(12, "Password must be at least 12 characters.").max(128),
    confirm: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirm, { path: ["confirm"], message: "Passwords do not match." });

type InviteForm = z.infer<typeof formSchema>;

/** Staff invite acceptance (plan §6.3): same shell as reset-password; sets the password and signs in. */
export default function AcceptInvitePage() {
  const router = useRouter();
  const setAuth = useAuth((s) => s.setAuth);
  const [token, setToken] = useState<string | null>(null);
  const [tokenChecked, setTokenChecked] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
    setTokenChecked(true);
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<InviteForm>({ resolver: zodResolver(formSchema) });

  async function onSubmit(values: InviteForm) {
    if (!token) return;
    setSubmitError(null);
    try {
      const res = await getApiClient().acceptInvite({ token, password: values.password });
      setAuth(res.user, res.token);
      router.push(hasAdminAccess(res.user) ? "/admin" : "/account");
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  if (!tokenChecked) return null;

  if (!token) {
    return (
      <div className="flex items-start justify-center px-md py-xl sm:py-3xl">
        <Card className="bg-surface w-full max-w-md">
          <h1 className="font-display text-section-h2 text-ink leading-tight">Invite link missing</h1>
          <p className="text-body-sm text-ink-muted mt-xs">This page needs the token from your invite. Ask the person who invited you to resend it.</p>
          <div className="mt-lg">
            <Link href="/login" className="text-body-sm text-link hover:underline">Already have an account? Log in</Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center px-md py-xl sm:py-3xl">
      <Card className="bg-surface w-full max-w-md">
        <h1 className="font-display text-section-h2 text-ink leading-tight">Welcome to the team</h1>
        <p className="text-body-sm text-ink-muted mt-xs">Choose the password for your staff account. You will be signed in straight away.</p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md">
          <div>
            <label htmlFor="invite-password" className="text-body-sm text-ink-muted block mb-xs">Password</label>
            <PasswordField autoComplete="new-password" id="invite-password" invalid={!!errors.password} {...register("password")} />
            {errors.password && <p className="text-body-sm text-danger mt-xs">{errors.password.message}</p>}
            <p className="text-xs text-ink-muted mt-xs">At least 12 characters.</p>
          </div>
          <div>
            <label htmlFor="invite-confirm" className="text-body-sm text-ink-muted block mb-xs">Confirm password</label>
            <PasswordField autoComplete="new-password" id="invite-confirm" invalid={!!errors.confirm} {...register("confirm")} />
            {errors.confirm && <p className="text-body-sm text-danger mt-xs">{errors.confirm.message}</p>}
          </div>
          {submitError && (
            <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-ink">{submitError}</p>
            </div>
          )}
          <Button type="submit" variant="cta" size="block" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Activating…" : "Activate account"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
