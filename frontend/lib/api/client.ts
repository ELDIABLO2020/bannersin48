"use client";

import { createApiClient, ApiClient } from "@bannersin48/api-client";

/**
 * Singleton API client. In dev with the MSW mock worker started, all requests
 * are intercepted. In production they hit NEXT_PUBLIC_API_BASE_URL.
 */
let _client: ApiClient | null = null;

/** Shared by both clients: a permission 403 means our cached user is stale, so refetch it once. */
export function onForbidden(): void {
  // Dynamic import keeps lib/auth → lib/api → lib/auth from forming a load-time cycle.
  void import("@/lib/auth/useSessionRevalidation").then((m) => m.revalidateAfterForbidden());
}

export function getApiClient(): ApiClient {
  if (_client) return _client;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
  _client = createApiClient({
    baseUrl,
    getToken: () => {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem("bi48.token");
    },
    onForbidden,
  });
  return _client;
}
