"use client";

import type { ReactNode } from "react";
import { hasAllPermissions, hasAnyPermission, type PermissionKey, type User } from "@bannersin48/shared";
import { useAuth } from "@/lib/stores/auth";

export type CanMode = "all" | "any";

/**
 * Pure check used by `useCan`, `<Can>` and the admin shell. `effective` is the
 * wire form from `/auth/me`: `["*"]` for admin, `[]` for customers. Cosmetic
 * only — the server enforces every API call.
 */
export function canWith(
  effective: readonly string[] | null | undefined,
  perm: PermissionKey | readonly PermissionKey[],
  mode: CanMode = "all",
): boolean {
  const keys = Array.isArray(perm) ? (perm as readonly PermissionKey[]) : [perm as PermissionKey];
  if (keys.length === 0) return true;
  return mode === "any" ? hasAnyPermission(effective, keys) : hasAllPermissions(effective, keys);
}

/** Anyone holding at least one permission (or the wildcard) may enter the staff area. */
export function hasAdminAccess(user: Pick<User, "permissions"> | null | undefined): boolean {
  return Boolean(user && user.permissions.length > 0);
}

export function useCan(perm: PermissionKey | readonly PermissionKey[], mode: CanMode = "all"): boolean {
  const permissions = useAuth((s) => s.user?.permissions);
  return canWith(permissions, perm, mode);
}

/**
 * Renders children only when the signed-in user holds the permission(s):
 *   <Can perm="payments:mark_paid"><Button>Mark paid</Button></Can>
 */
export function Can({
  perm,
  mode = "all",
  fallback = null,
  children,
}: {
  perm: PermissionKey | readonly PermissionKey[];
  mode?: CanMode;
  fallback?: ReactNode;
  children: ReactNode;
}) {
  const allowed = useCan(perm, mode);
  return <>{allowed ? children : fallback}</>;
}
