"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { AccountSettingsInput } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";
import { Card } from "@/components/ui/card";

const TOGGLES: ReadonlyArray<{ key: keyof AccountSettingsInput; label: string; detail: string }> = [
  { key: "notifyOrderUpdates", label: "Order updates", detail: "Payment confirmed, in production, shipped, delivered." },
  { key: "notifyMarketing", label: "Offers and news", detail: "Occasional promotions. Never more than a couple a month." },
];

export default function AccountSettingsPage() {
  const qc = useQueryClient();
  const auth = useAuth();
  const profile = useQuery({ queryKey: ["account", "profile"], queryFn: () => getApiClient().getProfile() });
  const [error, setError] = useState<string | null>(null);
  // Optimistic: the box flips at once and reverts if the save fails.
  const [value, setValue] = useState<Required<AccountSettingsInput>>({ notifyOrderUpdates: true, notifyMarketing: false });
  const me = profile.data ?? auth.user;
  useEffect(() => {
    if (!me) return;
    setValue({ notifyOrderUpdates: me.notifyOrderUpdates ?? true, notifyMarketing: me.notifyMarketing ?? false });
  }, [me]);

  const save = useMutation({
    mutationFn: (input: AccountSettingsInput) => getApiClient().updateSettings(input),
    onSuccess: (updated) => {
      if (auth.token) auth.setAuth(updated, auth.token);
      qc.setQueryData(["account", "profile"], updated);
      setError(null);
    },
    onError: (err, input) => {
      setError((err as Error).message);
      setValue((v) => ({ ...v, ...Object.fromEntries(Object.keys(input).map((k) => [k, !input[k as keyof AccountSettingsInput]])) }));
    },
  });

  if (profile.isLoading) return <p className="text-ink-muted" role="status">Loading settings…</p>;

  return (
    <div className="space-y-lg max-w-xl">
      <Card className="bg-surface">
        <h2 className="text-heading-h4 text-ink">Email notifications</h2>
        <p className="mt-xs text-body-sm text-ink-muted">Security emails (password and email changes) are always sent.</p>
        <ul className="mt-md divide-y divide-line">
          {TOGGLES.map((toggle) => (
            <li key={toggle.key} className="flex items-start gap-md py-md">
              <input
                id={`setting-${toggle.key}`}
                type="checkbox"
                className="mt-1 h-5 w-5 accent-strong-accent"
                checked={value[toggle.key]}
                disabled={save.isPending}
                onChange={(e) => {
                  const next = e.target.checked;
                  setValue((v) => ({ ...v, [toggle.key]: next }));
                  save.mutate({ [toggle.key]: next });
                }}
              />
              <label htmlFor={`setting-${toggle.key}`} className="cursor-pointer">
                <span className="block font-bold text-body text-ink">{toggle.label}</span>
                <span className="block text-body-sm text-ink-muted">{toggle.detail}</span>
              </label>
            </li>
          ))}
        </ul>
        {error && <p role="alert" className="mt-sm text-body-sm text-danger">{error}</p>}
        <p role="status" className="mt-xs text-xs text-ink-muted">{save.isPending ? "Saving…" : save.isSuccess ? "Saved." : ""}</p>
      </Card>

      <Card className="bg-surface">
        <h2 className="text-heading-h4 text-ink">Delete account</h2>
        <p className="mt-xs text-body-sm text-ink-muted">
          Order records have to be kept for a while after delivery, so account deletion is handled by our team. Email{" "}
          <a href="mailto:support@bannersin48.com" className="text-link">support@bannersin48.com</a> from this address and we will take care of it.
        </p>
      </Card>
    </div>
  );
}
