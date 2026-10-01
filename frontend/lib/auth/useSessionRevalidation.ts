"use client";

import { useEffect } from "react";
import { create } from "zustand";
import { ApiClientError } from "@bannersin48/api-client";
import type { User } from "@bannersin48/shared";
import { getApiClient } from "@/lib/api/client";
import { useAuth } from "@/lib/stores/auth";

interface AccessNoticeState {
  message: string | null;
  set: (message: string | null) => void;
}

/** One-line notice the admin shell shows after a 403 reveals that permissions changed. */
export const useAccessNotice = create<AccessNoticeState>((set) => ({
  message: null,
  set: (message) => set({ message }),
}));

let inflight: Promise<User | null> | null = null;

/**
 * Re-reads `/auth/me` and replaces the persisted user (role, permissions,
 * rewards). A `null` answer means the token is stale or the account is no
 * longer active, so the store is cleared. Network errors keep the current
 * state. Concurrent callers share one request.
 */
export function revalidateSession(): Promise<User | null> {
  const { token, user: previous } = useAuth.getState();
  if (!token) return Promise.resolve(null);
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const fresh = await getApiClient().me();
      if (!fresh) {
        useAuth.getState().clear();
        return null;
      }
      useAuth.getState().setAuth(fresh, token);
      return fresh;
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 401) {
        useAuth.getState().clear();
        return null;
      }
      return previous;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

function samePermissions(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && [...a].sort().every((key, i) => key === [...b].sort()[i]);
}

/** Called by the API clients on `403 FORBIDDEN_PERMISSION`: refetch once, then say so if access shrank. */
export async function revalidateAfterForbidden(): Promise<void> {
  const before = useAuth.getState().user;
  if (!before) return;
  const after = await revalidateSession();
  if (!after) {
    useAccessNotice.getState().set("Your session has ended. Sign in again to continue.");
    return;
  }
  if (!samePermissions(before.permissions, after.permissions)) {
    useAccessNotice.getState().set("Your access has changed. Some sections or actions may no longer be available.");
  }
}

/** Revalidate once on mount (app shell and admin shell). */
export function useSessionRevalidation(): void {
  useEffect(() => {
    void revalidateSession();
  }, []);
}
