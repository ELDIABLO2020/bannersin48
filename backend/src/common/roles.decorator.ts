import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Route decorator listing the role kinds allowed (no implicit ADMIN pass):
 *   @Roles("STAFF", "ADMIN")
 *
 * Not for `/admin/*` routes, which are gated by @RequirePermissions only
 * (permissions-coverage.spec.ts fails the build otherwise).
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
