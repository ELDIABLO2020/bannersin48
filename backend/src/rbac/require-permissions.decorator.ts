import { SetMetadata } from "@nestjs/common";
import type { PermissionKey } from "./permissions";

export const REQUIRE_ALL_PERMISSIONS_KEY = "rbac:require_all";
export const REQUIRE_ANY_PERMISSION_KEY = "rbac:require_any";

/**
 * Route decorator: the caller must hold every listed permission (admin's `*`
 * always passes). Handler metadata overrides class metadata, like @Roles.
 *   @RequirePermissions("orders:read")
 */
export const RequirePermissions = (...keys: [PermissionKey, ...PermissionKey[]]) =>
  SetMetadata(REQUIRE_ALL_PERMISSIONS_KEY, keys);

/**
 * Route decorator: the caller must hold at least one of the listed permissions.
 * Use it where the exact key depends on the request body, then narrow with
 * `assertCan()` in the handler (status transitions, field-level pricing edits).
 */
export const RequireAnyPermission = (...keys: [PermissionKey, ...PermissionKey[]]) =>
  SetMetadata(REQUIRE_ANY_PERMISSION_KEY, keys);
