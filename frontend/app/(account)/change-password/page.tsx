"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { safeReturnUrl } from "@/lib/auth/return-url";
import { Card } from "@/components/ui/card";
import { PasswordField } from "@/components/ui/password-field";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

const formSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z.string().min(8, "Password must be at least 8 characters.").max(128),
    confirm: z.string().min(1, "Confirm your new password."),
  })
  .refine((data) => data.newPassword === data.confirm, { path: ["confirm"], message: "Passwords do not match." })
  .refine((data) => data.newPassword !== data.currentPassword, { path: ["newPassword"], message: "Choose a different password." });

type ChangeForm = z.infer<typeof formSchema>;

/**
 * Signed-in password change. Also the landing page for a first login with a
 * temporary password (`mustChangePassword`): the API refuses everything else
 * until this succeeds. Phase 3 moves this under /account/security.
 */
export default function ChangePasswordPage() {
  const router = useRouter();
  const auth = useAuth();
  const [next, setNext] = useState("/account");
  const [done, setDone] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    setNext(safeReturnUrl(new URLSearchParams(window.location.search).get("next")));
  }, []);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ChangeForm>({ resolver: zodResolver(formSchema) });
  const user = auth.user;
  const isStaff = Boolean(user && user.role !== "CUSTOMER");

  async function onSubmit(values: ChangeForm) {
    if (!user) return;
    setSubmitError(null);
    if (isStaff && values.newPassword.length < 12) {
      setSubmitError("Staff passwords must be at least 12 characters.");
      return;
    }
    try {
      await getApiClient().changePassword({ currentPassword: values.currentPassword, newPassword: values.newPassword });
      auth.setAuth({ ...user, mustChangePassword: false }, auth.token ?? "");
      setDone(true);
    } catch (err) {
      setSubmitError((err as Error).message);
    }
  }

  if (!user) {
    return (
      <div className="flex items-start justify-center px-md py-xl sm:py-3xl">
        <Card className="bg-surface w-full max-w-md">
          <h1 className="font-display text-section-h2 text-ink leading-tight">Log in first</h1>
          <p className="text-body-sm text-ink-muted mt-xs">You need to be signed in to change your password.</p>
          <Link href={`/login?next=${encodeURIComponent("/change-password")}`} className="inline-block mt-lg">
            <Button variant="cta">Log in</Button>
          </Link>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex items-start justify-center px-md py-xl sm:py-3xl">
        <Card className="bg-surface w-full max-w-md">
          <div role="status" className="flex items-start gap-sm p-md rounded-feature bg-info-tint">
            <CheckCircle2 className="h-5 w-5 text-link shrink-0 mt-0.5" aria-hidden />
            <p className="text-sm text-ink">Your password is updated. Other devices were signed out.</p>
          </div>
          <Button type="button" variant="cta" size="block" className="w-full mt-lg" onClick={() => router.push(next)} data-testid="change-password-continue">
            Continue
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-center px-md py-xl sm:py-3xl">
      <Card className="bg-surface w-full max-w-md">
        <h1 className="font-display text-section-h2 text-ink leading-tight">{user.mustChangePassword ? "Set your own password" : "Change password"}</h1>
        <p className="text-body-sm text-ink-muted mt-xs">
          {user.mustChangePassword
            ? "Your account was set up with a temporary password. Replace it to continue; nothing else works until you do."
            : `Signed in as ${user.email}.`}
        </p>
        <form onSubmit={handleSubmit(onSubmit)} className="mt-xl space-y-md" data-testid="change-password-form">
          <div>
            <label htmlFor="current-password" className="text-body-sm text-ink-muted block mb-xs">{user.mustChangePassword ? "Temporary password" : "Current password"}</label>
            <PasswordField autoComplete="current-password" id="current-password" invalid={!!errors.currentPassword} {...register("currentPassword")} />
            {errors.currentPassword && <p className="text-body-sm text-danger mt-xs">{errors.currentPassword.message}</p>}
          </div>
          <div>
            <label htmlFor="new-password" className="text-body-sm text-ink-muted block mb-xs">New password</label>
            <PasswordField autoComplete="new-password" id="new-password" invalid={!!errors.newPassword} {...register("newPassword")} />
            {errors.newPassword && <p className="text-body-sm text-danger mt-xs">{errors.newPassword.message}</p>}
            <p className="text-xs text-ink-muted mt-xs">{isStaff ? "At least 12 characters." : "At least 8 characters."}</p>
          </div>
          <div>
            <label htmlFor="confirm-password" className="text-body-sm text-ink-muted block mb-xs">Confirm new password</label>
            <PasswordField autoComplete="new-password" id="confirm-password" invalid={!!errors.confirm} {...register("confirm")} />
            {errors.confirm && <p className="text-body-sm text-danger mt-xs">{errors.confirm.message}</p>}
          </div>
          {submitError && (
            <div role="alert" className="flex items-start gap-sm p-md rounded-feature bg-badge-error-bg">
              <AlertCircle className="h-5 w-5 text-danger shrink-0 mt-0.5" aria-hidden />
              <p className="text-sm text-ink">{submitError}</p>
            </div>
          )}
          <Button type="submit" variant="cta" size="block" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : "Save new password"}
          </Button>
          {!user.mustChangePassword && (
            <p className="text-body-sm text-ink-muted text-center">
              <Link href={next} className="text-link hover:underline">Cancel</Link>
            </p>
          )}
        </form>
      </Card>
    </div>
  );
}
