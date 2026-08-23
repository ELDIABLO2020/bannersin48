import { SetMetadata } from "@nestjs/common";

export const ROLES_KEY = "roles";

/**
 * Route decorator listing the roles allowed (ADMIN always passes):
 *   @Roles("STAFF", "ADMIN")
 */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
