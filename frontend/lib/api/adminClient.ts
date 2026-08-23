"use client";

import { AdminApiClient } from "@bannersin48/api-client";

let _admin: AdminApiClient | null = null;

export function getAdminApiClient(): AdminApiClient {
  if (_admin) return _admin;
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:3001";
  _admin = new AdminApiClient({
    baseUrl,
    getToken: () => {
      if (typeof window === "undefined") return null;
      return window.localStorage.getItem("bi48.token");
    },
  });
  return _admin;
}
