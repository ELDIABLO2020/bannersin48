"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { SessionSummary } from "@bannersin48/api-client";
import { getApiClient } from "@/lib/api/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** A readable device name from the stored user agent. */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  const ua = userAgent;
  const os = /iPhone|iPad/.test(ua) ? "iPhone or iPad" : /Android/.test(ua) ? "Android" : /Macintosh/.test(ua) ? "Mac" : /Windows/.test(ua) ? "Windows" : /Linux/.test(ua) ? "Linux" : null;
  const browser = /Edg\//.test(ua) ? "Edge" : /Chrome\//.test(ua) ? "Chrome" : /Firefox\//.test(ua) ? "Firefox" : /Safari\//.test(ua) ? "Safari" : null;
  const parts = [browser, os].filter(Boolean);
  return parts.length ? parts.join(" on ") : ua.slice(0, 40);
}

function when(iso: string | null): string {
  return iso ? new Date(iso).toLocaleString() : "—";
}

/** Signed-in devices with per-row sign-out and "sign out other devices". */
export function SessionList() {
  const qc = useQueryClient();
  const sessions = useQuery({ queryKey: ["account", "sessions"], queryFn: () => getApiClient().listSessions() });
  const [confirmAll, setConfirmAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const refresh = () => qc.invalidateQueries({ queryKey: ["account", "sessions"] });
  const revokeOne = useMutation({
    mutationFn: (id: string) => getApiClient().revokeSession(id),
    onSuccess: async () => {
      setMessage("That device was signed out.");
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });
  const revokeOthers = useMutation({
    mutationFn: () => getApiClient().revokeOtherSessions(),
    onSuccess: async (res) => {
      setConfirmAll(false);
      setMessage(res.revoked === 0 ? "No other devices were signed in." : `${res.revoked} other device${res.revoked === 1 ? "" : "s"} signed out.`);
      await refresh();
    },
    onError: (err) => setMessage((err as Error).message),
  });

  if (sessions.isLoading) return <p className="text-ink-muted" role="status">Loading devices…</p>;
  if (sessions.isError || !sessions.data) return <p className="text-danger" role="alert">{(sessions.error as Error | undefined)?.message ?? "Devices are unavailable right now."}</p>;
  const rows: SessionSummary[] = sessions.data;
  const others = rows.filter((s) => !s.current).length;

  return (
    <div>
      <ul className="divide-y divide-line rounded-card border border-line bg-surface" data-testid="session-list">
        {rows.map((session) => (
          <li key={session.id} className="flex flex-wrap items-center justify-between gap-md p-md" data-testid={`session-${session.current ? "current" : "other"}`}>
            <div className="min-w-0">
              <p className="flex flex-wrap items-center gap-xs font-bold text-body text-ink">
                {describeUserAgent(session.userAgent)}
                {session.current && <Badge variant="info">This device</Badge>}
              </p>
              <p className="mt-xs text-body-sm text-ink-muted">
                Last active {when(session.lastUsedAt ?? session.createdAt)}
                {session.ip ? ` · ${session.ip}` : ""}
              </p>
            </div>
            {!session.current && (
              <Button type="button" variant="secondary" size="sm" disabled={revokeOne.isPending} onClick={() => revokeOne.mutate(session.id)}>
                Sign out
              </Button>
            )}
          </li>
        ))}
      </ul>
      <div className="mt-md flex flex-wrap items-center gap-md">
        <Button type="button" variant="secondary" size="md" disabled={others === 0 || revokeOthers.isPending} onClick={() => setConfirmAll(true)} data-testid="revoke-others">
          Sign out other devices
        </Button>
        {message && <p role="status" className="text-body-sm text-ink-muted" data-testid="session-message">{message}</p>}
      </div>
      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Sign out other devices?"
        description={`${others} other device${others === 1 ? "" : "s"} will have to sign in again. This device stays signed in.`}
        confirmLabel="Sign out others"
        busy={revokeOthers.isPending}
        onConfirm={() => revokeOthers.mutate()}
      />
    </div>
  );
}
