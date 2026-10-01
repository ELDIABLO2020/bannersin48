import { SetMetadata } from "@nestjs/common";

export const ALLOW_PASSWORD_CHANGE_REQUIRED_KEY = "allowPasswordChangeRequired";

/**
 * Marks a route that a user with `mustChangePassword` may still call. Every
 * other authenticated route answers `403 PASSWORD_CHANGE_REQUIRED` for them
 * until the temporary password is replaced (`POST /users/me/password`).
 */
export const AllowPasswordChangeRequired = () => SetMetadata(ALLOW_PASSWORD_CHANGE_REQUIRED_KEY, true);
