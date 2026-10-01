"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { emailChangeSchema, type EmailChangeInput } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { EMAIL_TRANSPORT_CONFIGURED } from "@/lib/config/features";
import { SessionList } from "@/components/account/SessionList";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordField } from "@/components/ui/password-field";

export default function AccountSecurityPage() {
  const auth = useAuth();
  const profile = useQuery({ queryKey: ["account", "profile"], queryFn: () => getApiClient().getProfile() });
  const me = profile.data ?? auth.user;

  return (
    <div className="space-y-lg">
      <Card className="bg-surface">
        <h2 className="text-heading-h4 text-ink">Password</h2>
        <p className="mt-xs text-body-sm text-ink-muted">Changing your password signs out every other device.</p>
        <Link href={`/change-password?next=${encodeURIComponent("/account/security")}`} className="mt-md inline-block">
          <Button variant="secondary" size="md">Change password</Button>
        </Link>
      </Card>

      <Card className="bg-surface">
        <h2 className="text-heading-h4 text-ink">Email</h2>
        <p className="mt-xs flex flex-wrap items-center gap-xs text-body-sm text-ink">
          <span className="break-words">{me?.email}</span>
          {me?.emailVerifiedAt ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Not verified</Badge>}
        </p>
        {me?.pendingEmail && (
          <p role="status" className="mt-sm rounded-feature bg-info-tint p-md text-body-sm text-ink">
            We sent a confirmation link to <strong>{me.pendingEmail}</strong>. Your email changes once you open it.
          </p>
        )}
        {EMAIL_TRANSPORT_CONFIGURED ? (
          <EmailChangeForm verified={Boolean(me?.emailVerifiedAt)} />
        ) : (
          <p className="mt-md text-body-sm text-ink-muted" data-testid="email-change-unavailable">
            To change the email on this account, contact <a href="mailto:support@bannersin48.com" className="text-link">support@bannersin48.com</a> from your current address.
          </p>
        )}
      </Card>

      <section>
        <h2 className="mb-md text-heading-h4 text-ink">Signed-in devices</h2>
        <SessionList />
      </section>
    </div>
  );
}

/**
 * Hidden until an email transport exists (EMAIL_TRANSPORT_CONFIGURED): the
 * API is live (`POST /users/me/email` → link to the new address →
 * `POST /auth/confirm-email-change`), the mail just never leaves the log.
 */
function EmailChangeForm({ verified }: { verified: boolean }) {
  const qc = useQueryClient();
  const auth = useAuth();
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<EmailChangeInput>({ resolver: zodResolver(emailChangeSchema) });

  const request = useMutation({
    mutationFn: (input: EmailChangeInput) => getApiClient().requestEmailChange(input),
    onSuccess: async (res) => {
      setMessage({ tone: "ok", text: `Check ${res.pendingEmail} for a confirmation link. It expires in an hour.` });
      reset();
      await qc.invalidateQueries({ queryKey: ["account", "profile"] });
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });
  const resend = useMutation({
    mutationFn: () => getApiClient().resendVerification(),
    onSuccess: () => setMessage({ tone: "ok", text: `Verification link sent to ${auth.user?.email}.` }),
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });

  return (
    <div className="mt-md space-y-md">
      {!verified && (
        <Button type="button" variant="secondary" size="sm" disabled={resend.isPending} onClick={() => resend.mutate()}>
          Send verification email
        </Button>
      )}
      <form onSubmit={handleSubmit((values) => { setMessage(null); request.mutate(values); })} className="space-y-md max-w-md" data-testid="email-change-form">
        <label className="block">
          <span className="mb-xs block text-body-sm text-ink-muted">New email</span>
          <Input type="email" autoComplete="email" invalid={!!errors.newEmail} {...register("newEmail")} />
          {errors.newEmail && <p className="mt-xs text-body-sm text-danger">{errors.newEmail.message}</p>}
        </label>
        <div>
          <label htmlFor="email-change-password" className="mb-xs block text-body-sm text-ink-muted">Current password</label>
          <PasswordField id="email-change-password" autoComplete="current-password" invalid={!!errors.currentPassword} {...register("currentPassword")} />
          {errors.currentPassword && <p className="mt-xs text-body-sm text-danger">{errors.currentPassword.message}</p>}
        </div>
        {message && (
          <p role={message.tone === "ok" ? "status" : "alert"} className={`rounded-feature p-md text-body-sm ${message.tone === "ok" ? "bg-info-tint text-ink" : "bg-badge-error-bg text-danger"}`}>
            {message.text}
          </p>
        )}
        <Button type="submit" variant="cta" size="md" disabled={request.isPending}>
          {request.isPending ? "Sending…" : "Change email"}
        </Button>
      </form>
    </div>
  );
}
