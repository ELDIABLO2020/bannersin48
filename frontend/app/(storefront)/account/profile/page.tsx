"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileUpdateSchema, type ProfileUpdateInput } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2 } from "lucide-react";

export default function AccountProfilePage() {
  const qc = useQueryClient();
  const auth = useAuth();
  const profile = useQuery({ queryKey: ["account", "profile"], queryFn: () => getApiClient().getProfile() });
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const form = useForm<ProfileUpdateInput>({
    resolver: zodResolver(profileUpdateSchema),
    defaultValues: { firstName: "", lastName: "", phone: "" },
  });

  useEffect(() => {
    if (!profile.data) return;
    form.reset({ firstName: profile.data.firstName ?? "", lastName: profile.data.lastName ?? "", phone: profile.data.phone ?? "" });
  }, [profile.data, form]);

  const save = useMutation({
    mutationFn: (values: ProfileUpdateInput) => getApiClient().updateProfile({ ...values, phone: values.phone ?? "" }),
    onSuccess: (updated) => {
      // Keep the persisted session's name in step with what the API now holds.
      if (auth.token) auth.setAuth(updated, auth.token);
      qc.setQueryData(["account", "profile"], updated);
      setMessage({ tone: "ok", text: "Profile saved." });
    },
    onError: (err) => setMessage({ tone: "error", text: (err as Error).message }),
  });

  if (profile.isLoading) return <p className="text-ink-muted" role="status">Loading profile…</p>;

  const { register, handleSubmit, formState: { errors, isDirty } } = form;

  return (
    <Card className="bg-surface max-w-xl">
      <h2 className="text-heading-h4 text-ink">Your details</h2>
      <p className="mt-xs text-body-sm text-ink-muted">Signed in as {profile.data?.email ?? auth.user?.email}. Change your email from the Security section.</p>
      <form onSubmit={handleSubmit((values) => { setMessage(null); save.mutate(values); })} className="mt-lg space-y-md" data-testid="profile-form">
        <div className="grid grid-cols-1 gap-md sm:grid-cols-2">
          <label className="block">
            <span className="mb-xs block text-body-sm text-ink-muted">First name</span>
            <Input autoComplete="given-name" invalid={!!errors.firstName} {...register("firstName")} />
            {errors.firstName && <p className="mt-xs text-body-sm text-danger">{errors.firstName.message}</p>}
          </label>
          <label className="block">
            <span className="mb-xs block text-body-sm text-ink-muted">Last name</span>
            <Input autoComplete="family-name" invalid={!!errors.lastName} {...register("lastName")} />
            {errors.lastName && <p className="mt-xs text-body-sm text-danger">{errors.lastName.message}</p>}
          </label>
        </div>
        <label className="block">
          <span className="mb-xs block text-body-sm text-ink-muted">Phone (optional)</span>
          <Input type="tel" autoComplete="tel" invalid={!!errors.phone} {...register("phone")} />
          {errors.phone && <p className="mt-xs text-body-sm text-danger">{errors.phone.message}</p>}
          <span className="mt-xs block text-xs text-ink-muted">Only used if we need to reach you about an order.</span>
        </label>
        {message && (
          <div role={message.tone === "ok" ? "status" : "alert"} className={`flex items-start gap-sm rounded-feature p-md ${message.tone === "ok" ? "bg-info-tint" : "bg-badge-error-bg"}`} data-testid="profile-message">
            {message.tone === "ok" ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-link" aria-hidden /> : <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />}
            <p className="text-sm text-ink">{message.text}</p>
          </div>
        )}
        <Button type="submit" variant="cta" size="md" disabled={save.isPending || !isDirty}>
          {save.isPending ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </Card>
  );
}
